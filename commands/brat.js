const config = require('../config');
const { fetchBratImage } = require('../lib/brat');

const USAGE = 'Contoh penggunaan: /brat Halo Dunia';

function extractText(args, messageText) {
  if (Array.isArray(args) && args.length > 0) {
    return args.join(' ').trim();
  }

  if (typeof messageText === 'string') {
    return messageText.replace(/^\/brat\s*/i, '').trim();
  }

  return '';
}

async function sendReply(sock, jid, text, quoted) {
  return sock.sendMessage(jid, { text }, quoted ? { quoted } : undefined);
}

async function bratCommand(sock, message, args = []) {
  const jid = message.key?.remoteJid || message.chat || message.from;
  const messageText = message.message?.conversation || message.message?.extendedTextMessage?.text || message.text || '';
  const text = extractText(args, messageText);

  if (!jid) {
    throw new Error('JID chat tidak ditemukan.');
  }

  if (!text) {
    return sendReply(sock, jid, USAGE, message);
  }

  try {
    const { buffer } = await fetchBratImage(text);
    const sendAsSticker = Boolean(config.brat?.sendAsSticker);
    const payload = sendAsSticker
      ? { sticker: buffer }
      : { image: buffer, caption: text };

    return sock.sendMessage(jid, payload, { quoted: message });
  } catch (error) {
    return sendReply(sock, jid, error.message || 'Gagal membuat gambar Brat.', message);
  }
}

module.exports = {
  name: 'brat',
  command: ['brat'],
  description: 'Membuat gambar Brat dari teks.',
  usage: USAGE,
  execute: bratCommand,
  run: bratCommand,
};
