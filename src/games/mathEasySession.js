const DEFAULT_TOTAL_QUESTIONS = 50;
const DEFAULT_TIME_LIMIT_SECONDS = 60;
const DEFAULT_XP_PER_CORRECT = 10;

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateEasyQuestion() {
  const operators = ['+', '-', '×', '÷'];
  const operator = operators[randomInt(0, operators.length - 1)];

  if (operator === '+') {
    const left = randomInt(1, 50);
    const right = randomInt(1, 50);
    return { text: `${left} + ${right}`, answer: left + right };
  }

  if (operator === '-') {
    const left = randomInt(1, 50);
    const right = randomInt(1, left);
    return { text: `${left} - ${right}`, answer: left - right };
  }

  if (operator === '×') {
    const left = randomInt(1, 20);
    const right = randomInt(1, 10);
    return { text: `${left} × ${right}`, answer: left * right };
  }

  const divisor = randomInt(1, 10);
  const answer = randomInt(1, 20);
  return { text: `${divisor * answer} ÷ ${divisor}`, answer };
}

class MathEasySession {
  constructor({ chatId, isGroup, sock, xpDatabase, totalQuestions = DEFAULT_TOTAL_QUESTIONS, timeLimitSeconds = DEFAULT_TIME_LIMIT_SECONDS, xpPerCorrect = DEFAULT_XP_PER_CORRECT, onFinish }) {
    this.chatId = chatId;
    this.isGroup = isGroup;
    this.sock = sock;
    this.xpDatabase = xpDatabase;
    this.totalQuestions = totalQuestions;
    this.timeLimitSeconds = timeLimitSeconds;
    this.xpPerCorrect = xpPerCorrect;
    this.onFinish = onFinish;
    this.questionNumber = 0;
    this.currentQuestion = null;
    this.timeout = null;
    this.locked = false;
    this.finished = false;
    this.stats = {
      correct: 0,
      wrong: 0,
      timeout: 0,
      totalXp: 0,
      players: new Map()
    };
  }

  async start() {
    await this.nextQuestion();
  }

  async send(text) {
    await this.sock.sendMessage(this.chatId, { text });
  }

  formatQuestion() {
    return `🧮 Math Easy\n\nSoal ${this.questionNumber}/${this.totalQuestions}\n\n${this.currentQuestion.text} = ?\n\n⏰ Waktu: ${this.timeLimitSeconds} detik\n\nBalas dengan angka jawaban.`;
  }

  async nextQuestion() {
    if (this.finished) return;
    this.clearTimer();

    if (this.questionNumber >= this.totalQuestions) {
      await this.finish();
      return;
    }

    this.questionNumber += 1;
    this.currentQuestion = generateEasyQuestion();
    this.locked = false;
    await this.send(this.formatQuestion());

    this.timeout = setTimeout(() => {
      this.handleTimeout().catch(async (error) => {
        console.error('MathEasy timeout error:', error);
        await this.safeSend('Terjadi error saat memproses waktu habis Math Easy. Game dihentikan.');
        await this.finish(true);
      });
    }, this.timeLimitSeconds * 1000);
  }

  async safeSend(text) {
    try {
      await this.send(text);
    } catch (error) {
      console.error('MathEasy send error:', error);
    }
  }

  clearTimer() {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
  }

  getPlayer(userId) {
    if (!this.stats.players.has(userId)) {
      this.stats.players.set(userId, { correct: 0, xp: 0 });
    }
    return this.stats.players.get(userId);
  }

  parseAnswer(text) {
    const trimmed = String(text || '').trim();
    if (!/^-?\d+$/.test(trimmed)) return null;
    return Number.parseInt(trimmed, 10);
  }

  async handleAnswer({ userId, text }) {
    if (this.finished || this.locked || !this.currentQuestion) return false;

    const answer = this.parseAnswer(text);
    if (answer === null) return false;

    if (answer === this.currentQuestion.answer) {
      this.locked = true;
      this.clearTimer();
      this.stats.correct += 1;
      this.stats.totalXp += this.xpPerCorrect;
      const player = this.getPlayer(userId);
      player.correct += 1;
      player.xp += this.xpPerCorrect;
      await this.xpDatabase.addXp(userId, this.xpPerCorrect);
      await this.send(`✅ Benar!\n\nJawaban: ${this.currentQuestion.answer}\n\n+${this.xpPerCorrect} XP\n\nMelanjutkan ke soal berikutnya...`);
      await this.nextQuestion();
      return true;
    }

    this.locked = true;
    this.clearTimer();
    this.stats.wrong += 1;
    await this.send(`❌ Salah!\n\nJawaban yang benar: ${this.currentQuestion.answer}\n\nMelanjutkan ke soal berikutnya...`);
    await this.nextQuestion();
    return true;
  }

  async handleTimeout() {
    if (this.finished || this.locked || !this.currentQuestion) return;
    this.locked = true;
    this.clearTimer();
    this.stats.timeout += 1;
    await this.send(`⏰ Waktu habis!\n\nJawabannya: ${this.currentQuestion.answer}\n\nMelanjutkan ke soal berikutnya...`);
    await this.nextQuestion();
  }

  formatTopPlayers() {
    if (!this.isGroup || this.stats.players.size === 0) return '';

    const topPlayers = [...this.stats.players.entries()]
      .sort((a, b) => b[1].correct - a[1].correct || b[1].xp - a[1].xp)
      .slice(0, 5)
      .map(([userId, data], index) => `${index + 1}. @${userId.split('@')[0]} - ${data.correct} benar (${data.xp} XP)`)
      .join('\n');

    return `\n\n🏆 Top 5 Pemain\n${topPlayers}`;
  }

  async finish(force = false) {
    if (this.finished) return;
    this.finished = true;
    this.clearTimer();

    if (!force) {
      await this.send(`🏁 Math Easy Selesai!\n\nTotal Soal: ${this.totalQuestions}\nJawaban Benar: ${this.stats.correct}\nJawaban Salah: ${this.stats.wrong}\nWaktu Habis: ${this.stats.timeout}\nTotal XP: ${this.stats.totalXp}${this.formatTopPlayers()}`);
    }

    if (typeof this.onFinish === 'function') {
      this.onFinish(this.chatId);
    }
  }
}

module.exports = { MathEasySession, generateEasyQuestion };
