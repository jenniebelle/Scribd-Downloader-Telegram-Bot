require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const sanitizeHtml = require('sanitize-html');
const { PQueue } = require('p-queue');

// Configuration
const API_KEY = process.env.TELEGRAM_API_KEY;
const MONGO_URI = process.env.MONGO_URI;
const ADMIN_ID = 2110818173;

// Initialize MongoDB
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// MongoDB Schema for user interactions
const InteractionSchema = new mongoose.Schema({
  userId: Number,
  username: String,
  action: String,
  details: Object,
  timestamp: { type: Date, default: Date.now },
});
const Interaction = mongoose.model('Interaction', InteractionSchema);

// Initialize bot
const bot = new TelegramBot(API_KEY, { polling: true });

// Rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each user to 100 requests per window
  keyGenerator: (req) => req.from.id.toString(),
});

// Request queue
const queue = new PQueue({ concurrency: 5 });

// Retry mechanism
async function withRetry(fn, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
}

// Bot API method
async function botMethod(method, data) {
  try {
    const url = `https://api.telegram.org/bot${API_KEY}/${method}`;
    const response = await withRetry(() => axios.post(url, data));
    return response.data;
  } catch (error) {
    console.error(`Error in ${method}:`, error.message);
    return null;
  }
}

// Log interaction to MongoDB
async function logInteraction(userId, username, action, details) {
  try {
    await Interaction.create({ userId, username, action, details });
  } catch (error) {
    console.error('Error logging interaction:', error);
  }
}

// Validate Scribd URL
function validateScribdUrl(url) {
  const sanitized = sanitizeHtml(url, { allowedTags: [], allowedAttributes: {} });
  return sanitized.includes('scribd.com') && /\d+/.test(sanitized);
}

// Set webhook
axios.get(`https://api.telegram.org/bot${API_KEY}/setWebhook?url=${process.env.SERVER_URL || 'https://your-server.com'}/bot`)
  .then(response => console.log('Webhook set:', response.data))
  .catch(error => console.error('Webhook error:', error));

// Handle /start command
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const name = msg.from.first_name;
  const userId = msg.from.id;
  const username = `@${msg.from.username || 'unknown'}`;

  await logInteraction(userId, username, 'start', { command: '/start' });

  await bot.sendMessage(chatId, `📚 Welcome ${name} to Scribd Downloader bot! 📖\n\nSend a Scribd document link to download it. Use /help for more options.`, {
    reply_to_message_id: msg.message_id,
    disable_web_page_preview: true,
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Developer 💚', url: 'https://t.me/spacenx1' }],
        [{ text: 'How to Use 📘', url: 'https://t.me/cheggnx/58' }],
        [{ text: 'Support 🛠️', url: 'https://t.me/spacenx1' }],
      ],
    },
  });
});

// Handle /help command
bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const username = `@${msg.from.username || 'unknown'}`;

  await logInteraction(userId, username, 'help', { command: '/help' });

  await bot.sendMessage(chatId, 'Available commands:\n/start - Start the bot\n/help - Show this help message\n/stats - View your usage stats', {
    reply_to_message_id: msg.message_id,
  });
});

// Handle /stats command
bot.onText(/\/stats/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const username = `@${msg.from.username || 'unknown'}`;

  const stats = await Interaction.countDocuments({ userId });
  await logInteraction(userId, username, 'stats', { command: '/stats', count: stats });

  await bot.sendMessage(chatId, `📊 Your stats:\nTotal interactions: ${stats}`, {
    reply_to_message_id: msg.message_id,
  });
});

// Handle messages
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const fromId = msg.from.id;
  const user = `@${msg.from.username || 'unknown'}`;
  const name = msg.from.first_name;
  const text = msg.text || '';
  const messageId = msg.message_id;

  // Apply rate limiting
  limiter({ from: { id: fromId } }, {}, (err) => {
    if (err) {
      bot.sendMessage(chatId, '⛔ Too many requests. Please try again later.', { reply_to_message_id: messageId });
      return;
    }
  });

  // Check channel subscription
  const joinStatus1 = (await botMethod('getChatMember', { chat_id: '@cheggnx', user_id: fromId }))?.result?.status;
  const joinStatus2 = (await botMethod('getChatMember', { chat_id: '@CheggbyTnTbot', user_id: fromId }))?.result?.status;

  if ((msg.new_chat_member?.id || msg.left_chat_member?.id) || (msg && ['left', 'kicked'].includes(joinStatus1) || ['left', 'kicked'].includes(joinStatus2))) {
    await bot.deleteMessage(chatId, messageId);
    await bot.sendMessage(fromId, `Welcome ${name} 🔓 🔰 | You must subscribe to the channels to use the bot for free.`, {
      reply_to_message_id: chatId,
      reply_markup: {
        inline_keyboard: [
          [{ text: '• Join Channel 1 - ', url: 'https://t.me/cheggnx' }],
          [{ text: '• Join Channel 2 - ', url: 'https://t.me/CheggbyTnTbot' }],
        ],
      },
    });
    return;
  }

  // Handle Scribd links
  if (validateScribdUrl(text)) {
    await queue.add(async () => {
      const linkParts = text.split(' ').find(part => part.includes('scribd.com'));
      const matches = linkParts.match(/\d+/g);
      if (!matches || !matches[0]) {
        await bot.sendMessage(chatId, '❌ Invalid Scribd URL. Please provide a valid link.', { reply_to_message_id: messageId });
        return;
      }

      const documentId = matches[0];
      const aliao = encodeURI(`http://www.scribd.com/document_downloads/${documentId}?extension=pdf&from=embed&source=embed`);
      const scrii = `https://www.scribd.com/embeds/${documentId}/content`;

      await logInteraction(fromId, user, 'scribd_download', { documentId, url: text });

      // Send document
      await bot.sendDocument(chatId, aliao, {
        caption: 'Made With ❤ By @spacenx1',
        reply_to_message_id: messageId,
        reply_markup: {
          inline_keyboard: [
            [{ text: ' The Developer •', url: 't.me/spacenx1' }],
          ],
        },
      });

      // Send message with document link
      await bot.sendMessage(chatId, `📚 Welcome ${name} to Scribd Downloader bot\n👁‍🗨: ${user}\nYour Document ✅: <a href='${scrii}'>Click Here</a>\n\nMade With ❤ By @spacenx1\n\nHello ${user}! 👋\n\nThank you for your support. Please follow us on Instagram to stay updated: https://www.instagram.com/mustaqeem_abad/.`, {
        reply_to_message_id: messageId,
        disable_web_page_preview: true,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Download Document ✅', url: scrii }],
          ],
        },
      });

      // Log to specific chat
      await bot.sendMessage(-1001636291714, `User Name: ${user}\n\nLink: ${text}`);
    });
  }
});

// Handle callback queries
bot.on('callback_query', async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  const data = callbackQuery.data;
  const userId = callbackQuery.from.id;
  const username = `@${callbackQuery.from.username || 'unknown'}`;

  await logInteraction(userId, username, 'callback_query', { data });
  await bot.answerCallbackQuery(callbackQuery.id);
});

// Error handling
bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
  bot.sendMessage(ADMIN_ID, `⚠️ Polling error: ${error.message}`);
});

// Multilingual support (example)
const messages = {
  en: {
    welcome: '📚 Welcome {name} to Scribd Downloader bot! 📖\n\nSend a Scribd document link to download it.',
    invalidUrl: '❌ Invalid Scribd URL. Please provide a valid link.',
  },
  es: {
    welcome: '📚 ¡Bienvenido {name} al bot de descarga de Scribd! 📖\n\nEnvía un enlace de documento de Scribd para descargarlo.',
    invalidUrl: '❌ URL de Scribd no válida. Por favor, proporciona un enlace válido.',
  },
};
