import { togetherAiClient, COMPLETIONS_API_URL } from '../config/togetherAi.js';
import { extractAndParseJson } from '../lib/utils.js';
import { buildSystemPrompt } from './systemPromptService.js';

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

const buildObservationPrompt = (observationContent) => ({
    role: 'tool_result',
    content: observationContent
});

export async function generateAnswer(userMessage, context, conversationHistory, observation = null) {
  const systemPrompt = buildSystemPrompt();
  const contextPrompt = buildContextPrompt(context);
  const userPrompt = buildUserPrompt(userMessage);
  const conversationHistoryPrompt = buildConversationHistoryPrompt(conversationHistory);
  const observationPrompt = observation ? buildObservationPrompt(observation) : null;

  console.log("[Inference] Generating structured answer/action...", observation ? "with observation" : "");

  const messages = [
      systemPrompt,
      ...(context ? [contextPrompt] : []),
      ...(conversationHistory ? [conversationHistoryPrompt] : []),
      userPrompt,
      ...(observationPrompt ? [observationPrompt] : [])
  ];
  console.log("[Inference] Messages sent to LLM:", JSON.stringify(messages, null, 2));

  try {
    const response = await togetherAiClient.post(COMPLETIONS_API_URL, {
      model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free',
      response_format: { type: "json_object" },
      messages: messages,
      max_tokens: 300,
      temperature: 0.5,
    });

    const rawResponseContent = response?.data?.choices?.[0]?.message?.content;
    console.log("[Inference] Raw LLM Response:", rawResponseContent);

    if (!rawResponseContent) {
        console.error("[Inference] LLM returned no content.");
        return { action: 'finalAnswer', message: 'Desculpe, não consegui processar sua solicitação no momento.' };
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
    console.error('[Inference] Error calling LLM API:', error);
    return { action: 'finalAnswer', message: 'Desculpe, ocorreu um erro ao gerar la resposta.' };
  }
}
