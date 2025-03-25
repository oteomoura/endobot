import { togetherAiClient, COMPLETIONS_API_URL } from '../config/togetherAi.js';

interface ChatMessage {
  role: string;
  content: string;
}

const buildSystemPrompt = (): ChatMessage => ({
  role: 'system',
  content: `Você é uma assistente especializada em saúde da mulher, com foco em endometriose, dor crônica e condições relacionadas.
            Seu público são mulheres entre 18 e 55 anos que sofrem ou suspeitam sofrer dessas condições.
            Tom: Amigável, acolhedor e acessível, garantindo que qualquer pessoa compreenda suas respostas.
            Restrições: Responda apenas perguntas dentro do tema. Se algo fugir muito desse escopo, oriente a pessoa a buscar um profissional adequado.
            Formato: Respostas claras, diretas e com até 1000 caracteres. Não repita a pergunta do usuário a menos que seja explicitamente pedido.
            Seu objetivo é oferecer informações confiáveis, apoio e orientação prática para ajudar essas mulheres a lidarem melhor com sua saúde.`  
})

const buildContextPrompt = (context: string | null): ChatMessage => ({
  role: 'assistant',
  content: `Aqui está contexto relevante para a sua resposta:  ${context || 'Sem contexto disponível'}`
})

const buildConversationHistoryPrompt = (conversationHistory: string | null): ChatMessage => ({
  role: 'assistant',
  content: `Histórico de mensagens para este usuário: ${conversationHistory || 'Sem histórico disponível'}`
})

const buildUserPrompt = (userMessage: string): ChatMessage => ({
  role: 'user',
  content: userMessage
})

export async function generateAnswer(
  userMessage: string, 
  context: string | null = null, 
  conversationHistory: string | null = null
): Promise<string | null> {
  if (!userMessage || userMessage.trim() === '') {
    console.warn('Empty user message provided to generateAnswer');
    return null;
  }

  const systemPrompt = buildSystemPrompt();
  const contextPrompt = buildContextPrompt(context);
  const userPrompt = buildUserPrompt(userMessage);
  const conversationHistoryPrompt = buildConversationHistoryPrompt(conversationHistory);

  try {
    const response = await togetherAiClient.post(COMPLETIONS_API_URL, {
      model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free',
      context_length_exceeded_behavior: 'error',
      messages: [systemPrompt, userPrompt, contextPrompt, conversationHistoryPrompt]
    });

    return response?.data?.choices?.[0]?.message?.content || null;  
  } catch (error: any) {
    console.error('Error generating answer:', error);
    throw error;
  }
} 