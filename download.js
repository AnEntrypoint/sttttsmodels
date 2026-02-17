const fs = require('fs');
const path = require('path');
const https = require('https');

const MODELS_DIR = path.join(__dirname, 'models');

const STT_MODEL = 'onnx-community/whisper-base';
const STT_BASE = `https://huggingface.co/${STT_MODEL}/resolve/main/`;
const STT_FILES = [
  'config.json',
  'preprocessor_config.json',
  'tokenizer.json',
  'tokenizer_config.json',
  'vocab.json',
  'merges.txt',
  'model_quantized.onnx',
  'onnx/encoder_model.onnx',
  'onnx/decoder_model_merged_q4.onnx',
  'onnx/decoder_model_merged.onnx'
];

const TTS_BASE = 'https://huggingface.co/KevinAHM/pocket-tts-onnx/resolve/main/onnx/';
const TTS_FILES = [
  'mimi_encoder.onnx',
  'text_conditioner.onnx',
  'flow_lm_main_int8.onnx',
  'flow_lm_flow_int8.onnx',
  'mimi_decoder_int8.onnx',
  'tokenizer.model'
];

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function download(url, dest, retries = 3, attempt = 0) {
  return new Promise((resolve, reject) => {
    ensureDir(path.dirname(dest));
    const get = (u) => {
      https.get(u, (res) => {
        if ([301, 302, 307, 308].includes(res.statusCode)) {
          res.resume();
          const location = res.headers.location;
          const next = location.startsWith('http') ? location : new URL(location, u).href;
          get(next);
          return;
        }
        if (res.statusCode !== 200) {
          res.resume();
          if (attempt < retries - 1) {
            setTimeout(() => download(url, dest, retries, attempt + 1).then(resolve).catch(reject), Math.pow(2, attempt) * 1000);
          } else {
            reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          }
          return;
        }
        const file = fs.createWriteStream(dest);
        let bytes = 0;
        res.on('data', (chunk) => {
          bytes += chunk.length;
          process.stdout.write(`\r  ${path.basename(dest)} ${(bytes / 1024 / 1024).toFixed(1)}MB`);
        });
        res.pipe(file);
        file.on('finish', () => { file.close(); process.stdout.write(' done\n'); resolve(); });
        file.on('error', (err) => {
          fs.existsSync(dest) && fs.unlinkSync(dest);
          reject(err);
        });
      }).on('error', (err) => {
        fs.existsSync(dest) && fs.unlinkSync(dest);
        if (attempt < retries - 1) {
          setTimeout(() => download(url, dest, retries, attempt + 1).then(resolve).catch(reject), Math.pow(2, attempt) * 1000);
        } else {
          reject(err);
        }
      });
    };
    get(url);
  });
}

async function main() {
  const sttDir = path.join(MODELS_DIR, 'stt', STT_MODEL);
  const ttsDir = path.join(MODELS_DIR, 'tts');

  console.log('[sttttsmodels] downloading STT model (onnx-community/whisper-base)...');
  for (const file of STT_FILES) {
    const dest = path.join(sttDir, file);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 0) continue;
    await download(STT_BASE + file, dest);
  }

  console.log('[sttttsmodels] downloading TTS models (pocket-tts-onnx)...');
  for (const file of TTS_FILES) {
    const dest = path.join(ttsDir, file);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 0) continue;
    await download(TTS_BASE + file, dest);
  }

  console.log('[sttttsmodels] all models ready.');
}

main().catch((err) => {
  console.error('[sttttsmodels] download failed:', err.message);
  process.exit(1);
});
