import axios from 'axios';

const TOGETHER_AI_KEY = process.env.TOGETHER_AI_API_KEY;
const EMBEDDING_MODEL_URL = 'https://api.together.ai/v1/embeddings';
const COMPLETIONS_API_URL = 'https://api.together.xyz/v1/chat/completions';

export const togetherAiClient = axios.create({
  headers: {     
    accept: 'application/json',
    'content-type': 'application/json',
    Authorization: `Bearer ${TOGETHER_AI_KEY}` 
  }
});

export { EMBEDDING_MODEL_URL, COMPLETIONS_API_URL };
