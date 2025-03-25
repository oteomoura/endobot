import twilio from 'twilio';
import messageTemplates from '../config/messageTemplates.js';

const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

interface TwilioPayload {
  from: string;
  to: string;
  body?: string;
  contentSid?: string;
}

interface TwilioError extends Error {
  code?: number;
}

function buildTwilioPayload(userPhoneNumber: string, message: string | null, template?: string): TwilioPayload {
  let twilioPayload: TwilioPayload = {
    from: `${process.env.TWILIO_WHATSAPP_NUMBER}`,
    to: userPhoneNumber,
  }
  
  if (template) {
    twilioPayload.contentSid = messageTemplates[template].sid;
    return twilioPayload;
  }

  twilioPayload.body = message || 'No message available';
  return twilioPayload;
}

async function sendTemplateMessage(userPhoneNumber: string | null, message: string | null, template: string): Promise<boolean> {
  if (!userPhoneNumber) {
    console.error('Cannot send template message: No phone number provided');
    return false;
  }

  try {
    const twilioPayload = buildTwilioPayload(userPhoneNumber, message, template);
    console.log('Twilio payload with template:', twilioPayload);

    const response = await twilioClient.messages.create(twilioPayload);
    console.log('Template twilio payload with template result:', response);

    return true; // Successfully sent
  } catch (error: any) {
    console.error('Failed to send message:', error.message);
    throw error; 
  }
}

export async function sendWhatsAppMessage(userPhoneNumber: string | null, message: string | null): Promise<boolean> {
  if (!userPhoneNumber) {
    console.error('Cannot send WhatsApp message: No phone number provided');
    return false;
  }

  if (!message || message.trim() === '') {
    console.warn('Empty message provided to sendWhatsAppMessage');
    message = 'No message content available';
  }

  try {
    const twilioPayload = buildTwilioPayload(userPhoneNumber, message);
    console.log('Twilio payload:', twilioPayload);

    const response = await twilioClient.messages.create(twilioPayload);
    console.log('Twilio payload result:', response);

    return true; // Successfully sent
  } catch (error: any) {
    console.error('Failed to send message:', error.message);

    if ((error as TwilioError).code === 63016) {
      console.log('Sending template message...')
      return await sendTemplateMessage(userPhoneNumber, message, "welcome") 
    }

    throw error;
  }
} 