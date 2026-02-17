const path = require('path');

const MODELS_DIR = path.join(__dirname, 'models');
const STT_MODEL_ID = 'onnx-community/whisper-base';
const STT_DIR = path.join(MODELS_DIR, 'stt', STT_MODEL_ID);
const TTS_DIR = path.join(MODELS_DIR, 'tts');
const SPEAKER_DIR = path.join(MODELS_DIR, 'speaker');

module.exports = {
  sttDir: STT_DIR,
  ttsDir: TTS_DIR,
  speakerDir: SPEAKER_DIR,
  modelsDir: MODELS_DIR,
  sttModelId: STT_MODEL_ID,
};
