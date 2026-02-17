const fs = require('fs');
const path = require('path');
const https = require('https');

const MODELS_DIR = path.join(__dirname, 'models');

const REPO = 'AnEntrypoint/sttttsmodels';
const BRANCH = 'main';
const BASE = `https://github.com/${REPO}/raw/${BRANCH}/`;

const STT_MODEL = 'onnx-community/whisper-base';
const STT_PREFIX = `models/stt/${STT_MODEL}/`;
const STT_FILES = [
  'config.json',
  'preprocessor_config.json',
  'tokenizer.json',
  'tokenizer_config.json',
  'vocab.json',
  'merges.txt',
  'onnx/encoder_model.onnx',
  'onnx/decoder_model_merged_q4.onnx',
  'onnx/decoder_model_merged.onnx'
];

const TTS_PREFIX = 'models/tts/';
const TTS_FILES = [
  'mimi_encoder.onnx',
  'text_conditioner.onnx',
  'flow_lm_main_int8.onnx',
  'flow_lm_flow_int8.onnx',
  'mimi_decoder_int8.onnx',
  'tokenizer.model'
];

const SPEAKER_PREFIX = 'models/speaker/';
const SPEAKER_FILES = [
  'embedding_model.ckpt',
  'classifier.ckpt',
  'mean_var_norm_emb.ckpt',
  'hyperparams.yaml'
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
  const speakerDir = path.join(MODELS_DIR, 'speaker');

  console.log('[sttttsmodels] downloading STT models from GitHub...');
  for (const file of STT_FILES) {
    const dest = path.join(sttDir, file);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 0) continue;
    await download(BASE + STT_PREFIX + file, dest);
  }

  console.log('[sttttsmodels] downloading TTS models from GitHub...');
  for (const file of TTS_FILES) {
    const dest = path.join(ttsDir, file);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 0) continue;
    await download(BASE + TTS_PREFIX + file, dest);
  }

  console.log('[sttttsmodels] downloading speaker embedding model from GitHub...');
  for (const file of SPEAKER_FILES) {
    const dest = path.join(speakerDir, file);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 0) continue;
    await download(BASE + SPEAKER_PREFIX + file, dest);
  }

  console.log('[sttttsmodels] all models ready.');
}

main().catch((err) => {
  console.error('[sttttsmodels] download failed:', err.message);
  process.exit(1);
});
