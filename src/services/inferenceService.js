import { togetherAiClient, COMPLETIONS_API_URL } from '../config/togetherAi.js';
import { extractAndParseJson } from '../lib/utils.js';
import { buildSystemPrompt } from './systemPromptService.js';
import { sendWhatsAppMessage } from './twilioService.js';

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

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1500;
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
  const userPrompt = buildUserPrompt(userMessage);
  const conversationHistoryPrompt = truncatedHistory ? buildConversationHistoryPrompt(truncatedHistory) : null;
  const observationPrompt = observation ? buildObservationPrompt(observation) : null;

  console.log("[Inference] Generating structured answer/action...", observation ? "with observation" : "");

  const messages = [
      systemPrompt,
      ...(contextPrompt ? [contextPrompt] : []),
      ...(conversationHistoryPrompt ? [conversationHistoryPrompt] : []),
      ...(observationPrompt ? [observationPrompt] : []),
      userPrompt
  ].filter(Boolean);

  console.log("[Inference] Messages sent to LLM:", JSON.stringify(messages, null, 2));

  let retries = 0;
  let currentBackoff = INITIAL_BACKOFF_MS;
  let retryNotificationSent = false;

  while (retries <= MAX_RETRIES) {
    try {
      const response = await togetherAiClient.post(COMPLETIONS_API_URL, {
        model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free',
        response_format: { type: "json_object" },
        messages: messages,
        max_tokens: 500,
        temperature: 0.5,
      });

      const rawResponseContent = response?.data?.choices?.[0]?.message?.content;
      console.log("[Inference] Raw LLM Response:", rawResponseContent);

      if (!rawResponseContent) {
          console.error("[Inference] LLM returned no content.");
          return { action: 'finalAnswer', message: 'Desculpe, não consegui processar sua solicitação no momento (resposta vazia).' };
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

    } catch (error) {
      if (error.response && error.response.status === 429) {
        retries++;
        if (retries > MAX_RETRIES) {
          console.error(`[Inference] Max retries (${MAX_RETRIES}) exceeded for 429 error.`);
          return { action: 'finalAnswer', message: 'O serviço está sobrecarregado no momento. Por favor, tente novamente em alguns instantes.' };
        }

        const retryAfterSeconds = error.response.headers['retry-after'] ? parseInt(error.response.headers['retry-after'], 10) : null;
        let waitTimeMs = currentBackoff;

        if (retryAfterSeconds && !isNaN(retryAfterSeconds)) {
            waitTimeMs = (retryAfterSeconds * 1000) + Math.random() * 500;
            console.warn(`[Inference] Received 429. Retrying after server-specified ${retryAfterSeconds}s (waiting ~${waitTimeMs.toFixed(0)}ms). Retry ${retries}/${MAX_RETRIES}.`);
            currentBackoff = Math.max(INITIAL_BACKOFF_MS, waitTimeMs);
        } else {
            console.warn(`[Inference] Received 429. Retrying after ${waitTimeMs.toFixed(0)}ms (exponential backoff). Retry ${retries}/${MAX_RETRIES}.`);
            currentBackoff = Math.min(currentBackoff * 2, 30000);
        }

        if (!retryNotificationSent && userPhoneNumber) {
          console.log(`[Inference] Sending retry notification to ${userPhoneNumber}.`);
          try {
            await sendWhatsAppMessage(userPhoneNumber, "Estou processando sua solicitação. Pode levar um pouco mais de tempo que o esperado devido ao alto volume. Agradeço a paciência!");
            retryNotificationSent = true;
          } catch (notificationError) {
            console.error(`[Inference] Failed to send retry notification to ${userPhoneNumber}:`, notificationError);
          }
        }

        await delay(waitTimeMs);

      } else {
        console.error('[Inference] Error calling LLM API (non-429 or other error):', error.message);
         if (error.response) {
             console.error('[Inference] Error Status:', error.response.status);
             console.error('[Inference] Error Data:', JSON.stringify(error.response.data, null, 2));
         } else if (error.request) {
             console.error('[Inference] Error Request:', 'No response received');
         } else {
             console.error('[Inference] Error:', error.stack);
         }
        return { action: 'finalAnswer', message: 'Desculpe, ocorreu um erro inesperado ao gerar a resposta.' };
      }
    }
  }
   console.error("[Inference] Exited retry loop unexpectedly or after max retries.");
   return { action: 'finalAnswer', message: 'Desculpe, ocorreu um erro após múltiplas tentativas de contato com o serviço.' };
}
