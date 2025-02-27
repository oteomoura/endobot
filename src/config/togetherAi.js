import axios from 'axios';

const TOGETHER_AI_KEY = process.env.TOGETHER_AI_API_KEY;
const EMBEDDING_MODEL_URL = 'https://api.together.ai/v1/embeddings';
const INFERENCE_MODEL_URL = 'https://api.together.ai/v1/inference';

export const togetherAiClient = axios.create({
  headers: { Authorization: `Bearer ${TOGETHER_AI_KEY}` },
});

export { EMBEDDING_MODEL_URL, INFERENCE_MODEL_URL };
