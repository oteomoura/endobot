import { generateEmbedding } from '../services/embeddingService.js';
import { getRelevantDocuments } from '../services/retrievalService.js';
import { generateAnswer } from '../services/inferenceService.js';
import { sendWhatsAppMessage } from '../services/twilioService.js';
import { storeMessage } from '../services/messageHistoryService.js';

export async function handleIncomingWhatsAppMessage(req, res) {
  const { Body: userMessage, From: userPhoneNumber } = req.body;
  console.log(`Received WhatsApp message: ${userMessage} from: ${userPhoneNumber}`);

  try {
    await storeMessage(userPhoneNumber, userMessage, 'user');

    const embedding = await generateEmbedding(userMessage);
    const context = await getRelevantDocuments(embedding);
    const answer = await generateAnswer(context, userMessage);
   
    await storeMessage(userPhoneNumber, answer, 'bot');

    await sendWhatsAppMessage(userPhoneNumber, answer);
    res.send('<Response></Response>'); // Required by Twilio
  } catch (error) {
    console.error('Error processing WhatsApp query:', error);
    res.status(500).send('Internal Server Error');
  }
}
