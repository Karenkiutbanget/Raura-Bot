'use strict';

const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { fromBuffer } = require('file-type');

const SUPPORTED_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const SUPPORTED_VIDEO_MIMES = new Set(['video/mp4', 'video/webm', 'image/gif']);

class StickerError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'StickerError';
    this.code = code;
  }
}

function unwrapMessage(message) {
  if (!message) return null;
  if (message.ephemeralMessage) return unwrapMessage(message.ephemeralMessage.message);
  if (message.viewOnceMessage) return unwrapMessage(message.viewOnceMessage.message);
  if (message.viewOnceMessageV2) return unwrapMessage(message.viewOnceMessageV2.message);
  if (message.documentWithCaptionMessage) return unwrapMessage(message.documentWithCaptionMessage.message);
  return message;
}

function getQuotedMessage(message) {
  const unwrapped = unwrapMessage(message);
  const contextInfo = unwrapped?.extendedTextMessage?.contextInfo
    || unwrapped?.imageMessage?.contextInfo
    || unwrapped?.videoMessage?.contextInfo
    || unwrapped?.documentMessage?.contextInfo;
  return unwrapMessage(contextInfo?.quotedMessage);
}

function getMediaMessage(message) {
  const unwrapped = unwrapMessage(message);
  if (!unwrapped) return null;

  if (unwrapped.imageMessage) return { type: 'image', message: unwrapped.imageMessage, baileysType: 'image' };
  if (unwrapped.videoMessage) return { type: 'video', message: unwrapped.videoMessage, baileysType: 'video' };
  if (unwrapped.documentMessage) {
    const mime = unwrapped.documentMessage.mimetype || '';
    if (mime.startsWith('image/')) return { type: 'image', message: unwrapped.documentMessage, baileysType: 'document' };
    if (mime.startsWith('video/')) return { type: 'video', message: unwrapped.documentMessage, baileysType: 'document' };
  }
  return null;
}

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function downloadMediaBuffer(media) {
  const stream = await downloadContentFromMessage(media.message, media.baileysType);
  return streamToBuffer(stream);
}

async function resolveStickerInput(baileysMessage) {
  const direct = getMediaMessage(baileysMessage.message);
  const quoted = getMediaMessage(getQuotedMessage(baileysMessage.message));
  const media = direct || quoted;
  if (!media) {
    throw new StickerError('NO_MEDIA', 'Kirim foto/video/GIF dengan caption /sticker atau reply media dengan /sticker.');
  }

  const buffer = await downloadMediaBuffer(media);
  if (!buffer.length) throw new StickerError('EMPTY_MEDIA', 'Media tidak berhasil diunduh. Coba kirim ulang medianya.');

  const detected = await fromBuffer(buffer);
  const mimetype = media.message.mimetype || detected?.mime || '';
  const isGif = mimetype === 'image/gif' || detected?.mime === 'image/gif';
  const kind = media.type === 'video' || isGif ? 'video' : 'image';

  if (kind === 'image' && !SUPPORTED_IMAGE_MIMES.has(mimetype)) {
    throw new StickerError('UNSUPPORTED_FORMAT', `Format gambar ${mimetype || 'tidak dikenal'} belum didukung.`);
  }
  if (kind === 'video' && !SUPPORTED_VIDEO_MIMES.has(mimetype)) {
    throw new StickerError('UNSUPPORTED_FORMAT', `Format video/GIF ${mimetype || 'tidak dikenal'} belum didukung.`);
  }

  return {
    buffer,
    kind,
    mimetype,
    seconds: Number(media.message.seconds || 0),
    isGif
  };
}

module.exports = {
  StickerError,
  resolveStickerInput
};
