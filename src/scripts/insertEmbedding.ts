import fs from 'fs/promises';
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { generateEmbedding } from '../services/embeddingService.js';
import { supabase } from '../config/supabase.js';
import { AutoTokenizer, AutoModel } from '@huggingface/transformers';

// Set correct ONNX model path
process.env.TRANSFORMERS_CACHE = "/root/.cache/huggingface";
const modelPath = "/root/.cache/huggingface/hub/BAAI_bge-large-en-v1.5/";

// Load the tokenizer from the ONNX directory
const tokenizer = await AutoTokenizer.from_pretrained(modelPath, { 
  local_files_only: true, 
  use_fast: false
});

// Load the ONNX model
const model = await AutoModel.from_pretrained(modelPath, { 
  local_files_only: true, 
  trust_remote_code: false
});

console.log("✅ ONNX Model and Tokenizer Loaded Successfully!");

async function chunkTextWithTokens(text: string, maxTokens: number = 1000, overlapTokens: number = 50): Promise<string[]> {
  // Tokenize input correctly
  const tokens = tokenizer.encode(text.replace(/\n/g, " "), { add_special_tokens: true });

  console.log("🔢 Tokenized IDs:", tokens);

  if (tokens.length === 0) {
    console.error("❌ Tokenizer produced 0 tokens. Possible issue with encoding.");
    return [];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < tokens.length) {
    const end = Math.min(start + maxTokens, tokens.length);
    const chunkTokens = tokens.slice(start, end);

    // Convert tokens back to text
    const chunkText = tokenizer.decode(chunkTokens, { skip_special_tokens: true });
    chunks.push(chunkText);

    start += maxTokens - overlapTokens; // Move forward with overlap
  }

  return chunks;
}

async function insertChunksFromFile(filePath: string): Promise<void> {
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
    initialChunks.forEach((chunk, index) => {
      console.log(`📄 Chunk ${index + 1}: "${chunk.pageContent.slice(0, 100)}..."`);
    });

    // Step 2: Use token-based chunking from Hugging Face
    let finalChunks: string[] = [];
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

      const { statusText, error} = await supabase
        .from('documents')
        .insert([{ content: chunk, embedding }]);

      if (error) console.error("❌ Error inserting chunk:", error);
      else console.log("✅ Inserted chunk! API response:", statusText);
    }
  } catch (error: any) {
    console.error("❌ Failed to insert document:", error.message);
  }
}

// Define the file path for insertion
const FILE_PATH = "src/scripts/documents.txt"; // Adjust if necessary

// Execute the insertion process
(async () => {
  console.log("🚀 Starting document insertion...");
  await insertChunksFromFile(FILE_PATH);
  console.log("✅ Document insertion completed!");
})(); 