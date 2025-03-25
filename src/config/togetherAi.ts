import axios, { AxiosInstance } from 'axios';

// Check if the API key is defined
const TOGETHER_AI_KEY = process.env.TOGETHER_AI_API_KEY;

if (!TOGETHER_AI_KEY) {
  console.error('TOGETHER_AI_API_KEY environment variable is not defined');
  process.exit(1);
}

export const EMBEDDING_MODEL_URL = 'https://api.together.ai/v1/embeddings';
export const COMPLETIONS_API_URL = 'https://api.together.xyz/v1/chat/completions';

// Create a typed axios instance
export const togetherAiClient: AxiosInstance = axios.create({
  headers: {     
    accept: 'application/json',
    'content-type': 'application/json',
    Authorization: `Bearer ${TOGETHER_AI_KEY}` 
  }
}); 