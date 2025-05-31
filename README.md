# 📚 Telegram Scribd Downloader Bot

A powerful Node.js Telegram bot that helps users download documents from Scribd by simply sharing the document link. Built with ❤️ using `node-telegram-bot-api`, `MongoDB`, `Express`, and more.

## 🚀 Features

- 🔗 Download Scribd documents via direct link
- 📊 User stats tracking
- ⛔ Rate limiting to avoid abuse
- ✅ Channel membership enforcement
- 🌐 Multilingual support (EN/ES example included)
- 📁 MongoDB logging for analytics
- 🔁 Retry mechanism with exponential backoff
- 🧼 Input sanitization and security handling
- 📥 Inline keyboard and rich interaction
- 🧑‍💻 Admin error notifications

---

## 🛠️ Tech Stack

- **Node.js**
- **Telegram Bot API** (`node-telegram-bot-api`)
- **MongoDB** with `mongoose`
- **Axios** for HTTP requests
- **Express-rate-limit** for request limiting
- **p-queue** for task concurrency
- **dotenv**, **sanitize-html**

---

## 📦 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/scribd-telegram-bot.git
cd scribd-telegram-bot
````

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory:

```env
TELEGRAM_API_KEY=your_bot_api_token
MONGO_URI=your_mongodb_connection_string
SERVER_URL=https://your-server.com
```

### 4. Run the Bot

```bash
node bot.js
```

---

## ✅ Bot Commands

| Command | Description                 |
| ------- | --------------------------- |
| /start  | Starts the bot and shows UI |
| /help   | Lists available commands    |
| /stats  | Displays user usage stats   |

---

## 📋 Example Scribd Link Format

```
https://www.scribd.com/document/123456789/Document-Title
```

---

## 🔐 Required Channel Subscription

Users must be subscribed to:

* [@cheggnx](https://t.me/cheggnx)
* [@CheggbyTnTbot](https://t.me/CheggbyTnTbot)

If not, the bot will block further usage until joined.

---

## 💾 MongoDB Schema

```js
{
  userId: Number,
  username: String,
  action: String,
  details: Object,
  timestamp: { type: Date, default: Date.now }
}
```

---

## 🧪 Example Interaction

1. User sends `/start`
2. Bot responds with welcome message and UI
3. User submits Scribd document link
4. Bot fetches and sends PDF + confirmation message
5. Interaction is logged in MongoDB

---

## 📌 Admin Error Logging

If polling fails, the bot notifies the admin (`ADMIN_ID`) directly via Telegram.

---

## 👨‍💻 Developer

Made with ❤️ by [@spacenx1](https://t.me/spacenx1)
Instagram: [@mustaqeem\_abad](https://www.instagram.com/mustaqeem_abad/)

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

```

