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

    let llmResponse = await generateAnswer(userMessage, context, conversationHistory);
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
          llmResponse = await generateAnswer(userMessage, null, conversationHistory, observation);
          console.log(`LLM synthesis response for ${userPhoneNumber}:`, llmResponse);

          if (llmResponse?.action === 'finalAnswer') {
          } else {
            console.error(`LLM did not return 'finalAnswer' after observation for ${userPhoneNumber}. Action: ${llmResponse?.action}`);
            finalMessageToSend = "Consegui encontrar algumas informações, mas ocorreu um erro ao formatar a resposta final.";
            break;
          }
        } else {
          console.error("LLM 'findDoctorsByCity' action missing city.");
          llmResponse = { action: 'finalAnswer', message: "Desculpe, ocorreu um erro ao buscar médicos." };
        }

      case 'askUserForLocation':
        if(llmResponse.action === 'askUserForLocation') {
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
          console.error(`Action 'finalAnswer' had empty message for ${userPhoneNumber}.`);
          finalMessageToSend = "Desculpe, não consegui gerar uma resposta.";
        }
        break;

      default:
        console.error(`Unexpected LLM action for ${userPhoneNumber}:`, llmResponse?.action);
        messageContentForUser = llmResponse?.message || "Não entendi bem. Pode reformular?";
        finalMessageToSend = new GuardrailService(messageContentForUser, userMessage).call().substring(0, 1000);
        break;
    }

    if (finalMessageToSend !== null) {
      await storeMessage(userPhoneNumber, finalMessageToSend, 'bot');
      await sendWhatsAppMessage(userPhoneNumber, finalMessageToSend);
      console.log(`Sent final message (Action: ${llmResponse?.action || 'fallback'}) to ${userPhoneNumber}.`);
    }

    if (!twilioAcknowledged && !res.headersSent) {
      res.send('<Response></Response>');
      console.log(`Acknowledged Twilio at end for ${userPhoneNumber}.`);
    }

  } catch (error) {
    console.error(`Error processing query for ${userPhoneNumber}:`, error);
    if (!twilioAcknowledged && !res.headersSent) {
      try {
        await sendWhatsAppMessage(userPhoneNumber, "Desculpe, ocorreu um erro inesperado.");
      } catch (sendError) {
        console.error(`Failed to send generic error message to ${userPhoneNumber}:`, sendError);
      } finally {
        if (!res.headersSent) {
          res.send('<Response></Response>');
        }
      }
    } else {
      console.error(`Error occurred for ${userPhoneNumber}, but Twilio response was likely already sent.`);
    }
  }
}
