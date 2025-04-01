import { storeMessage, fetchUserConversationHistory } from '../services/conversationService.js';
import { generateEmbedding } from '../services/embeddingService.js';
import { getRelevantDocuments } from '../services/retrievalService.js';
import { generateAnswer } from '../services/inferenceService.js';
import { sendWhatsAppMessage } from '../services/twilioService.js';
import { GuardrailService } from '../services/guardrailsService.js';
import { handleLongAnswer } from '../services/longAnswerHandlerService.js';
import { findDoctorsByCity, formatDoctorDataForLLM } from '../services/doctorRecommendationService.js';

export async function handleIncomingWhatsAppMessage(req, res) {
  const { Body: userMessage, From: userPhoneNumber } = req.body;
  console.log(`Received message from ${userPhoneNumber}.`);

  let twilioAcknowledged = false;
  let finalMessageToSend = null;
  let messageContentForUser = '';

  try {
    await storeMessage(userPhoneNumber, userMessage, 'user');

    const embedding = await generateEmbedding(userMessage);
    if (!embedding) {
      console.error(`Embedding generation failed for ${userPhoneNumber}.`);
      if (!res.headersSent) { res.send('<Response></Response>'); twilioAcknowledged = true; }
      return;
    }
    const context = await getRelevantDocuments(embedding);
    const conversationHistory = await fetchUserConversationHistory(userPhoneNumber);

    let llmResponse = await generateAnswer(userMessage, context, conversationHistory, null, userPhoneNumber);
    console.log(`LLM action for ${userPhoneNumber}: ${llmResponse?.action}`);

    switch (llmResponse?.action) {
      case 'findDoctorsByCity':
        const city = llmResponse.args?.city;
        if (city) {
          console.log(`Action: Finding doctors in ${city} for ${userPhoneNumber}.`);
          const doctorData = await findDoctorsByCity(city);
          const observation = formatDoctorDataForLLM(doctorData, city);
          console.log(`Observation created for LLM: ${observation}`);

          console.log(`Calling LLM again for synthesis with observation for ${userPhoneNumber}.`);
          const synthesisResponse = await generateAnswer(null, null, conversationHistory, observation, userPhoneNumber);
          console.log(`LLM synthesis response for ${userPhoneNumber}:`, synthesisResponse);

          if (synthesisResponse?.action === 'finalAnswer') {
            llmResponse = synthesisResponse;
          } else {
            console.error(`LLM did not return 'finalAnswer' after observation for ${userPhoneNumber}. Action: ${synthesisResponse?.action}`);
            finalMessageToSend = "Consegui encontrar algumas informações, mas ocorreu um erro ao formatar a resposta final.";
            break;
          }
        } else {
          console.error("LLM 'findDoctorsByCity' action missing city.");
          finalMessageToSend = "Desculpe, não consegui identificar a cidade para buscar médicos.";
          break;
        }

      case 'askUserForLocation':
        if (llmResponse.action === 'askUserForLocation') {
          finalMessageToSend = llmResponse.message || "Por favor, informe a cidade (São Paulo ou Brasília).";
          console.log(`Action: Asking user ${userPhoneNumber} for location.`);
          break;
        }

      case 'finalAnswer':
        const rawAnswer = llmResponse.message;
        if (rawAnswer && rawAnswer.trim() !== '') {
           messageContentForUser = new GuardrailService(rawAnswer, userMessage).call();
           if (messageContentForUser.length > 1000) {
             console.log(`Guardrailed finalAnswer > 1000 chars (${messageContentForUser.length}). Triggering reprocessing.`);
             twilioAcknowledged = await handleLongAnswer(res, userPhoneNumber, userMessage, context, conversationHistory, rawAnswer);
             finalMessageToSend = null;
           } else {
                finalMessageToSend = messageContentForUser;
                console.log(`Final answer length OK (${finalMessageToSend?.length || 0} chars) for ${userPhoneNumber}.`);
           }
        } else {
          console.error(`Action 'finalAnswer' had empty message for ${userPhoneNumber}. LLM Response:`, llmResponse);
          finalMessageToSend = "Desculpe, não consegui gerar uma resposta.";
        }
        break;

      default:
        console.error(`Unexpected LLM action or invalid response structure for ${userPhoneNumber}:`, llmResponse);
        finalMessageToSend = "Não entendi bem. Pode reformular?";
        break;
    }

    if (finalMessageToSend !== null) {
      await storeMessage(userPhoneNumber, finalMessageToSend, 'bot');
      await sendWhatsAppMessage(userPhoneNumber, finalMessageToSend);
      console.log(`Sent final message (Action: ${llmResponse?.action || 'fallback'}) to ${userPhoneNumber}.`);
    }

  } catch (error) {
    console.error(`Error processing query for ${userPhoneNumber}:`, error);
    if (!twilioAcknowledged && !res.headersSent) {
      res.send('<Response></Response>');
      twilioAcknowledged = true;
    }
    try {
      await sendWhatsAppMessage(userPhoneNumber, "Desculpe, ocorreu um erro interno. Tente novamente mais tarde.");
    } catch (sendError) {
      console.error(`Failed to send error message to ${userPhoneNumber}:`, sendError);
    }
  } finally {
    if (!twilioAcknowledged && !res.headersSent) {
      console.log(`Acknowledging Twilio with empty response (finally block) for ${userPhoneNumber}.`);
      res.send('<Response></Response>');
    }
  }
}

