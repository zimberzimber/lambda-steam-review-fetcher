
// Classes used for easy webhook request construction
// https://discord.com/developers/docs/resources/webhook#execute-webhook

// Fun Fact!
// - Webhooks don't accept titles longer than 256 characters!
// - Description only accepts up to 256*16 (4096)!

// "Funner" Fact!
// Discord doesn't mention that anywhere! (Or its hidden so far up someones ass good luck finding it)
const MAX_EMBED_TITLE_LENGTH = 256
const MAX_EMBED_DESCRIPTION_LENGTH = 4096
const MAX_CONTENT_LENGTH = 2000

class WebhookEmbedBuilder {
    title = undefined
    description = undefined
    color = undefined
    footer = undefined
    timestamp = undefined

    _fields = []

    AddField(name, value, isInline) {
        this._fields.push({ name, value, isInline })
        return this
    }

    Footer(text) {
        this.footer = text
        return this
    }

    Build() {
        const result = {
            title: this.title ? this.title.substring(0, MAX_EMBED_TITLE_LENGTH - 1) : "",
            description: this.description ? this.description.substring(0, MAX_EMBED_DESCRIPTION_LENGTH - 1) : ""
        }

        if (typeof (this.color) == "number")
            result.color = Math.floor(this.color)

        if (this.timestamp)
            result.timestamp = this.timestamp

        if (this.footer)
            result.footer = { text: this.footer }

        if (this._fields.length > 0)
            result.fields = this._fields

        return result
    }
}

class WebhookRequestBuilder {
    username = undefined
    avatar_url = undefined
    content = undefined
    token = undefined
    _embeds = []

    Username(username) {
        this.username = username
        return this
    }

    AvatarUrl(avatar_url) {
        this.avatar_url = avatar_url
        return this
    }

    Content(content) {
        if (content.length <= MAX_CONTENT_LENGTH) {
            this.content = content
        } else {
            this.content = content.substring(0, MAX_CONTENT_LENGTH - 7) + "..."
            const blockCount = (this.content.match(/```/g) || []).length
            if (blockCount % 2 != 0)
                this.content += "```"
        }

        return this
    }

    AddEmbed(embed) {
        this._embeds.push(embed)
        return this
    }

    Build() {
        const result = {
            avatar_url: this.avatar_url,
            username: this.username,
            content: this.content,
            allowed_mentions: { parse: [] }
        }

        if (this._embeds.length > 0)
            result.embeds = this._embeds

        return result
    }
}

export { WebhookEmbedBuilder, WebhookRequestBuilder }