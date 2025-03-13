import twilio from 'twilio';
import messageTemplates from '../config/messageTemplates.js';

const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

function buildTwilioPayload (userPhoneNumber, message, template) {
  let twilioPayload = {
    messagingServiceSid: `${process.env.MESSAGING_SERVICE_SID}`,
    to: userPhoneNumber,
  }
  
  if (template) {
    twilioPayload.contentSid = messageTemplates[template].sid;
    return twilioPayload;
  }

  twilioPayload.body = message;
  return twilioPayload;
}

export async function sendTemplateMessage(userPhoneNumber, message, template) {
  try {
    const twilioPayload = buildTwilioPayload(userPhoneNumber, message, template);
    console.log('Twilio payload with template:', twilioPayload);

    const response = await twilioClient.messages.create(twilioPayload);
    console.log('Template twilio payload with template result:', response);

    return true; // Successfully sent
  } catch (error) {
    console.error('Failed to send message:', error.message);
    throw error; 
  }
}

export async function sendWhatsAppMessage(userPhoneNumber, message) {
  try {
    const twilioPayload = buildTwilioPayload(userPhoneNumber, message);
    console.log('Twilio payload:', twilioPayload);

    const response = await twilioClient.messages.create(twilioPayload);
    console.log('Twilio payload result:', response);

    return true; // Successfully sent
  } catch (error) {
    console.error('Failed to send message:', error.message);

    if (error.code === 63016) {
      console.log('Sending template message...')
      return await sendTemplateMessage(userPhoneNumber, message, "welcome") 
    }

    throw error;
  }
}



