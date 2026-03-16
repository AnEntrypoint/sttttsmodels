const path = require('path');

const MODELS_DIR = path.join(__dirname, 'models');
const STT_MODEL_ID = 'onnx-community/whisper-base';
const STT_DIR = path.join(MODELS_DIR, 'stt', STT_MODEL_ID);
const TTS_DIR = path.join(MODELS_DIR, 'tts');
const SPEAKER_DIR = path.join(MODELS_DIR, 'speaker');
const QWEN_MODEL_ID = 'onnx-community/Qwen3.5-0.8B-ONNX';
const QWEN_DIR = path.join(MODELS_DIR, 'qwen', QWEN_MODEL_ID);

module.exports = {
  sttDir: STT_DIR,
  ttsDir: TTS_DIR,
  speakerDir: SPEAKER_DIR,
  modelsDir: MODELS_DIR,
  sttModelId: STT_MODEL_ID,
  qwenModelId: QWEN_MODEL_ID,
  qwenDir: QWEN_DIR,
};
