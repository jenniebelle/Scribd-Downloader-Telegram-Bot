const { bot, handleMessage } = require('../lib/bot');

module.exports = async (req, res) => {
  if (req.method === 'POST') {
    const body = req.body;

    if (body.message) {
      await handleMessage(body.message);
    }

    res.status(200).send('OK');
  } else {
    res.status(405).send('Method Not Allowed');
  }
};
