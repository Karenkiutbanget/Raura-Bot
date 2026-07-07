const fs = require('fs/promises');
const path = require('path');

class XpDatabase {
  constructor(filePath = path.join(process.cwd(), 'data', 'xp.json')) {
    this.filePath = filePath;
    this.writeQueue = Promise.resolve();
  }

  async ensureFile() {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    try {
      await fs.access(this.filePath);
    } catch {
      await fs.writeFile(this.filePath, JSON.stringify({ users: {} }, null, 2));
    }
  }

  async read() {
    await this.ensureFile();
    const raw = await fs.readFile(this.filePath, 'utf8');
    try {
      const parsed = JSON.parse(raw);
      if (!parsed.users || typeof parsed.users !== 'object') {
        return { users: {} };
      }
      return parsed;
    } catch {
      return { users: {} };
    }
  }

  async write(data) {
    await this.ensureFile();
    this.writeQueue = this.writeQueue.then(() =>
      fs.writeFile(this.filePath, JSON.stringify(data, null, 2))
    );
    return this.writeQueue;
  }

  async addXp(userId, amount) {
    if (!userId) throw new Error('userId is required to add XP');
    if (!Number.isInteger(amount) || amount < 1) throw new Error('XP amount must be a positive integer');

    const data = await this.read();
    if (!data.users[userId]) {
      data.users[userId] = { xp: 0 };
    }
    data.users[userId].xp += amount;
    await this.write(data);
    return data.users[userId].xp;
  }
}

module.exports = new XpDatabase();
module.exports.XpDatabase = XpDatabase;
