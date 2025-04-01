/**
 * Attempts to extract and parse a JSON object from a potentially noisy string.
 * It looks for the first '{' and the last '}' to define the JSON boundaries.
 * @param {string | null | undefined} rawString - The raw string potentially containing JSON.
 * @returns {object | null} The parsed JSON object if successful, otherwise null.
 */
export function extractAndParseJson(rawString) {
  if (!rawString || typeof rawString !== 'string') {
    console.warn("[Utils] extractAndParseJson received invalid input:", rawString);
    return null;
  }

  try {
    const jsonStart = rawString.indexOf('{');
    const jsonEnd = rawString.lastIndexOf('}');

    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      const jsonString = rawString.substring(jsonStart, jsonEnd + 1);
      // Try parsing the extracted string
      const parsedJson = JSON.parse(jsonString);
      // Basic validation: Ensure it's an object (could add more checks if needed)
      if (typeof parsedJson === 'object' && parsedJson !== null) {
           console.log("[Utils] Successfully extracted and parsed JSON:", parsedJson);
           return parsedJson;
      } else {
           console.warn("[Utils] Extracted content was not a valid JSON object:", jsonString);
           return null;
      }

    } else {
      console.warn("[Utils] Could not find valid JSON structure markers '{}' in string:", rawString);
      return null;
    }
  } catch (parseError) {
    console.error("[Utils] Failed to parse JSON:", parseError, "Input string:", rawString);
    return null; // Return null if JSON.parse throws an error
  }
} 