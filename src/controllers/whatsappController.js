import { storeMessage, fetchUserConversationHistory } from '../services/conversationService.js';
import { generateEmbedding } from '../services/embeddingService.js';
import { getRelevantDocuments } from '../services/retrievalService.js';
import { generateAnswer } from '../services/inferenceService.js';
import { sendWhatsAppMessage } from '../services/twilioService.js';
import { GuardrailService } from '../services/guardrailsService.js';
import { regenerateAndSendShorterAnswer } from '../services/answerProcessingService.js';

async function _handleLongAnswer(res, userPhoneNumber, userMessage, context, conversationHistory, initialAnswer) {
  console.log(`Answer potentially too long (${initialAnswer.length} chars estimated). Triggering reprocessing.`);

  try {
    await sendWhatsAppMessage(userPhoneNumber, "Sua resposta está sendo processada e pode levar um pouco mais de tempo. Agradeço a paciência!");
    console.log(`Sent 'processing' notification to ${userPhoneNumber}.`);
  } catch (sendError) {
    console.error(`Failed to send processing message to ${userPhoneNumber}:`, sendError);
  }

  if (!res.headersSent) {
      res.send('<Response></Response>');
      console.log("Acknowledged Twilio while handling long answer.");
  } else {
      console.warn("Headers already sent before acknowledging Twilio in _handleLongAnswer.");
  }

  regenerateAndSendShorterAnswer(userPhoneNumber, userMessage, context, conversationHistory, initialAnswer)
    .then(() => {
        console.log(`Background reprocessing initiated successfully for ${userPhoneNumber}.`);
    })
    .catch(reprocessingError => {
        console.error(`Unhandled error during background answer reprocessing for ${userPhoneNumber}:`, reprocessingError);
    });
}

export async function handleIncomingWhatsAppMessage(req, res) {
  const { Body: userMessage, From: userPhoneNumber } = req.body;
  console.log(`Received WhatsApp message: "${userMessage}" from: ${userPhoneNumber}`);

  let twilioAcknowledged = false;

  try {
    await storeMessage(userPhoneNumber, userMessage, 'user');
    console.log(`Stored user message from ${userPhoneNumber}.`);

    const embedding = await generateEmbedding(userMessage);
    if (!embedding) {
        console.error(`Failed to generate embedding for the message from ${userPhoneNumber}.`);
        if (!res.headersSent) {
            res.send('<Response></Response>');
            twilioAcknowledged = true;
        }
        return;
    }
    console.log(`Generated embedding for ${userPhoneNumber}.`);
    const context = await getRelevantDocuments(embedding);
    console.log(`Retrieved relevant documents for ${userPhoneNumber}.`);
    const conversationHistory = await fetchUserConversationHistory(userPhoneNumber);
    console.log(`Fetched conversation history for ${userPhoneNumber}.`);

    const initialAnswer = await generateAnswer(userMessage, context, conversationHistory);
    console.log(`Generated initial LLM answer for ${userPhoneNumber}. Length: ${initialAnswer?.length}`);

    if (!initialAnswer || initialAnswer.trim() === '' || initialAnswer === 'No content available') {
        console.error(`LLM did not return a valid answer for ${userPhoneNumber}.`);
        await sendWhatsAppMessage(userPhoneNumber, "Desculpe, não consegui gerar uma resposta no momento. Tente reformular sua pergunta.");
         if (!res.headersSent) {
            res.send('<Response></Response>');
            twilioAcknowledged = true;
         }
        return;
    }

    let finalAnswer = new GuardrailService(initialAnswer, userMessage).call();
    console.log(`Applied guardrails. Final answer length: ${finalAnswer.length} for ${userPhoneNumber}.`);

    if (finalAnswer.length > 1000) {
      await _handleLongAnswer(res, userPhoneNumber, userMessage, context, conversationHistory, initialAnswer);
      twilioAcknowledged = true;
    } else {
      console.log(`Answer length OK (${finalAnswer.length} chars). Storing and sending response to ${userPhoneNumber}.`);
      await storeMessage(userPhoneNumber, finalAnswer, 'bot');
      await sendWhatsAppMessage(userPhoneNumber, finalAnswer);
      if (!res.headersSent) {
          res.send('<Response></Response>');
          twilioAcknowledged = true;
      } else {
           console.warn(`Headers already sent before final Twilio acknowledgement for ${userPhoneNumber}.`);
      }
    }

  } catch (error) {
    console.error(`Error processing WhatsApp query for ${userPhoneNumber}:`, error);
    if (!twilioAcknowledged && !res.headersSent) {
        try {
            await sendWhatsAppMessage(userPhoneNumber, "Desculpe, ocorreu um erro inesperado ao processar sua solicitação.");
            console.log(`Sent generic error message to ${userPhoneNumber}.`);
        } catch (sendError) {
            console.error(`Failed to send generic error message to ${userPhoneNumber}:`, sendError);
        } finally {
             if (!res.headersSent) {
                res.send('<Response></Response>');
                console.log(`Acknowledged Twilio after main catch block for ${userPhoneNumber}.`);
             }
        }
    } else {
        console.error(`Error occurred for ${userPhoneNumber}, but Twilio response was likely already sent.`);
    }
  }
}
