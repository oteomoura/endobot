import { togetherAiClient, EMBEDDING_MODEL_URL } from '../config/togetherAi.js';

export async function generateEmbedding(text) {
  try {
    const response = await togetherAiClient.post(EMBEDDING_MODEL_URL, { text });
    return response.data.embedding; // Expecting an array of numbers
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}
