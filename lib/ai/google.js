// lib/ai/google.js
import { createGoogleGenerativeAI } from '@ai-sdk/google';

if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
  throw new Error('The GOOGLE_GENERATIVE_AI_API_KEY environment variable is missing.');
}

/**
 * Creates a Google Generative AI provider instance with custom settings.
 * 
 * Available options:
 * - baseURL: Custom API URL prefix (default: https://generativelanguage.googleapis.com/v1beta)
 * - apiKey: API key for authentication (default: GOOGLE_GENERATIVE_AI_API_KEY env var)
 * - headers: Custom headers for API requests
 * - fetch: Custom fetch implementation
 */
export const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

/**
 * Creates a model instance with the specified Google model ID and optional settings.
 * 
 * @param {string} modelId - The Google model ID (e.g., 'gemini-1.5-pro-latest', 'gemini-2.5-flash')
 * @param {Object} options - Optional model-specific settings
 * @param {Array<Object>} options.safetySettings - Safety settings for content moderation
 * @param {string} options.cachedContent - Optional cached content name for cost optimization
 * @param {boolean} options.structuredOutputs - Enable/disable structured outputs (default: true)
 * @param {boolean} options.useSearchGrounding - Enable search grounding for latest information
 * @param {Object} options.dynamicRetrievalConfig - Config for dynamic retrieval with search grounding
 * @returns {Object} The configured model instance
 */
export function createGoogleModel(modelId, options = {}) {
  return google(modelId, options);
}

/**
 * Creates a text embedding model instance with specified settings.
 * 
 * @param {string} modelId - The embedding model ID (e.g., 'text-embedding-004')
 * @param {Object} options - Optional embedding model settings
 * @param {number} options.outputDimensionality - Number of dimensions for the embedding
 * @param {string} options.taskType - Task type for generating embeddings (e.g., 'SEMANTIC_SIMILARITY')
 * @returns {Object} The configured embedding model instance
 */
export function createGoogleEmbeddingModel(modelId, options = {}) {
  return google.textEmbeddingModel(modelId, options);
}
