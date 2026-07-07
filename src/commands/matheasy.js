const xpDatabase = require('../utils/xpDatabase');
const { MathEasySession } = require('../games/mathEasySession');

const sessions = new Map();

function getMessageText(message) {
  const content = message.message || {};
  return (
    content.conversation ||
    content.extendedTextMessage?.text ||
    content.imageMessage?.caption ||
    content.videoMessage?.caption ||
    ''
  ).trim();
}

function getChatId(message) {
  return message.key?.remoteJid;
}

function isGroupChat(chatId) {
  return chatId.endsWith('@g.us');
}

function getSenderId(message) {
  const chatId = getChatId(message);
  return message.key?.participant || message.participant || message.key?.sender || chatId;
}

async function startMathEasy(sock, message) {
  const chatId = getChatId(message);
  if (!chatId) return;

  const isGroup = isGroupChat(chatId);
  if (sessions.has(chatId)) {
    await sock.sendMessage(chatId, { text: '⚠️ Math Easy sedang berjalan di chat ini. Tunggu sampai game selesai.' });
    return;
  }

  const session = new MathEasySession({
    chatId,
    isGroup,
    sock,
    xpDatabase,
    onFinish: (finishedChatId) => sessions.delete(finishedChatId)
  });

  sessions.set(chatId, session);

  try {
    await session.start();
  } catch (error) {
    sessions.delete(chatId);
    console.error('Failed to start MathEasy:', error);
    await sock.sendMessage(chatId, { text: '❌ Gagal memulai Math Easy. Silakan coba lagi.' });
  }
}

async function handleMathEasyMessage(sock, message) {
  try {
    if (!message?.message || message.key?.fromMe) return;

    const chatId = getChatId(message);
    if (!chatId) return;

    const text = getMessageText(message);
    if (text.toLowerCase() === '/matheasy') {
      await startMathEasy(sock, message);
      return;
    }

    const session = sessions.get(chatId);
    if (!session) return;

    await session.handleAnswer({
      userId: getSenderId(message),
      text
    });
  } catch (error) {
    console.error('MathEasy handler error:', error);
    const chatId = getChatId(message);
    if (chatId) {
      await sock.sendMessage(chatId, { text: '❌ Terjadi error pada Math Easy. Jawaban diabaikan.' });
    }
  }
}

module.exports = {
  handleMathEasyMessage,
  startMathEasy,
  getMessageText,
  getSenderId,
  sessions
};
