import { togetherAiClient, EMBEDDING_MODEL_URL } from '../config/togetherAi.js';
import { retryWithIncrementalDelays, RETRY_CONFIGS } from './retryService.js';

const buildEmbeddingQueryPayload = (text) => {
  return {
    input: text,
    model: "BAAI/bge-large-en-v1.5",
  }
}

export async function generateEmbedding(text, userPhoneNumber = null) {
  // Define the embedding operation
  const embeddingOperation = async () => {
    const payload = buildEmbeddingQueryPayload(text);
    const response = await togetherAiClient.post(EMBEDDING_MODEL_URL, payload);
    const embedding = response?.data?.data?.[0]?.embedding;
    
    if (!embedding) {
      throw new Error('Failed to generate embedding: No embedding data received');
    }
    
    return embedding;
  };

  try {
    // Use the retry service with embedding-specific configuration
    return await retryWithIncrementalDelays(
      embeddingOperation,
      RETRY_CONFIGS.EMBEDDING,
      userPhoneNumber,
      'embedding generation'
    );
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}
