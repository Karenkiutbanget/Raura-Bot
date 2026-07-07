'use strict';

const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const { StickerError } = require('./media');
const { DEFAULT_AUTHOR, DEFAULT_PACKNAME, addExifToWebp, buildExifBuffer } = require('./metadata');

const MAX_VIDEO_SECONDS = 10;
const MAX_ANIMATED_SIZE = 950 * 1024;

async function withTempDir(work) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'raura-sticker-'));
  try {
    return await work(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

async function makeImageSticker(buffer, options = {}) {
  const exif = buildExifBuffer(options.packname || DEFAULT_PACKNAME, options.author || DEFAULT_AUTHOR);
  const webp = await sharp(buffer, { animated: false })
    .rotate()
    .resize(512, 512, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      withoutEnlargement: true
    })
    .webp({ quality: 82, effort: 6, smartSubsample: true })
    .toBuffer();
  return addExifToWebp(webp, exif);
}

function runFfmpeg(input, output, args) {
  return new Promise((resolve, reject) => {
    ffmpeg(input)
      .outputOptions(args)
      .on('end', resolve)
      .on('error', error => reject(new StickerError('FFMPEG_FAILED', `Gagal memproses video/GIF: ${error.message}`)))
      .save(output);
  });
}

async function probeDuration(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (error, metadata) => {
      if (error) return reject(new StickerError('FFPROBE_FAILED', `Gagal membaca durasi media: ${error.message}`));
      resolve(Number(metadata?.format?.duration || 0));
    });
  });
}

async function makeAnimatedSticker(buffer, inputMeta, options = {}) {
  return withTempDir(async dir => {
    const input = path.join(dir, inputMeta.isGif ? 'input.gif' : 'input.video');
    const output = path.join(dir, 'sticker.webp');
    await fs.writeFile(input, buffer);
    const exifBuffer = buildExifBuffer(options.packname || DEFAULT_PACKNAME, options.author || DEFAULT_AUTHOR);

    const duration = inputMeta.seconds || await probeDuration(input);
    if (duration > MAX_VIDEO_SECONDS) {
      throw new StickerError('VIDEO_TOO_LONG', `Durasi video maksimal ${MAX_VIDEO_SECONDS} detik. Durasi media ini ${duration.toFixed(1)} detik.`);
    }

    const filter = [
      'fps=15',
      'scale=512:512:force_original_aspect_ratio=decrease',
      'pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000',
      'split[a][b]',
      '[a]palettegen=reserve_transparent=on:transparency_color=ffffff[p]',
      '[b][p]paletteuse'
    ].join(',');

    await runFfmpeg(input, output, [
      '-t', String(MAX_VIDEO_SECONDS),
      '-vf', filter,
      '-loop', '0',
      '-an',
      '-vsync', '0',
      '-q:v', '60',
      '-compression_level', '6',
      '-metadata', 'title=WhatsApp Sticker'
    ]);

    const sticker = await fs.readFile(output);
    if (sticker.length > MAX_ANIMATED_SIZE) {
      throw new StickerError('STICKER_TOO_LARGE', 'Sticker animasi masih terlalu besar. Coba potong video/GIF menjadi lebih pendek atau kirim media yang lebih ringan.');
    }
    return addExifToWebp(sticker, exifBuffer);
  });
}

async function createSticker(buffer, meta, options = {}) {
  if (meta.kind === 'image') return makeImageSticker(buffer, options);
  if (meta.kind === 'video') return makeAnimatedSticker(buffer, meta, options);
  throw new StickerError('UNSUPPORTED_FORMAT', 'Format media tidak didukung untuk sticker.');
}

module.exports = {
  MAX_VIDEO_SECONDS,
  createSticker,
  makeImageSticker,
  makeAnimatedSticker
};
