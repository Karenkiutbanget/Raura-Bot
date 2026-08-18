'use strict';

const COMMAND = '/mathmedium';
const LEVEL_NAME = 'Medium';
const TOTAL_QUESTIONS = 50;
const QUESTION_TIME_MS = 60_000;
const MIN_TWO_DIGIT = 10;
const MAX_TWO_DIGIT = 99;
const XP_REWARD = 20;
const OPERATIONS = ['+', '-', '×', '÷'];

const MATH_EASY_ENGINE_CANDIDATES = [
  './matheasy',
  './mathEasy',
  '../matheasy',
  '../mathEasy',
  '../games/matheasy',
  '../games/mathEasy',
  '../lib/matheasy',
  '../lib/mathEasy',
  '../helpers/matheasy',
  '../helpers/mathEasy',
];

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
    question: `${left} + ${right}`,
    answer: left + right,
  };
}

function makeSubtractionQuestion() {
  const left = randomInt(MIN_TWO_DIGIT, MAX_TWO_DIGIT);
  const right = randomInt(MIN_TWO_DIGIT, MAX_TWO_DIGIT);

  return {
    question: `${left} - ${right}`,
    answer: left - right,
  };
}

function makeMultiplicationQuestion() {
  const left = randomInt(MIN_TWO_DIGIT, MAX_TWO_DIGIT);
  const right = randomInt(MIN_TWO_DIGIT, MAX_TWO_DIGIT);

  return {
    question: `${left} × ${right}`,
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
    question: `${dividend} ÷ ${divisor}`,
    answer: dividend / divisor,
  };
}

function generateMathMediumQuestion() {
  const operation = pickRandom(OPERATIONS);

  if (operation === '+') return makeAdditionQuestion();
  if (operation === '-') return makeSubtractionQuestion();
  if (operation === '×') return makeMultiplicationQuestion();

  return makeDivisionQuestion();
}

function getFactoryFromModule(mathEasyModule) {
  return (
    mathEasyModule.createMathCommand ||
    mathEasyModule.createMathGameCommand ||
    mathEasyModule.createMathEasyCommand ||
    mathEasyModule.createCommand ||
    mathEasyModule.default
  );
}

function loadMathEasyFactory() {
  const failures = [];

  for (const modulePath of MATH_EASY_ENGINE_CANDIDATES) {
    try {
      const factory = getFactoryFromModule(require(modulePath));
      if (typeof factory === 'function') return factory;
      failures.push(`${modulePath}: factory tidak ditemukan`);
    } catch (error) {
      if (error.code !== 'MODULE_NOT_FOUND') throw error;
      failures.push(`${modulePath}: ${error.message}`);
    }
  }

  throw new Error(
    [
      'MathEasy engine/helper tidak ditemukan.',
      'Command /mathmedium harus memakai ulang engine MathEasy untuk timer, session, XP, leaderboard, validasi, dan database.',
      `Path yang dicoba: ${failures.join('; ')}`,
    ].join(' '),
  );
}

const mathMediumConfig = {
  name: 'mathmedium',
  command: COMMAND,
  aliases: [COMMAND],
  level: LEVEL_NAME,
  levelName: LEVEL_NAME,
  title: `🧮 Math ${LEVEL_NAME}`,
  totalQuestions: TOTAL_QUESTIONS,
  questionTimeMs: QUESTION_TIME_MS,
  timeLimit: QUESTION_TIME_MS,
  xp: XP_REWARD,
  xpReward: XP_REWARD,
  generateQuestion: generateMathMediumQuestion,
  generator: generateMathMediumQuestion,
};

function createMathMediumCommand(overrides = {}) {
  const createMathEasyCommand = loadMathEasyFactory();

  return createMathEasyCommand({
    ...mathMediumConfig,
    ...overrides,
  });
}

module.exports = {
  ...mathMediumConfig,
  createMathMediumCommand,
  makeQuestion: generateMathMediumQuestion,
  generateQuestion: generateMathMediumQuestion,
};
