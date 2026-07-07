'use strict';

const TOTAL_QUESTIONS = 50;
const QUESTION_TIME_MS = 60_000;
const MIN_TWO_DIGIT = 10;
const MAX_TWO_DIGIT = 99;
const OPERATIONS = ['+', '-', '×', '÷'];

const activeGames = new Map();

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom(items) {
  return items[randomInt(0, items.length - 1)];
}

function makeAdditionQuestion() {
  const left = randomInt(MIN_TWO_DIGIT, MAX_TWO_DIGIT);
  const right = randomInt(MIN_TWO_DIGIT, MAX_TWO_DIGIT);

  return {
    text: `${left} + ${right}`,
    answer: left + right,
  };
}

function makeSubtractionQuestion() {
  const left = randomInt(MIN_TWO_DIGIT, MAX_TWO_DIGIT);
  const right = randomInt(MIN_TWO_DIGIT, MAX_TWO_DIGIT);

  return {
    text: `${left} - ${right}`,
    answer: left - right,
  };
}

function makeMultiplicationQuestion() {
  const left = randomInt(MIN_TWO_DIGIT, MAX_TWO_DIGIT);
  const right = randomInt(MIN_TWO_DIGIT, MAX_TWO_DIGIT);

  return {
    text: `${left} × ${right}`,
    answer: left * right,
  };
}

function makeDivisionQuestion() {
  const validPairs = [];

  for (let dividend = MIN_TWO_DIGIT; dividend <= MAX_TWO_DIGIT; dividend += 1) {
    for (let divisor = MIN_TWO_DIGIT; divisor <= MAX_TWO_DIGIT; divisor += 1) {
      if (dividend % divisor === 0) validPairs.push([dividend, divisor]);
    }
  }

  const [dividend, divisor] = pickRandom(validPairs);

  return {
    text: `${dividend} ÷ ${divisor}`,
    answer: dividend / divisor,
  };
}

function makeQuestion() {
  const operation = pickRandom(OPERATIONS);

  if (operation === '+') return makeAdditionQuestion();
  if (operation === '-') return makeSubtractionQuestion();
  if (operation === '×') return makeMultiplicationQuestion();

  return makeDivisionQuestion();
}

function getChatId(message) {
  return message?.key?.remoteJid;
}

function getSenderId(message) {
  return message?.key?.participant || message?.key?.remoteJid;
}

function getText(message) {
  const content = message?.message;

  return (
    content?.conversation ||
    content?.extendedTextMessage?.text ||
    content?.imageMessage?.caption ||
    content?.videoMessage?.caption ||
    ''
  ).trim();
}

async function sendText(sock, jid, text, quoted) {
  return sock.sendMessage(jid, { text }, quoted ? { quoted } : undefined);
}

function formatQuestion(game) {
  return [
    '🧮 Math Medium',
    '',
    `Soal ${game.currentIndex + 1}/${TOTAL_QUESTIONS}`,
    '',
    game.currentQuestion.text,
  ].join('\n');
}

function formatFinalResult(game) {
  const wrong = game.answers.filter((answer) => answer.status === 'wrong').length;
  const timeout = game.answers.filter((answer) => answer.status === 'timeout').length;

  return [
    '🏁 Math Medium Selesai',
    '',
    `Total soal: ${TOTAL_QUESTIONS}`,
    `Benar: ${game.score}`,
    `Salah: ${wrong}`,
    `Waktu habis: ${timeout}`,
  ].join('\n');
}

async function finishGame(sock, chatId) {
  const game = activeGames.get(chatId);
  if (!game) return;

  clearTimeout(game.timer);
  activeGames.delete(chatId);
  await sendText(sock, chatId, formatFinalResult(game));
}

async function askNextQuestion(sock, chatId) {
  const game = activeGames.get(chatId);
  if (!game) return;

  if (game.currentIndex >= TOTAL_QUESTIONS) {
    await finishGame(sock, chatId);
    return;
  }

  game.currentQuestion = makeQuestion();
  await sendText(sock, chatId, formatQuestion(game));

  game.timer = setTimeout(async () => {
    const latestGame = activeGames.get(chatId);
    if (!latestGame || latestGame.currentIndex !== game.currentIndex) return;

    latestGame.answers.push({
      question: latestGame.currentQuestion.text,
      correctAnswer: latestGame.currentQuestion.answer,
      status: 'timeout',
    });
    latestGame.currentIndex += 1;

    await sendText(
      sock,
      chatId,
      `⏰ Waktu habis! Jawaban yang benar: ${latestGame.currentQuestion.answer}`,
    );
    await askNextQuestion(sock, chatId);
  }, QUESTION_TIME_MS);
}

async function startMathMedium(sock, message) {
  const chatId = getChatId(message);
  if (!chatId) return;

  if (activeGames.has(chatId)) {
    await sendText(sock, chatId, 'Game Math Medium sedang berjalan di chat ini.', message);
    return;
  }

  activeGames.set(chatId, {
    currentIndex: 0,
    currentQuestion: null,
    score: 0,
    answers: [],
    timer: null,
  });

  await askNextQuestion(sock, chatId);
}

async function handleMathMediumAnswer(sock, message) {
  const chatId = getChatId(message);
  const game = activeGames.get(chatId);
  if (!game || !game.currentQuestion) return false;

  const text = getText(message);
  if (!/^-?\d+$/.test(text)) return false;

  clearTimeout(game.timer);

  const senderId = getSenderId(message);
  const userAnswer = Number(text);
  const isCorrect = userAnswer === game.currentQuestion.answer;

  if (isCorrect) game.score += 1;

  game.answers.push({
    question: game.currentQuestion.text,
    correctAnswer: game.currentQuestion.answer,
    userAnswer,
    senderId,
    status: isCorrect ? 'correct' : 'wrong',
  });

  await sendText(
    sock,
    chatId,
    isCorrect
      ? '✅ Benar! Lanjut ke soal berikutnya.'
      : `❌ Salah! Jawaban yang benar: ${game.currentQuestion.answer}`,
    message,
  );

  game.currentIndex += 1;
  await askNextQuestion(sock, chatId);
  return true;
}

async function mathMediumCommand(sock, message) {
  const text = getText(message).toLowerCase();

  if (text === '/mathmedium') {
    await startMathMedium(sock, message);
    return true;
  }

  return handleMathMediumAnswer(sock, message);
}

module.exports = {
  name: 'mathmedium',
  command: '/mathmedium',
  description: 'Game matematika medium 50 soal dengan waktu 60 detik per soal.',
  activeGames,
  constants: {
    TOTAL_QUESTIONS,
    QUESTION_TIME_MS,
    MIN_TWO_DIGIT,
    MAX_TWO_DIGIT,
    OPERATIONS,
  },
  handle: mathMediumCommand,
  startMathMedium,
  handleMathMediumAnswer,
  makeQuestion,
};
