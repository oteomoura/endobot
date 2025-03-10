import { togetherAiClient, EMBEDDING_MODEL_URL } from '../config/togetherAi.js';

const buildEmbeddingQueryPayload = (text) => {
  return {
    input: text,
    model: "BAAI/bge-large-en-v1.5",
  }
}

export async function generateEmbedding(text) {
  try {
    const payload = buildEmbeddingQueryPayload(text)
    const response = await togetherAiClient.post(EMBEDDING_MODEL_URL, payload);
    return response?.data?.data?.[0]?.embedding ?? null; // Expecting an array of numbers
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}
