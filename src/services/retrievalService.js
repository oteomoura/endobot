import { supabase } from '../config/supabase.js';

export async function getRelevantDocuments(embedding) {
  try {
    const { data, error } = await supabase.rpc('match_documents', {
      filter: null,
      query_embedding: embedding,
      match_count: 3, // Top 3 relevant documents
    });

    if (error) throw error;
    return data.map(doc => doc.content).join("\n"); // Combine results
  } catch (error) {
    console.error('Error retrieving documents:', error);
    throw error;
  }
}

