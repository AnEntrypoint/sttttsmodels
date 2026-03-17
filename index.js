const path = require('path');

const MODELS_DIR = path.join(__dirname, 'models');

const MODELS = {
  stt: {
    modelId: 'onnx-community/whisper-base',
    dir: path.join(MODELS_DIR, 'stt', 'onnx-community/whisper-base'),
    files: ['config.json','preprocessor_config.json','tokenizer.json','tokenizer_config.json','vocab.json','merges.txt','onnx/encoder_model.onnx','onnx/decoder_model_merged_q4.onnx','onnx/decoder_model_merged.onnx'],
  },
  tts: {
    modelId: 'pocket-tts-onnx',
    dir: path.join(MODELS_DIR, 'tts'),
    files: ['mimi_encoder.onnx','text_conditioner.onnx','flow_lm_main_int8.onnx','flow_lm_flow_int8.onnx','mimi_decoder_int8.onnx','tokenizer.model'],
  },
  speaker: {
    modelId: 'speaker-embedding',
    dir: path.join(MODELS_DIR, 'speaker'),
    files: ['embedding_model.ckpt','classifier.ckpt','mean_var_norm_emb.ckpt','hyperparams.yaml'],
  },
  qwen: {
    modelId: 'onnx-community/Qwen3.5-0.8B-ONNX',
    dir: path.join(MODELS_DIR, 'qwen', 'onnx-community/Qwen3.5-0.8B-ONNX'),
    files: ['config.json','generation_config.json','tokenizer.json','tokenizer_config.json','onnx/embed_tokens_q4.onnx','onnx/embed_tokens_q4.onnx_data','onnx/decoder_model_merged_q4.onnx','onnx/decoder_model_merged_q4.onnx_data'],
  },
};

module.exports = {
  modelsDir: MODELS_DIR,
  models: MODELS,
  stt: MODELS.stt,
  tts: MODELS.tts,
  speaker: MODELS.speaker,
  qwen: MODELS.qwen,
  sttDir: MODELS.stt.dir,
  ttsDir: MODELS.tts.dir,
  speakerDir: MODELS.speaker.dir,
  qwenDir: MODELS.qwen.dir,
  sttModelId: MODELS.stt.modelId,
  qwenModelId: MODELS.qwen.modelId,
};
