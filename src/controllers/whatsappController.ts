import { Request, Response } from 'express';
import { storeMessage, fetchUserConversationHistory } from '../services/conversationService.js';
import { generateEmbedding } from '../services/embeddingService.js';
import { getRelevantDocuments } from '../services/retrievalService.js';
import { generateAnswer } from '../services/inferenceService.js';
import { sendWhatsAppMessage } from '../services/twilioService.js';
import { GuardrailService } from '../services/guardrailsService.js';
import { logMain } from "../lib/logger.js";

// Define interfaces for Twilio's webhook request body
interface TwilioWhatsAppMessageBody {
  Body: string;       // The message content
  From: string;       // The sender's phone number (with WhatsApp prefix)
  // Other Twilio fields can be added as needed
}

// Extend Express Request to include Twilio's body structure
interface WhatsAppRequest extends Request {
  body: TwilioWhatsAppMessageBody;
}

/**
 * Handles incoming WhatsApp messages from Twilio
 * Processes the message using RAG (Retrieval Augmented Generation)
 * @param req - Express request with Twilio WhatsApp message data
 * @param res - Express response
 */
export async function handleIncomingWhatsAppMessage(
  req: WhatsAppRequest, 
  res: Response
): Promise<void> {
  const { Body: userMessage, From: userPhoneNumber } = req.body;
  logMain(`Received WhatsApp message: ${userMessage} from: ${userPhoneNumber}`);

  try {
    // await storeMessage(userPhoneNumber, userMessage, 'user');

    const embedding = await generateEmbedding(userMessage);
    logMain(embedding);
    
    if (!embedding) {
      console.warn('Failed to generate embedding');
      res.send('<Response></Response>'); // Required by Twilio
      return;
    }

    const context = await getRelevantDocuments(embedding);
    logMain(context);

    const conversationHistory = await fetchUserConversationHistory(userPhoneNumber);
    const answer = await generateAnswer(userMessage, context, conversationHistory);
    logMain(answer);
    
    const finalAnswer = new GuardrailService(answer, userMessage).call(); //checks dangerous content  
    logMain(finalAnswer);

    // await storeMessage(userPhoneNumber, finalAnswer, 'bot');

    // await sendWhatsAppMessage(userPhoneNumber, finalAnswer);
    res.send('<Response></Response>'); // Required by Twilio
  } catch (error) {
    console.error('Error processing WhatsApp query:', error instanceof Error ? error.message : String(error));
    res.status(500).send('Internal Server Error');
  }
} 