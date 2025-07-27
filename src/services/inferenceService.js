import { togetherAiClient, COMPLETIONS_API_URL } from '../config/togetherAi.js';
import { extractAndParseJson } from '../lib/utils.js';
import { buildSystemPrompt } from './systemPromptService.js';
import { retryWithIncrementalDelays, RETRY_CONFIGS } from './retryService.js';

const buildContextPrompt = (context) => ({
  role: 'system',
  content: `Contexto relevante:\n${context}`
})

const buildConversationHistoryPrompt = (conversationHistory) => ({
  role: 'system',
  content: `Histórico da conversa anterior:\n${conversationHistory}`
})

const buildUserPrompt = (userMessage) => ({
  role: 'user',
  content: userMessage
})

const buildObservationPrompt = (observationContent) => ({
    role: 'tool_result',
    content: observationContent
});

const MAX_CONTEXT_HISTORY_LENGTH = 3000;

export async function generateAnswer(userMessage, context, conversationHistory, observation = null, userPhoneNumber = null) {
  const systemPrompt = buildSystemPrompt();

  let truncatedContext = context;
  let truncatedHistory = conversationHistory;
  const combinedLength = (context?.length || 0) + (conversationHistory?.length || 0);

  if (combinedLength > MAX_CONTEXT_HISTORY_LENGTH) {
    console.warn(`[Inference] Combined context (${context?.length || 0}) and history (${conversationHistory?.length || 0}) length (${combinedLength}) exceeds limit (${MAX_CONTEXT_HISTORY_LENGTH}). Truncating.`);
    const excessLength = combinedLength - MAX_CONTEXT_HISTORY_LENGTH;
    const contextLength = context?.length || 0;

    if (contextLength >= excessLength) {
      truncatedContext = context.slice(0, contextLength - excessLength);
      truncatedHistory = conversationHistory;
    } else {
      truncatedContext = null;
      const historyToRemove = excessLength - contextLength;
      truncatedHistory = conversationHistory?.slice(historyToRemove) || null;
    }
     console.log(`[Inference] Truncated lengths: Context (${truncatedContext?.length || 0}), History (${truncatedHistory?.length || 0})`);
  }

  const contextPrompt = truncatedContext ? buildContextPrompt(truncatedContext) : null;
  const userPrompt = userMessage ? buildUserPrompt(userMessage) : null;
  const conversationHistoryPrompt = truncatedHistory ? buildConversationHistoryPrompt(truncatedHistory) : null;
  const observationPrompt = observation ? buildObservationPrompt(observation) : null;

  console.log("[Inference] Generating structured answer/action...", observation ? "with observation" : "");

  const messages = [
      systemPrompt,
      ...(contextPrompt ? [contextPrompt] : []),
      ...(conversationHistoryPrompt ? [conversationHistoryPrompt] : []),
      ...(observationPrompt ? [observationPrompt] : []),
      ...(userPrompt ? [userPrompt] : [])
  ].filter(Boolean);

  if (messages.length === 0 || messages.every(m => !m.content?.trim())) {
      console.error("[Inference] Message array is effectively empty. Cannot call LLM.");
      return { action: 'finalAnswer', message: 'Desculpe, ocorreu um erro ao preparar sua solicitação.' };
  }

  console.log("[Inference] Messages sent to LLM:", JSON.stringify(messages, null, 2));

  // Define the LLM operation
  const llmOperation = async () => {
    const response = await togetherAiClient.post(COMPLETIONS_API_URL, {
      model: 'meta-llama/Meta-Llama-3.3-70B-Instruct-Turbo',
      response_format: { type: "json_object" },
      messages: messages,
      max_tokens: 500,
      temperature: 0.5,
    });

    const rawResponseContent = response?.data?.choices?.[0]?.message?.content;
    console.log("[Inference] Raw LLM Response:", rawResponseContent);

    if (!rawResponseContent) {
        console.error("[Inference] LLM returned no content.");
        throw new Error('Desculpe, não consegui processar sua solicitação no momento (resposta vazia).');
    }

    const structuredResponse = extractAndParseJson(rawResponseContent);

    if (structuredResponse && structuredResponse.action) {
         console.log("[Inference] Successfully parsed structured response:", structuredResponse);
         return structuredResponse;
    } else {
         console.warn("[Inference] Failed to parse valid JSON action from LLM response. Falling back to finalAnswer.", rawResponseContent);
         const fallbackMessage = rawResponseContent.substring(0, 1000);
         return { action: 'finalAnswer', message: fallbackMessage };
    }
  };

  try {
    // Use the retry service with LLM-specific configuration
    return await retryWithIncrementalDelays(
      llmOperation,
      RETRY_CONFIGS.DEFAULT,
      userPhoneNumber,
      'LLM inference'
    );
  } catch (error) {
    console.error('[Inference] Error calling LLM API:', error.message);
    
    // Handle non-retryable errors
    if (error.response) {
        console.error('[Inference] Error Status:', error.response.status);
        console.error('[Inference] Error Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
        console.error('[Inference] Error Request:', 'No response received');
    } else {
        console.error('[Inference] Error:', error.stack);
    }
    
    // Return a user-friendly error message
    return { 
      action: 'finalAnswer', 
      message: error.message || 'Desculpe, ocorreu um erro inesperado ao gerar a resposta.' 
    };
  }
}
