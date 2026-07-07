'use strict';

const { StickerError, resolveStickerInput } = require('../lib/sticker/media');
const { createSticker } = require('../lib/sticker/processor');
const { DEFAULT_AUTHOR, DEFAULT_PACKNAME } = require('../lib/sticker/metadata');

const COMMAND_PATTERN = /^\s*[./#!]?sticker(?:\s|$)/i;

function getMessageText(message) {
  const content = message?.message || {};
  return content.conversation
    || content.extendedTextMessage?.text
    || content.imageMessage?.caption
    || content.videoMessage?.caption
    || content.documentMessage?.caption
    || '';
}

function isStickerCommand(message) {
  return COMMAND_PATTERN.test(getMessageText(message));
}

async function replyText(sock, message, text) {
  return sock.sendMessage(message.key.remoteJid, { text }, { quoted: message });
}

async function handleStickerCommand(sock, message, options = {}) {
  if (!isStickerCommand(message)) return false;

  try {
    const input = await resolveStickerInput(message);
    const sticker = await createSticker(input.buffer, input, {
      packname: options.packname || process.env.STICKER_PACKNAME || DEFAULT_PACKNAME,
      author: options.author || process.env.STICKER_AUTHOR || DEFAULT_AUTHOR
    });

    await sock.sendMessage(
      message.key.remoteJid,
      { sticker, mimetype: 'image/webp' },
      { quoted: message }
    );
    return true;
  } catch (error) {
    const userMessage = error instanceof StickerError
      ? error.message
      : `Terjadi kesalahan saat membuat sticker: ${error.message}`;
    await replyText(sock, message, userMessage);
    return true;
  }
}

module.exports = {
  command: 'sticker',
  aliases: ['s'],
  isStickerCommand,
  handleStickerCommand
};
