# 🎴 Tarot Bot Setup

## 1. Create a Discord App
1. Go to [Discord Developer Portal](https://discord.com/developers/applications).
2. Create a "New Application" (e.g., "TarotReader").
3. Go to the **Bot** tab and click **Add Bot**.
4. Enable **Message Content Intent** (required to read `!deploy-tarot`).

## 2. Get the Token
1. Click **Reset Token** to copy your Bot Token.
2. Open your `.env` file in the root of the project.
3. Add this line:
   ```bash
   DISCORD_BOT_TOKEN=your_token_here_xxxxxxx
   ```

## 3. Invite the Bot
1. Go to **OAuth2** -> **URL Generator**.
2. Select scopes: `bot`.
3. Select permissions:
   * Send Messages
   * Embed Links
   * Read Message History (to see the command)
4. Copy the URL and open it to invite the bot to your server.

## 4. Run the Bot
Run this command in your terminal:
```bash
npm run tarot
```

## 5. Usage
1. In your Discord server, type: `!deploy-tarot`
2. A message with a button "🎴 Draw Your Daily Card" will appear.
3. Users can click it once per day (UTC time).
