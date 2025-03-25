import fs from 'fs/promises';
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { generateEmbedding } from '../services/embeddingService.js';
import { supabase } from '../config/supabase.js';

/**
 * Breaks text into smaller chunks based on character count
 * @param text Text content to chunk
 * @param maxChunkSize Maximum size of each chunk
 * @param chunkOverlap Number of characters to overlap between chunks
 */
async function createTextChunks(
  text: string, 
  maxChunkSize: number = 1000, 
  chunkOverlap: number = 100
): Promise<string[]> {
  // Use LangChain's splitter for intelligent chunking
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: maxChunkSize,
    chunkOverlap: chunkOverlap,
    separators: ["\n\n", "\n", ". ", " "], // Preserve sentence structure
  });

  const documents = await splitter.createDocuments([text]);
  return documents.map(doc => doc.pageContent);
}

/**
 * Processes a text file, splits it into chunks, generates embeddings,
 * and stores the chunks with their embeddings in Supabase
 */
async function insertChunksFromFile(filePath: string): Promise<void> {
  try {
    console.log("Reading text from file:", filePath);
    const text = await fs.readFile(filePath, 'utf-8');

    if (!text.trim()) {
      throw new Error("The file is empty.");
    }

    console.log(`Loaded text (first 100 chars): ${text.slice(0, 100)}...`);

    // Create chunks from the text
    const chunks = await createTextChunks(text, 1000, 100);
    console.log(`Created ${chunks.length} text chunks`);
    
    // Display the first few chunks
    chunks.slice(0, 3).forEach((chunk, index) => {
      console.log(`Chunk ${index + 1}: "${chunk.slice(0, 100)}..."`);
    });

    // Process each chunk
    let successCount = 0;
    let errorCount = 0;

    for (const [index, chunk] of chunks.entries()) {
      console.log(`Processing chunk ${index + 1}/${chunks.length}...`);
      
      try {
        // Generate embedding using TogetherAI via your existing service
        const embedding = await generateEmbedding(chunk);

        if (!embedding) {
          console.error(`Failed to generate embedding for chunk ${index + 1}`);
          errorCount++;
          continue;
        }

        // Insert the chunk and its embedding into Supabase
        const { error } = await supabase
          .from('documents')
          .insert([{ content: chunk, embedding }]);

        if (error) {
          console.error(`Error inserting chunk ${index + 1}:`, error);
          errorCount++;
        } else {
          console.log(`✅ Successfully inserted chunk ${index + 1}`);
          successCount++;
        }
      } catch (error: any) {
        console.error(`Error processing chunk ${index + 1}:`, error.message);
        errorCount++;
      }
      
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`
    📊 Embedding insertion summary:
    - Total chunks: ${chunks.length}
    - Successfully inserted: ${successCount}
    - Errors: ${errorCount}
    `);
  } catch (error: any) {
    console.error("❌ Failed to process document:", error.message);
  }
}

// Define the file path for insertion
const FILE_PATH = "src/scripts/documents.txt"; // Adjust if necessary

// Execute the insertion process
(async () => {
  console.log("🚀 Starting document embedding insertion...");
  await insertChunksFromFile(FILE_PATH);
  console.log("✅ Document insertion completed!");
})(); 