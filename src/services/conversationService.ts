import { supabase } from '../config/supabase.js';

interface MessageHistoryItem {
  message: string;
  sender: string;
}

function removeWhatsAppPrefix(userPhoneNumber: string): string {
  return userPhoneNumber.startsWith('whatsapp:') ? userPhoneNumber.replace('whatsapp:', '') : userPhoneNumber;
}

export async function fetchUserConversationHistory(userPhoneNumber: string | null, limit: number = 10): Promise<string> {
  if (!userPhoneNumber) {
    console.warn('Null or empty phone number provided to fetchUserConversationHistory');
    return '';
  }

  try {
    const { data: messageHistory, error } = await supabase
      .from('messages')
      .select('message, sender')
      .eq('user_phone_number', removeWhatsAppPrefix(userPhoneNumber))
      .order('created_at', { descending: true }) 
      .limit(limit);

    if (error) throw new Error(`Failed to fetch conversation history: ${error.message}`);
    if (!messageHistory || messageHistory.length === 0) return '';

    // Format history into a structured conversation
    const formattedHistory = (messageHistory as MessageHistoryItem[])
      .map(m => (m.sender === 'user' ? `User: ${m.message}` : `Bot: ${m.message}`))
      .join('\n');

    return formattedHistory;
  } catch (error: any) {
    console.error('❌ Error fetching conversation history:', error.message);
    return ''; // Return empty string if history cannot be retrieved
  }
}

export async function storeMessage(
  userPhoneNumber: string | null, 
  message: string | null, 
  sender: string
): Promise<void> {
  if (!userPhoneNumber) {
    console.warn('Null or empty phone number provided to storeMessage');
    return;
  }

  if (!message || message.trim() === "") {
    console.warn(`Skipping empty message from ${userPhoneNumber}`);
    return;
  }

  try {
    const { error } = await supabase.from('messages').insert([
      { user_phone_number: removeWhatsAppPrefix(userPhoneNumber), message: message, sender: sender }
    ]);

    if (error) throw new Error(`Failed to save message: ${error.message}`);

    console.log(`Stored message: "${message}" (${sender})`);
  } catch (error: any) {
    console.error('Error storing message:', error.message);
  }
} 