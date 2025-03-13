import { WebhookEmbedBuilder, WebhookRequestBuilder } from "./webhook.mjs"
import { SSMClient, GetParametersByPathCommand, PutParameterCommand } from "@aws-sdk/client-ssm";

const ssmClient = new SSMClient({ region: process.env.AWS_REGION });

async function getParameters(path) {
    const command = new GetParametersByPathCommand({ Path: path, Recursive: false, WithDecryption: true });
    const response = await ssmClient.send(command);
    return response.Parameters.reduce(
        (result, param) => {
            const key = param.Name.split("/").at(-1)
            result[key] = param.Value
            return result
        },
        {}
    )
}

async function updateParameter(name, value) {
    const command = new PutParameterCommand({
        Name: name,
        Value: value.toString(),
        Overwrite: true,
    })
    return await ssmClient.send(command);
}

const DISCORD_WEBHOOK_URL = process.env.DISCORD_HOOK_URL
const STEAM_APP_ID = process.env.STEAM_APP_ID
const PARAMETER_STORE_SCOPE = process.env.PARAMETER_STORE_SCOPE

if (!DISCORD_WEBHOOK_URL || !STEAM_APP_ID || !PARAMETER_STORE_SCOPE)
    throw new Error(`One or more environment variables is missing/invalid: DISCORD_WEBHOOK_URL | STEAM_APP_ID | PARAMETER_STORE_SCOPE`)

// https://partner.steamgames.com/doc/store/getreviews
async function getSteamReviews(cursor, timestamp, filter) {
    const res = await fetch(`http://store.steampowered.com/appreviews/${STEAM_APP_ID}?json=1&filter=${filter}&language=all&review_type=all&purchase_type=all&num_per_page=100&cursor=${cursor}`)
    const body = await res.json()

    let highestTimstamp = timestamp

    if (!body.reviews?.length)
        return { cursor: null, highestTimstamp }

    // body.reviews[0].timestamp_created
    for (const review of body.reviews) {
        if (review.timestamp_updated <= timestamp)
            continue

        if (filter == "recent" && review.timestamp_updated > review.timestamp_created)
            continue

        if (filter == "updated" && review.timestamp_updated == review.timestamp_created)
            continue

        if (highestTimstamp < review.timestamp_updated)
            highestTimstamp = review.timestamp_updated

        await sendWebhookRequest({
            lang: review.language,
            upvoted: review.voted_up,
            content: review.review,
            timestamp: filter == "recent" ? review.timestamp_created : review.timestamp_updated,
            author: review.author.steamid,
            filter,
            link: `http://steamcommunity.com/profiles/${review.author.steamid}/recommended/${STEAM_APP_ID}/`
        })
    }

    return { cursor: body.cursor, highestTimstamp }
}

async function sendWebhookRequest(review) {
    const content = `<${review.link}>\n\`\`\`${review.content}\`\`\``
    const avatar = `https://store.akamai.steamstatic.com/public/shared/images/userreviews/${review.upvoted ? "icon_thumbsUp_v6" : "icon_thumbsDown_v6"}.png`

    let username = review.author

    if (review.lang != "english")
        username += ` (${review.lang})`

    if (review.filter == "updated")
        username += " (updated)"

    const webhookRequest = new WebhookRequestBuilder()
        .Content(content)
        .AvatarUrl(avatar)
        .Username(username)
        .AddEmbed(new WebhookEmbedBuilder().Footer(`timestamp: ${review.timestamp}`).Build())
        .Build()

    const response = await fetch(
        DISCORD_WEBHOOK_URL,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(webhookRequest),
        }
    )

    if (response.status != 204)
        console.error(`Failed sending webhook! Status code: ${response.status}`)
}

export const handler = async (event) => {
    const data = await getParameters(PARAMETER_STORE_SCOPE)
    const timestamp = Number(data.timestamp)

    if (data.timestamp == null || isNaN(timestamp))
        throw new Error(`Invalid timestamp from parameter store: ${data.timestamp}`)

    let highestTimstamp = timestamp

    let cursor = "*"
    while (cursor) {
        const res = await getSteamReviews(cursor, timestamp, "recent")
        cursor = res.cursor

        if (highestTimstamp < res.highestTimstamp)
            highestTimstamp = res.highestTimstamp
    }

    cursor = "*"
    while (cursor) {
        const res = await getSteamReviews(cursor, timestamp, "updated")
        cursor = res.cursor

        if (highestTimstamp < res.highestTimstamp)
            highestTimstamp = res.highestTimstamp
    }

    if (highestTimstamp > timestamp)
        await updateParameter(PARAMETER_STORE_SCOPE + "timestamp", highestTimstamp)
}