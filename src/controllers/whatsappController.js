import { generateEmbedding } from '../services/embeddingService.js';
import { getRelevantDocuments } from '../services/retrievalService.js';
import { generateAnswer } from '../services/inferenceService.js';
import { sendWhatsAppMessage } from '../services/twilioService.js';

export async function handleIncomingWhatsAppMessage(req, res) {
  const { Body, From } = req.body;
  console.log(`Received WhatsApp message: ${Body} from: ${From}`);

  try {
    // Generate embedding for the user query
    const queryEmbedding = await generateEmbedding(Body);

    // Retrieve domain-specific knowledge from Supabase
    const context = await getRelevantDocuments(queryEmbedding);

    // Construct the prompt for the inference model
    const prompt = `Here is some relevant context:\n${context}\n\nUser Query: ${Body}\n\nAnswer:`;

    // Get the generated answer from the LLM
    const answer = await generateAnswer(prompt);

    // Send the generated answer back to the user
    await sendWhatsAppMessage(From, answer);

    console.log('Sent message:', answer);
    res.send('<Response></Response>'); // Required by Twilio
  } catch (error) {
    console.error('Error processing WhatsApp query:', error);
    res.status(500).send('Internal Server Error');
  }
}
