# Steam Review Fetcher Lambda

An AWS Lambda designed to fetch Steam reviews for your app by polling the Steam web API from a given timestamp, then forward new or updated reviews to a Discord webhook.
Keeps track of the latest timestamp to avoid bringing reviews it already handled.

Designed specifically to work as an AWS Lambda with Parameter Store in mind, but it can be adapted to work with anything.
<sub>(Could've added some abstraction for the parameter store part but meh)</sub>

# Requirements

**Environment Variables:**
- `STEAM_APP_ID`: The app ID of your Steam app. i.e `https://discord.com/api/webhooks/xxxxxxxxxxxxxxxxxx/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- `DISCORD_HOOK_URL`: The URL for the Discord webhook you want the reviews to be sent to. i.e `440` for Team Fortress 2
- `PARAMETER_STORE_SCOPE`: The Parameter Store directory containing the timestamp variable. i.e `/steam-review-fetcher/`

**AWS Setup:**
- Lambda to host the code in, duh
- Parameter Store
- Permissions for the Lambda to list and PUT parameters from the path defined at `<PARAMETER_STORE_SCOPE>`

# Notes:

This code does not handle Discord Webhook rate limiting, it just fails and moves on.

Which is why I **highly recommend** setting the initial timestamp to something recent so it doesn't try pulling everything and dying in the process.
