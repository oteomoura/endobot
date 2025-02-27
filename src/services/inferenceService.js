import { togetherAiClient, INFERENCE_MODEL_URL } from '../config/togetherAi.js';

export async function generateAnswer(prompt) {
  try {
    const response = await togetherAiClient.post(INFERENCE_MODEL_URL, {
      prompt,
      max_tokens: 150,
    });

    return response.data.choices[0].text.trim();
  } catch (error) {
    console.error('Error generating answer:', error);
    throw error;
  }
}
