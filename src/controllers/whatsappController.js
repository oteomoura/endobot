import { storeMessage, fetchUserConversationHistory } from '../services/conversationService.js';
import { generateEmbedding } from '../services/embeddingService.js';
import { getRelevantDocuments } from '../services/retrievalService.js';
import { generateAnswer } from '../services/inferenceService.js';
import { sendWhatsAppMessage } from '../services/twilioService.js';
import { GuardrailService } from '../services/guardrailsService.js';
import { handleLongAnswer } from '../services/longAnswerHandlerService.js';
import { findDoctorsByCity, formatDoctorList } from '../services/doctorRecommendationService.js';

export async function handleIncomingWhatsAppMessage(req, res) {
  const { Body: userMessage, From: userPhoneNumber } = req.body;
  console.log(`Received message from ${userPhoneNumber}.`);

  let twilioAcknowledged = false;

  try {
    await storeMessage(userPhoneNumber, userMessage, 'user');

    // Generate context for LLM
    const embedding = await generateEmbedding(userMessage);
    if (!embedding) {
      console.error(`Embedding generation failed for ${userPhoneNumber}.`);
      if (!res.headersSent) { res.send('<Response></Response>'); twilioAcknowledged = true; }
      return;
    }
    const context = await getRelevantDocuments(embedding);
    const conversationHistory = await fetchUserConversationHistory(userPhoneNumber);

    // Get structured action/response from LLM
    const llmResponse = await generateAnswer(userMessage, context, conversationHistory);
    console.log(`LLM action for ${userPhoneNumber}: ${llmResponse?.action}`);

    let finalMessageToSend = null;

    // Execute based on LLM action
    switch (llmResponse?.action) {
      case 'findDoctorsByCity':
        const city = llmResponse.args?.city;
        if (city) {
          const doctorData = await findDoctorsByCity(city);
          finalMessageToSend = formatDoctorList(doctorData, city);
        } else {
          console.error("LLM 'findDoctorsByCity' action missing city.");
          finalMessageToSend = "Desculpe, ocorreu um erro ao buscar médicos.";
        }
        break;

      case 'askUserForLocation':
        finalMessageToSend = llmResponse.message || "Por favor, informe a cidade (São Paulo ou Brasília).";
        break;

      case 'finalAnswer':
        const initialAnswer = llmResponse.message;
        if (initialAnswer && initialAnswer.trim() !== '') {
          let finalAnswer = new GuardrailService(initialAnswer, userMessage).call();
          if (finalAnswer.length > 1000) {
            // Handle long answer (sends notification, triggers background job)
            twilioAcknowledged = await handleLongAnswer(res, userPhoneNumber, userMessage, context, conversationHistory, initialAnswer);
            finalMessageToSend = null; // Background job sends the message
          } else {
            finalMessageToSend = finalAnswer; // OK to send directly
          }
        } else {
          console.error(`LLM 'finalAnswer' action had empty message for ${userPhoneNumber}.`);
          finalMessageToSend = "Desculpe, não consegui gerar uma resposta.";
        }
        break;

      default:
        // Handle unexpected/missing action
        console.error(`Unexpected LLM action for ${userPhoneNumber}:`, llmResponse?.action);
        finalMessageToSend = llmResponse?.message || "Não entendi bem. Pode reformular?";
        finalMessageToSend = new GuardrailService(finalMessageToSend, userMessage).call().substring(0, 1000); // Apply basic cleanup
        break;
    }

    // Send the final message if one was determined directly
    if (finalMessageToSend !== null) {
      await storeMessage(userPhoneNumber, finalMessageToSend, 'bot');
      await sendWhatsAppMessage(userPhoneNumber, finalMessageToSend);
    }

    // Acknowledge Twilio if not already done
    if (!twilioAcknowledged && !res.headersSent) {
      res.send('<Response></Response>');
    }

  } catch (error) {
    console.error(`Error processing query for ${userPhoneNumber}:`, error);
    // Attempt to send error message and acknowledge Twilio if safe
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
