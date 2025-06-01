// api/webhook.js
import { bot } from '../lib/bot';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    bot.processUpdate(req.body);
    res.status(200).send('Webhook received');
  } else {
    res.status(405).send('Method Not Allowed');
  }
}
