const fs = require('fs');
const path = require('path');
const https = require('https');

const MODELS_DIR = path.join(__dirname, 'models');
const REPO = 'AnEntrypoint/sttttsmodels';
const BRANCH = 'main';
const BASE = `https://github.com/${REPO}/raw/${BRANCH}/`;

const MODEL_GROUPS = {
  stt: {
    prefix: 'models/stt/onnx-community/whisper-base/',
    dir: path.join(MODELS_DIR, 'stt/onnx-community/whisper-base'),
    files: ['config.json','preprocessor_config.json','tokenizer.json','tokenizer_config.json','vocab.json','merges.txt','onnx/encoder_model.onnx','onnx/decoder_model_merged_q4.onnx','onnx/decoder_model_merged.onnx'],
  },
  tts: {
    prefix: 'models/tts/',
    dir: path.join(MODELS_DIR, 'tts'),
    files: ['mimi_encoder.onnx','text_conditioner.onnx','flow_lm_main_int8.onnx','flow_lm_flow_int8.onnx','mimi_decoder_int8.onnx','tokenizer.model'],
  },
  speaker: {
    prefix: 'models/speaker/',
    dir: path.join(MODELS_DIR, 'speaker'),
    files: ['embedding_model.ckpt','classifier.ckpt','mean_var_norm_emb.ckpt','hyperparams.yaml'],
  },
  qwen: {
    prefix: 'models/qwen/onnx-community/Qwen3.5-0.8B-ONNX/',
    dir: path.join(MODELS_DIR, 'qwen/onnx-community/Qwen3.5-0.8B-ONNX'),
    files: ['config.json','generation_config.json','tokenizer.json','tokenizer_config.json','onnx/embed_tokens_q4.onnx','onnx/embed_tokens_q4.onnx_data','onnx/decoder_model_merged_q4.onnx','onnx/decoder_model_merged_q4.onnx_data'],
    chunked: {
      'onnx/embed_tokens_q4.onnx_data': ['partaa','partab'],
      'onnx/decoder_model_merged_q4.onnx_data': ['partaa','partab','partac','partad','partae','partaf'],
    },
  },
};

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
          const next = res.headers.location.startsWith('http') ? res.headers.location : new URL(res.headers.location, u).href;
          return get(next);
        }
        if (res.statusCode !== 200) {
          res.resume();
          if (attempt < retries - 1) return setTimeout(() => download(url, dest, retries, attempt + 1).then(resolve).catch(reject), Math.pow(2, attempt) * 1000);
          return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        }
        const file = fs.createWriteStream(dest);
        let bytes = 0, total = parseInt(res.headers['content-length'] || '0', 10);
        res.on('data', (chunk) => {
          bytes += chunk.length;
          const pct = total ? ` (${Math.round(bytes/total*100)}%)` : '';
          process.stdout.write(`\r  ${path.basename(dest)} ${(bytes/1024/1024).toFixed(1)}MB${pct}  `);
        });
        res.pipe(file);
        file.on('finish', () => { file.close(); process.stdout.write(' done\n'); resolve(); });
        file.on('error', (err) => {
          if (fs.existsSync(dest)) fs.unlinkSync(dest);
          reject(err);
        });
      }).on('error', (err) => {
        if (fs.existsSync(dest)) fs.unlinkSync(dest);
        if (attempt < retries - 1) return setTimeout(() => download(url, dest, retries, attempt + 1).then(resolve).catch(reject), Math.pow(2, attempt) * 1000);
        reject(err);
      });
    };
    get(url);
  });
}

async function downloadGroup(name, group) {
  console.log(`[sttttsmodels] downloading ${name} models...`);
  const regularFiles = group.files.filter(f => !group.chunked?.[f]);
  const chunkedFiles = group.files.filter(f => group.chunked?.[f]);

  await Promise.all(regularFiles.map(async (file) => {
    const dest = path.join(group.dir, file);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 0) return;
    await download(BASE + group.prefix + file, dest);
  }));

  for (const file of chunkedFiles) {
    const dest = path.join(group.dir, file);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 0) continue;
    ensureDir(path.dirname(dest));
    if (fs.existsSync(dest)) fs.unlinkSync(dest);
    const parts = group.chunked[file];
    await Promise.all(parts.map(async (part) => {
      const chunkDest = dest + '.' + part;
      if (!fs.existsSync(chunkDest) || fs.statSync(chunkDest).size === 0) {
        await download(BASE + group.prefix + file + '.' + part, chunkDest);
      }
    }));
    for (const part of parts) {
      const chunkDest = dest + '.' + part;
      fs.appendFileSync(dest, fs.readFileSync(chunkDest));
      fs.unlinkSync(chunkDest);
    }
    process.stdout.write(`  ${path.basename(dest)} assembled\n`);
  }
}

function parseModels(argv, env) {
  const argFlag = argv.find(a => a.startsWith('--models='));
  const envVal = env.STTTTS_MODELS;
  const raw = argFlag ? argFlag.slice('--models='.length) : envVal;
  if (!raw) return Object.keys(MODEL_GROUPS);
  const requested = raw.split(',').map(s => s.trim()).filter(Boolean);
  const invalid = requested.filter(m => !MODEL_GROUPS[m]);
  if (invalid.length) {
    console.error(`[sttttsmodels] unknown model(s): ${invalid.join(', ')}`);
    console.error(`[sttttsmodels] available: ${Object.keys(MODEL_GROUPS).join(', ')}`);
    process.exit(1);
  }
  return requested;
}

async function main() {
  const selected = parseModels(process.argv.slice(2), process.env);
  for (const name of selected) {
    await downloadGroup(name, MODEL_GROUPS[name]);
  }
  console.log('[sttttsmodels] all models ready.');
}

main().catch((err) => {
  console.error('[sttttsmodels] download failed:', err.message);
  process.exit(1);
});
