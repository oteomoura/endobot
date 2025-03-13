import { supabase } from '../config/supabase.js';

export async function fetchUserConversationHistory(userPhoneNumber, limit = 5) {
  try {
    const { data: messageHistory, error } = await supabase
      .from('messages')
      .select('message, sender')
      .eq('user_phone_number', userPhoneNumber)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw new Error(`Failed to fetch conversation history: ${error.message}`);

    // Format history into a structured conversation
    return messageHistory
      .map(m => `${m.sender === 'user' ? 'User' : 'Bot'}: ${m.message}`)
      .reverse() // Ensure chronological order
      .join('\n');
  } catch (error) {
    console.error('❌ Error fetching conversation history:', error.message);
    return ''; // Return empty string if history cannot be retrieved
  }
}
