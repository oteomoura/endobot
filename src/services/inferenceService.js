import { togetherAiClient, COMPLETIONS_API_URL } from '../config/togetherAi.js';

const buildSystemPrompt = () => ({
  role: 'system',
  content: `Você é uma assistente especializada em saúde da mulher, com foco em endometriose, dor crônica e condições relacionadas.
            Seu público são mulheres entre 18 e 55 anos que sofrem ou suspeitam sofrer dessas condições.
            Tom: Amigável, acolhedor e acessível, garantindo que qualquer pessoa compreenda suas respostas.
            Formato: Respostas claras, diretas e limitadas a até 1000 caracteres. Não repita a pergunta do usuário a menos que seja explicitamente pedido.
            Seu objetivo é oferecer informações confiáveis, apoio e orientação prática para ajudar essas mulheres a lidarem melhor com sua saúde.`  
})

const buildContextPrompt = (context) => ({
  role: 'assistant',
  content: `Aqui está contexto relevante para a sua resposta:  ${context}`
})

const buildConversationHistoryPrompt = (conversationHistory) => ({
  role: 'assistant',
  content: `Histórico de mensagens para este usuário: ${conversationHistory}`
})

const buildUserPrompt = (userMessage) => ({
  role: 'user',
  content: userMessage
})

export async function generateAnswer(userMessage, context, conversationHistory ) {
  console.log(`[MOCK] generateAnswer called with userMessage: "${userMessage.substring(0, 50)}..."`);

  // *** TEMPORARY MOCK LOGIC ***
  // Check if the user message is the summarization prompt
  if (userMessage.startsWith("Por favor, resuma")) {
      // Simulate successful summarization
      console.log("[MOCK] Simulating successful summarization.");
      // Return a short summary string
      return "Este é um resumo curto da resposta original, com menos de 1000 caracteres.";
      // --- OR ---
      // Simulate failed/still too long summarization (uncomment to test this path)
      // console.log("[MOCK] Simulating failed/long summarization.");
      // return "A ".repeat(1100); // Return another long string
      // --- OR ---
      // Simulate summarization returning null/empty
      // console.log("[MOCK] Simulating null summarization result.");
      // return null;
  }

  // Simulate a long initial response for other messages
  console.log("[MOCK] Simulating a LONG initial response (> 1000 chars).");
  const longString = "Texto longo simulado. ".repeat(100); // Creates a string > 1000 chars
  return longString;
  // *** END TEMPORARY MOCK LOGIC ***

  /* Original code commented out for testing:
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

    return response?.data?.choices?.[0]?.message?.content || 'No content available';  
  } catch (error) {
    console.error('Error generating answer:', error);
    throw error;
  }
  */
}
