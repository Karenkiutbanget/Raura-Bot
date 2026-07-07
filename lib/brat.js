const axios = require('axios');
const config = require('../config');

const DEFAULT_TIMEOUT = 15000;
const DEFAULT_MAX_TEXT_LENGTH = 250;
const IMAGE_CONTENT_TYPE_PATTERN = /^image\//i;

function getBratConfig() {
  return config.brat || {};
}

function normalizeApiUrl(apiUrl) {
  if (typeof apiUrl !== 'string' || apiUrl.trim().length === 0) {
    throw new Error('URL API Brat belum diatur di config.js.');
  }

  return apiUrl.trim();
}

function buildBratUrl(text) {
  const { apiUrl } = getBratConfig();
  const normalizedApiUrl = normalizeApiUrl(apiUrl);
  const separator = normalizedApiUrl.includes('?') ? '&' : '?';

  return `${normalizedApiUrl}${separator}text=${encodeURIComponent(text)}`;
}

function validateText(text) {
  const normalizedText = String(text || '').trim();
  const maxTextLength = Number(getBratConfig().maxTextLength) || DEFAULT_MAX_TEXT_LENGTH;

  if (!normalizedText) {
    throw new Error('Teks tidak boleh kosong. Contoh: /brat Halo Dunia');
  }

  if (normalizedText.length > maxTextLength) {
    throw new Error(`Teks terlalu panjang. Maksimal ${maxTextLength} karakter.`);
  }

  return normalizedText;
}

function getAxiosErrorMessage(error) {
  if (error.code === 'ECONNABORTED' || /timeout/i.test(error.message || '')) {
    return 'API Brat timeout. Coba lagi beberapa saat lagi.';
  }

  if (error.response) {
    return `API Brat mengembalikan HTTP ${error.response.status}. Coba lagi nanti.`;
  }

  if (error.request) {
    return 'API Brat sedang offline atau tidak dapat dihubungi.';
  }

  return 'Terjadi kesalahan saat menghubungi API Brat.';
}

async function fetchBratImage(text) {
  const normalizedText = validateText(text);
  const url = buildBratUrl(normalizedText);
  const bratConfig = getBratConfig();

  try {
    const response = await axios.get(url, {
      responseType: bratConfig.responseType || 'arraybuffer',
      timeout: Number(bratConfig.timeout) || DEFAULT_TIMEOUT,
      validateStatus: (status) => status >= 200 && status < 300,
    });

    const contentType = response.headers['content-type'] || '';
    if (!IMAGE_CONTENT_TYPE_PATTERN.test(contentType)) {
      throw new Error('Respons API Brat bukan gambar.');
    }

    return {
      buffer: Buffer.from(response.data),
      contentType,
    };
  } catch (error) {
    if (error.message === 'Respons API Brat bukan gambar.') {
      throw error;
    }

    throw new Error(getAxiosErrorMessage(error));
  }
}

module.exports = {
  buildBratUrl,
  fetchBratImage,
  validateText,
};
