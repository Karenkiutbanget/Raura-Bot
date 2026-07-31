'use strict';

const { createMathGameEngine } = require('./lib/mathGameEngine');

const TOTAL_QUESTIONS = 50;
const QUESTION_TIMEOUT_MS = 60_000;
const XP_PER_CORRECT = 25;

function randomThreeDigit() {
  return Math.floor(Math.random() * 900) + 100;
}

function generateHardQuestion() {
  const left = randomThreeDigit();
  const right = randomThreeDigit();
  const operator = Math.random() < 0.5 ? '+' : '-';

  return {
    text: `${left} ${operator} ${right}`,
    answer: operator === '+' ? left + right : left - right,
  };
}

function createMathHardCommand(sock) {
  const engine = createMathGameEngine({
    totalQuestions: TOTAL_QUESTIONS,
    questionTimeoutMs: QUESTION_TIMEOUT_MS,
    xpPerCorrect: XP_PER_CORRECT,
    generateQuestion: generateHardQuestion,
    sendMessage: (jid, content, options) => sock.sendMessage(jid, content, options),
  });

  return {
    name: 'mathhard',
    aliases: ['/mathhard'],
    description: 'Game matematika level Hard: 50 soal angka 3 digit, 60 detik per soal.',
    async execute(message) {
      await engine.start(message);
    },
    async onMessage(message, text) {
      return engine.answer(message, text);
    },
  };
}

module.exports = {
  createMathHardCommand,
  generateHardQuestion,
  TOTAL_QUESTIONS,
  QUESTION_TIMEOUT_MS,
  XP_PER_CORRECT,
};
