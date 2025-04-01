import { generateAnswer } from './inferenceService.js';
import { sendWhatsAppMessage } from './twilioService.js';
import { storeMessage } from './conversationService.js';
import { GuardrailService } from './guardrailsService.js';

export async function regenerateAndSendShorterAnswer(userPhoneNumber, originalUserMessage, context, conversationHistory, longAnswer) {
  console.log(`[Reprocessing] Attempting to regenerate a shorter answer asynchronously for ${userPhoneNumber}...`);

  const summarizationTaskMessage = `Por favor, resuma a seguinte resposta para ter menos de 1000 caracteres, mantendo a informação essencial e o tom original:\n\n"${longAnswer}"`;

  try {
    const shorterAnswerRaw = await generateAnswer(summarizationTaskMessage, null, null);

    let shorterFinalAnswer = '';

    if (!shorterAnswerRaw || shorterAnswerRaw.trim() === '' || shorterAnswerRaw === 'No content available') {
      console.warn("[Reprocessing] Summarization attempt failed via LLM or returned empty. Truncating original answer.");
      shorterFinalAnswer = longAnswer.slice(0, 997) + "..."; // Truncate original as fallback
    } else {
      shorterFinalAnswer = new GuardrailService(shorterAnswerRaw, originalUserMessage).call();
    }

    // Final check on length and handle potential empty string after guardrails
    if (!shorterFinalAnswer || shorterFinalAnswer.trim() === '' || shorterFinalAnswer.length > 1000) {
      console.warn(`[Reprocessing] Summarized/Guardrailed answer still too long (${shorterFinalAnswer?.length || 0}) or empty. Sending truncated original.`);
      // Ensure fallback is set and not empty
      shorterFinalAnswer = longAnswer.slice(0, 997) + "...";
       // If even truncation results in empty, provide a generic message
       if (!shorterFinalAnswer.trim()) {
           shorterFinalAnswer = "Não foi possível processar a resposta longa. Por favor, tente novamente.";
           console.warn("[Reprocessing] Truncated answer was also empty. Using generic fallback.");
       }
    }

    console.log(`[Reprocessing] Sending final shorter/truncated answer (${shorterFinalAnswer.length} chars) to ${userPhoneNumber}.`);
    await storeMessage(userPhoneNumber, shorterFinalAnswer, 'bot');
    await sendWhatsAppMessage(userPhoneNumber, shorterFinalAnswer);
    console.log(`[Reprocessing] Successfully sent shorter/truncated answer to ${userPhoneNumber}.`);

  } catch (error) {
    console.error(`[Reprocessing] Error during answer regeneration for ${userPhoneNumber}:`, error);
    // Optionally send a generic error message to the user as a fallback
    try {
        const fallbackMessage = "Desculpe, ocorreu um erro ao reprocessar sua solicitação longa. Por favor, tente reformular sua pergunta.";
        await sendWhatsAppMessage(userPhoneNumber, fallbackMessage);
    } catch (sendError) {
        console.error(`[Reprocessing] Failed to send fallback error message to ${userPhoneNumber}:`, sendError);
    }
  }
} 