// server.js
import express from 'express';
import bodyParser from 'body-parser';
import twilio from 'twilio';

const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse incoming body data
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Twilio webhook endpoint for WhatsApp
app.post('/whatsapp', (req, res) => {
  // Extract message data from the incoming webhook
  const { Body, From } = req.body;

  // Log incoming message for debugging
  console.log(`Received message: ${Body} from: ${From}`);

  // Respond with a "Hello, World!" message
  const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

  twilioClient.messages.create({
    body: 'Olá do Endopolítica!',
    from: 'whatsapp:+14155238886', 
    to: From  // Send the reply to the same phone number that sent the message
  })
  .then((message) => {
    console.log('Sent message: ', message.sid);
    res.send('<Response></Response>');  // Twilio requires an empty response
  })
  .catch((error) => {
    console.error('Error sending message:', error);
    res.status(500).send('Internal Server Error');
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
