import { togetherAiClient, COMPLETIONS_API_URL } from '../config/togetherAi.js';

const buildSystemPrompt = () => ({
  role: 'system',
  content: `Você é uma assistente especializada em saúde da mulher, com foco em endometriose, dor crônica e condições relacionadas.
            Seu público são mulheres entre 18 e 55 anos que sofrem ou suspeitam sofrer dessas condições.
            Tom: Amigável, acolhedor e acessível, garantindo que qualquer pessoa compreenda suas respostas.
            Restrições: Responda apenas perguntas dentro do tema. Se algo fugir muito desse escopo, oriente a pessoa a buscar um profissional adequado.
            Formato: Respostas claras, diretas e com até 1000 caracteres.
            Seu objetivo é oferecer informações confiáveis, apoio e orientação prática para ajudar essas mulheres a lidarem melhor com sua saúde.`  
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
