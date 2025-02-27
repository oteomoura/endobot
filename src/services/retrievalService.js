import { supabase } from '../config/supabase.js';

export async function getRelevantDocuments(queryEmbedding) {
  try {
    const { data, error } = await supabase.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_count: 3, // Top 3 relevant documents
    });

    if (error) throw error;
    return data.map(doc => doc.text).join("\n"); // Combine results
  } catch (error) {
    console.error('Error retrieving documents:', error);
    throw error;
  }
}

