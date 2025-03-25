import { supabase } from '../config/supabase.js';

interface DocumentMatch {
  content: string;
  similarity: number;
  id: string;
}

export async function getRelevantDocuments(embedding: number[]): Promise<string> {
  try {
    const { data, error } = await supabase.rpc('match_documents', {
      filter: null,
      query_embedding: embedding,
      match_count: 3, // Top 3 relevant documents
    });

    if (error) throw error;
    return (data as DocumentMatch[]).map(doc => doc.content).join("\n"); // Combine results
  } catch (error: any) {
    console.error('Error retrieving documents:', error);
    throw error;
  }
} 