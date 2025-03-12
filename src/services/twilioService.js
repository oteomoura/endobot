import twilio from 'twilio';

const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export async function sendWhatsAppMessage(to, message) {
  try {
    await twilioClient.messages.create({
      body: message,
      from: `${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:${to}`,
    });
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    throw error;
  }
}
