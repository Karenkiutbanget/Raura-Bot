# Raura Bot

WhatsApp bot berbasis Node.js dan `@whiskeysockets/baileys`.

## Command yang tersedia

### `/matheasy`

Game matematika mudah untuk grup WhatsApp dan chat pribadi.

- Total soal: 50
- Waktu per soal: 60 detik
- Operasi: penjumlahan, pengurangan, perkalian, dan pembagian bilangan bulat
- Jawaban benar mendapat 10 XP
- Grup hanya dapat memiliki 1 sesi Math Easy aktif
- Semua anggota grup dapat menjawab; penjawab benar pertama mendapat poin
- Chat pribadi dimainkan oleh pemilik chat tersebut

## Menjalankan bot

```bash
npm install
node src/index.js
```
