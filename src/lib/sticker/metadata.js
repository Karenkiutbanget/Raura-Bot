'use strict';

const crypto = require('crypto');

const DEFAULT_PACKNAME = 'Raura Bot';
const DEFAULT_AUTHOR = 'Raura';

function buildExifBuffer(packname = DEFAULT_PACKNAME, author = DEFAULT_AUTHOR) {
  const payload = {
    'sticker-pack-id': crypto.randomBytes(16).toString('hex'),
    'sticker-pack-name': String(packname || DEFAULT_PACKNAME),
    'sticker-pack-publisher': String(author || DEFAULT_AUTHOR),
    emojis: ['✨']
  };

  const json = Buffer.from(JSON.stringify(payload), 'utf8');
  const exifAttr = Buffer.from([
    0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00,
    0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x16, 0x00, 0x00, 0x00
  ]);
  exifAttr.writeUIntLE(json.length, 14, 4);
  return Buffer.concat([exifAttr, json]);
}


function makeChunk(type, payload) {
  const header = Buffer.alloc(8);
  header.write(type, 0, 4, 'ascii');
  header.writeUInt32LE(payload.length, 4);
  return payload.length % 2 === 0
    ? Buffer.concat([header, payload])
    : Buffer.concat([header, payload, Buffer.from([0])]);
}

function addExifToWebp(webpBuffer, exifBuffer) {
  if (!Buffer.isBuffer(webpBuffer) || webpBuffer.toString('ascii', 0, 4) !== 'RIFF' || webpBuffer.toString('ascii', 8, 12) !== 'WEBP') {
    throw new Error('Buffer bukan file WebP yang valid.');
  }

  const chunks = [];
  let offset = 12;
  let hasExif = false;
  while (offset + 8 <= webpBuffer.length) {
    const type = webpBuffer.toString('ascii', offset, offset + 4);
    const size = webpBuffer.readUInt32LE(offset + 4);
    const chunkEnd = offset + 8 + size + (size % 2);
    if (chunkEnd > webpBuffer.length) break;

    if (type === 'VP8X' && size >= 10) {
      const chunk = Buffer.from(webpBuffer.subarray(offset, chunkEnd));
      chunk[8] |= 0x08;
      chunks.push(chunk);
    } else if (type === 'EXIF') {
      hasExif = true;
      chunks.push(makeChunk('EXIF', exifBuffer));
    } else {
      chunks.push(webpBuffer.subarray(offset, chunkEnd));
    }
    offset = chunkEnd;
  }

  if (!hasExif) chunks.push(makeChunk('EXIF', exifBuffer));
  const body = Buffer.concat(chunks);
  const header = Buffer.alloc(12);
  header.write('RIFF', 0, 4, 'ascii');
  header.writeUInt32LE(body.length + 4, 4);
  header.write('WEBP', 8, 4, 'ascii');
  return Buffer.concat([header, body]);
}

module.exports = {
  DEFAULT_PACKNAME,
  DEFAULT_AUTHOR,
  buildExifBuffer,
  addExifToWebp
};
