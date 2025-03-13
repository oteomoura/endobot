import { supabase } from '../config/supabase.js';

/**
 * Stores a message in the Supabase database.
 * @param {string} userPhoneNumber - The phone number of the user.
 * @param {string} message - The message content.
 * @param {'user' | 'bot'} sender - Who sent the message.
 */
export async function storeMessage(userPhoneNumber, message, sender) {
  try {
    if (!message || message.trim() === "") {
        console.warn(`Skipping empty message from ${userPhoneNumber}`);
        return;
    }

    const { error } = await supabase.from('messages').insert([
      { user_phone_number: userPhoneNumber, message: message, sender: sender }
    ]);

    if (error) throw new Error(`Failed to save message: ${error.message}`);

    console.log(`Stored message: "${message}" (${sender})`);
  } catch (error) {
    console.error('Error storing message:', error.message);
  }
}
