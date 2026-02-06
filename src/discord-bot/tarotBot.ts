import {
    Client,
    GatewayIntentBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    Interaction,
    TextChannel
} from 'discord.js';
// @ts-ignore
import { deck as TAROT_DECK } from './card.js';
import dotenv from 'dotenv';
import cron from 'node-cron';

// Load env vars
dotenv.config();

// Configuration
const TOKEN = process.env.DISCORD_BOT_TOKEN;

if (!TOKEN) {
    console.error("❌ Error: DISCORD_BOT_TOKEN is missing in .env file.");
    process.exit(1);
}

// Memory Storage
// Key: UserId, Value: Date String (YYYY-MM-DD)
const lastDraws = new Map<string, string>();

// Store the Target Channel ID for daily posts
let dailyChannelId: string | null = null;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// Helper to send the Daily Message
async function sendDailyTarotMessage(channelId: string) {
    const channel = client.channels.cache.get(channelId) as TextChannel;
    if (!channel) {
        console.error(`❌ Could not find channel ${channelId}`);
        return;
    }

    const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('draw_daily_card')
                .setLabel('🎴 Draw Your Daily Card')
                .setStyle(ButtonStyle.Primary)
        );

    await channel.send({
        content: "🌅 **Good Morning!** (Thailand Time)\nYour destiny awaits. Click below to reveal your card for today.\n*(Resets daily at 00:00 UTC)*",
        components: [row],
    });
    console.log("✅ Sent daily tarot message to channel " + channelId);
}

client.once('ready', () => {
    console.log(`🔮 Tarot Bot is online as ${client.user?.tag}`);

    // Schedule: 07:00:05 AM Thailand Time = 00:00:05 UTC
    // Cron pattern: Second(5) Minute(0) Hour(0) * * *
    cron.schedule('5 0 0 * * *', () => {
        if (dailyChannelId) {
            console.log("⏰ Triggering Daily Tarot (Scheduled)");
            sendDailyTarotMessage(dailyChannelId);
        } else {
            console.log("⚠️ Scheduled time reached, but no Daily Channel set! Run !set-daily-channel first.");
        }
    }, {
        timezone: "UTC"
    });
});

// Command Handler
client.on('messageCreate', async (message) => {
    // 1. Set the current channel as the "Daily" channel
    if (message.content === '!set-daily-channel') {
        if (!message.member?.permissions.has("Administrator")) return;

        dailyChannelId = message.channel.id;
        await message.reply("✅ **Daily Channel Set!**\nI will post the Tarot button here every day at **07:00:05 AM (Thailand Time)**.");
    }

    // 2. Test the message immediately
    if (message.content === '!test-daily') {
        if (!message.member?.permissions.has("Administrator")) return;

        await message.reply("🧪 **Testing Daily Message:**");
        await sendDailyTarotMessage(message.channel.id);
    }

    // 3. Manual deploy (Legacy)
    if (message.content === '!deploy-tarot') {
        if (!message.member?.permissions.has("Administrator")) return;
        await sendDailyTarotMessage(message.channel.id);
    }
});

// Handle Button Clicks
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'draw_daily_card') {
        try {
            // 1. Defer the reply IMMEDIATELY.
            // It shows "Bot is thinking..." to everyone.
            await interaction.deferReply(); // NO FLAGS = Public

            const userId = interaction.user.id;
            const today = new Date().toISOString().split('T')[0]; // UTC Date (YYYY-MM-DD)

            // 2. Check Limit
            if (lastDraws.get(userId) === today) {
                await interaction.editReply({
                    content: "⏳ **You have already drawn a card today!**\nThe stars will align again tomorrow. Come back then.",
                });
                return;
            }

            // 3. Pick Random Card
            const randomCard = TAROT_DECK[Math.floor(Math.random() * TAROT_DECK.length)];

            // 4. Save State
            lastDraws.set(userId, today);

            // 5. Send Result
            await interaction.editReply({
                content: `🔮 **Your Card: ${randomCard.name}**\n\`\`\`\n${randomCard.card}\n\`\`\``,
            });

        } catch (error) {
            console.error("Interaction Error:", error);
        }
    }
});

client.login(TOKEN);
