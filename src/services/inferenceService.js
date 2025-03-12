import { togetherAiClient, COMPLETIONS_API_URL } from '../config/togetherAi.js';

const buildSystemPrompt = () => ({
  role: 'system',
  content: `Você é uma assistente de saúde expert em endometriose, 
  saúde da mulher e dor cronica. Você vai interagir com mulheres entre 18 e 55 anos, 
  que sofrem ou desconfiam sofrer de Endometriose, dor crônica ou outras doenças 
  relacionadas. O seu tom deve ser amigável e de fácil compreensão. 
  Não responda a perguntas que não sejam relacionadas a endometriose, 
  dor crônica ou saúde da mulher.`  
})

const buildAssistantPrompt = (context) => ({
  role: 'assistant',
  content: `Aqui está contexto relevante para a sua resposta:  ${context}`
})

const buildUserPrompt = (userMessage) => ({
  role: 'user',
  content: userMessage
})

export async function generateAnswer(context, userMessage) {
  const systemPrompt = buildSystemPrompt();
  const assistantPrompt = buildAssistantPrompt(context);
  const userPrompt = buildUserPrompt(userMessage);
  
  try {
    const response = await togetherAiClient.post(COMPLETIONS_API_URL, {
      model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free',
      context_length_exceeded_behavior: 'error',
      messages: [systemPrompt, assistantPrompt, userPrompt]
    });

    return response?.data?.choices?.[0]?.message?.content || 'No content available';  
  } catch (error) {
    console.error('Error generating answer:', error);
    throw error;
  }
}
