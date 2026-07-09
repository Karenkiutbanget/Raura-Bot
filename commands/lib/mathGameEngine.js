'use strict';

const DEFAULT_TOTAL_QUESTIONS = 50;
const DEFAULT_QUESTION_TIMEOUT_MS = 60_000;

function createMathGameEngine(options = {}) {
  const {
    totalQuestions = DEFAULT_TOTAL_QUESTIONS,
    questionTimeoutMs = DEFAULT_QUESTION_TIMEOUT_MS,
    xpPerCorrect = 15,
    generateQuestion,
    sendMessage,
    getChatId = (message) => message?.key?.remoteJid,
    getSenderId = (message) => message?.key?.participant || message?.key?.remoteJid,
  } = options;

  if (typeof generateQuestion !== 'function') {
    throw new TypeError('generateQuestion must be a function');
  }

  if (typeof sendMessage !== 'function') {
    throw new TypeError('sendMessage must be a function');
  }

  const sessions = new Map();

  function buildSession(message) {
    return {
      chatId: getChatId(message),
      playerId: getSenderId(message),
      currentQuestion: 0,
      correct: 0,
      wrong: 0,
      xp: 0,
      answer: null,
      timer: null,
    };
  }

  async function start(message) {
    const chatId = getChatId(message);

    if (!chatId) {
      throw new Error('Unable to determine chat id for math game');
    }

    if (sessions.has(chatId)) {
      await sendMessage(chatId, {
        text: '⚠️ Game /mathhard sedang berjalan di chat ini. Jawab soal aktif terlebih dahulu.',
      }, { quoted: message });
      return;
    }

    const session = buildSession(message);
    sessions.set(chatId, session);
    await sendQuestion(session, message);
  }

  async function answer(message, text) {
    const chatId = getChatId(message);
    const session = sessions.get(chatId);

    if (!session || session.answer === null) {
      return false;
    }

    const normalized = String(text || '').trim();
    if (!/^-?\d+$/.test(normalized)) {
      return false;
    }

    clearTimeout(session.timer);
    const value = Number(normalized);
    const isCorrect = value === session.answer;

    if (isCorrect) {
      session.correct += 1;
      session.xp += xpPerCorrect;
      await sendMessage(chatId, {
        text: `✅ Benar! +${xpPerCorrect} XP\nJawaban: ${session.answer}`,
      }, { quoted: message });
    } else {
      session.wrong += 1;
      await sendMessage(chatId, {
        text: `❌ Salah!\nJawaban yang benar: ${session.answer}`,
      }, { quoted: message });
    }

    await next(session, message);
    return true;
  }

  async function sendQuestion(session, quoted) {
    session.currentQuestion += 1;
    const question = generateQuestion();
    session.answer = question.answer;

    await sendMessage(session.chatId, {
      text: [
        '🧮 *Math Hard*',
        `Soal ${session.currentQuestion}/${totalQuestions}`,
        `⏱️ Waktu: ${Math.round(questionTimeoutMs / 1000)} detik`,
        '',
        `*${question.text}*`,
        '',
        'Kirim jawaban berupa angka.',
      ].join('\n'),
    }, { quoted });

    session.timer = setTimeout(() => {
      void handleTimeout(session);
    }, questionTimeoutMs);
  }

  async function handleTimeout(session) {
    session.wrong += 1;
    await sendMessage(session.chatId, {
      text: `⌛ Waktu habis!\nJawaban yang benar: ${session.answer}`,
    });
    await next(session);
  }

  async function next(session, quoted) {
    session.answer = null;

    if (session.currentQuestion >= totalQuestions) {
      await finish(session, quoted);
      return;
    }

    await sendQuestion(session, quoted);
  }

  async function finish(session, quoted) {
    clearTimeout(session.timer);
    sessions.delete(session.chatId);

    await sendMessage(session.chatId, {
      text: [
        '🏁 *Math Hard Selesai!*',
        `Total soal: ${totalQuestions}`,
        `✅ Benar: ${session.correct}`,
        `❌ Salah/Waktu habis: ${session.wrong}`,
        `⭐ XP didapat: ${session.xp}`,
      ].join('\n'),
    }, quoted ? { quoted } : undefined);
  }

  return {
    start,
    answer,
    sessions,
  };
}

module.exports = {
  createMathGameEngine,
  DEFAULT_TOTAL_QUESTIONS,
  DEFAULT_QUESTION_TIMEOUT_MS,
};
