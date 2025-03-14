import { supabase } from '../config/supabase.js';

function removeWhatsAppPrefix(userPhoneNumber) {
  return userPhoneNumber.startsWith('whatsapp:') ? userPhoneNumber.replace('whatsapp:', '') : userPhoneNumber;
}

export async function fetchUserConversationHistory(userPhoneNumber, limit = 10) {
  
  try {
    const { data: messageHistory, error } = await supabase
      .from('messages')
      .select('message, sender')
      .eq('user_phone_number', removeWhatsAppPrefix(userPhoneNumber))
      .order('created_at', { descending: true }) 
      .limit(limit);

    if (error) throw new Error(`Failed to fetch conversation history: ${error.message}`);

    // Format history into a structured conversation
    const formattedHistory = messageHistory
      .map(m => (m.sender === 'user' ? `User: ${m.message}` : `Bot: ${m.message}`))
      .join('\n');

    return formattedHistory
  } catch (error) {
    console.error('❌ Error fetching conversation history:', error.message);
    return ''; // Return empty string if history cannot be retrieved
  }
}

export async function storeMessage(userPhoneNumber, message, sender) {
  try {
    if (!message || message.trim() === "") {
        console.warn(`Skipping empty message from ${userPhoneNumber}`);
        return;
    }

    const { error } = await supabase.from('messages').insert([
      { user_phone_number: removeWhatsAppPrefix(userPhoneNumber), message: message, sender: sender }
    ]);

    if (error) throw new Error(`Failed to save message: ${error.message}`);

    console.log(`Stored message: "${message}" (${sender})`);
  } catch (error) {
    console.error('Error storing message:', error.message);
  }
}
