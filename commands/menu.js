const fs = require("fs");
const path = require("path");

module.exports = {
  name: "menu",
  aliases: ["menu"],
  async execute(m, { conn }) {
    try {
      const imagePath = path.join(__dirname, "../media/menu.jpg");
      
      // Check if image exists
      if (!fs.existsSync(imagePath)) {
        return conn.reply(m.chat, "❌ menu.jpg tidak ditemukan.", m);
      }

      // Get user data from database (adjust according to your database structure)
      let userData = {
        name: m.pushName || "User",
        status: "Member", // Get from database
        level: 1, // Get from database
        limit: 100, // Get from database
        balance: 0 // Get from database
      };

      // Try to get from database if available
      try {
        // Example: if you have a database module
        // userData = await db.getUser(m.sender);
        // Uncomment and modify based on your database setup
      } catch (e) {
        // Use default values if database is not available
      }

      // Create caption with user info
      const caption = `━━━━━━━━━━━━━━━━━━

○ 𝗜𝗡𝗙𝗢𝗥𝗠𝗔𝗦𝗜 𝗨𝗦𝗘𝗥 ○

╭
│ 👤 Nama : @${m.sender.split("@")[0]}
│ 💎 Status : ${userData.status}
│ 🎫 Limit : ${userData.limit}
│ ⭐ Level : ${userData.level}
│ 💰 Balance : ${userData.balance}
╰

━━━━━━━━━━━━━━━━━━

*𝗥𝗔𝗨𝗥𝗔 𝗕𝗢𝗧*
Powered by Rimni

━━━━━━━━━━━━━━━━━━`;

      // Read image file
      const imageBuffer = fs.readFileSync(imagePath);

      // Send image with interactive buttons (Quick Reply)
      await conn.sendMessage(
        m.chat,
        {
          image: imageBuffer,
          caption: caption,
          contextInfo: {
            mentionedJid: [m.sender],
            forwardingScore: 9999,
            isForwarded: true,
            // Quick Reply Buttons
            externalAdReply: {
              title: "RAURA BOT",
              body: "Klik tombol di bawah",
              mediaUrl: "",
              sourceUrl: "",
              thumbnail: imageBuffer,
              mediaType: 1,
              renderLargerThumbnail: true
            }
          }
        },
        { quoted: m }
      );

      // Send separate message with interactive buttons
      await conn.sendMessage(
        m.chat,
        {
          text: "Pilih opsi:",
          footer: "RAURA BOT",
          buttons: [
            {
              buttonId: "!sewa",
              buttonText: {
                displayText: "SEWA"
              },
              type: 1
            },
            {
              buttonId: "!rules",
              buttonText: {
                displayText: "RULES"
              },
              type: 1
            }
          ],
          headerType: 0
        },
        { quoted: m }
      );

    } catch (error) {
      console.error("Error in menu command:", error);
      conn.reply(
        m.chat,
        "❌ Terjadi error saat menampilkan menu: " + error.message,
        m
      );
    }
  }
};
