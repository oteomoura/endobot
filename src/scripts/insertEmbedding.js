import fs from 'fs/promises';
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { generateEmbedding } from '../services/embeddingService.js';
import { supabase } from '../config/supabase.js';
import { env, pipeline } from '@huggingface/transformers';

// Ensure transformers uses the correct cache
process.env.TRANSFORMERS_CACHE = process.env.TRANSFORMERS_CACHE || "/root/.cache/huggingface";

// Ensure Hugging Face transformers use the local model
env.allowRemoteModels = false; 
env.allowLocalModels = true;  
env.localModelPath = `${process.env.TRANSFORMERS_CACHE}/hub/BAAI_bge-large-en-v1.5`;

// Load the model explicitly
const tokenizer = await pipeline("feature-extraction", env.localModelPath);

async function chunkTextWithTokens(text, maxTokens = 1000, overlapTokens = 50) {
  // Tokenize input
  const tokens = await tokenizer.tokenizer(text);
  const inputIds = tokens.input_ids;

  const chunks = [];
  let start = 0;

  while (start < inputIds.length) {
    const end = Math.min(start + maxTokens, inputIds.length);
    const chunkTokens = inputIds.slice(start, end);

    // Convert tokens back to text
    const chunkText = tokenizer.tokenizer.decode(chunkTokens, { skip_special_tokens: true });
    chunks.push(chunkText);

    start += maxTokens - overlapTokens; // Move forward with overlap
  }

  return chunks;
}

async function insertChunksFromFile(filePath) {
  try {
    console.log("Reading text from file:", filePath);
    const text = await fs.readFile(filePath, 'utf-8');

    if (!text.trim()) throw new Error("The file is empty.");

    console.log("Loaded Text:", text.slice(0, 100), "...");

    // Step 1: Use LangChain's RecursiveCharacterTextSplitter
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1024, // Adjust to ensure context-aware chunking
      chunkOverlap: 100,
      separators: ["\n\n", "\n", " "], // Preserve sentence structure
    });

    const initialChunks = await splitter.createDocuments([text]);

    console.log(`🔹 LangChain created ${initialChunks.length} character chunks`);

    // Step 2: Use token-based chunking from Hugging Face
    let finalChunks = [];
    for (const chunk of initialChunks) {
      const tokenChunks = await chunkTextWithTokens(chunk.pageContent, 256, 50);
      finalChunks.push(...tokenChunks);
    }

    console.log(`🔹 Tokenizer created ${finalChunks.length} token-based chunks`);

    // Step 3: Insert each chunk into Supabase
    for (const chunk of finalChunks) {
      const embedding = await generateEmbedding(chunk);

      if (!embedding || embedding.length !== 1024) {
        console.error(`Skipping chunk - Invalid embedding length: ${embedding?.length}`);
        continue;
      }

      const { data, error } = await supabase
        .from('documents')
        .insert([{ content: chunk, embedding }]);

      if (error) console.error("❌ Error inserting chunk:", error);
      else console.log("✅ Inserted chunk:", data);
    }
  } catch (error) {
    console.error("❌ Failed to insert document:", error.message);
  }
}
