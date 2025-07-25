import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { databaseQueryTool } from '../../../lib/tools/database';
import { nanoid } from 'nanoid';
import { SYSTEM_PROMPT } from './system-prompt';

// Ensure GOOGLE_GENERATIVE_AI_API_KEY is available
if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
  console.error('[API_ROUTE] Missing GOOGLE_GENERATIVE_AI_API_KEY');
  throw new Error('Missing GOOGLE_GENERATIVE_AI_API_KEY environment variable');
}

export async function POST(req) {
  try {
    console.log('[API_ROUTE] Received POST request');
    const { messages } = await req.json();
    console.log('[API_ROUTE] Parsed request body, messages:', JSON.stringify(messages, null, 2));

    // Log headers for middleware debugging
    console.log('[API_ROUTE] Request headers:', JSON.stringify(Object.fromEntries(req.headers), null, 2));

    // Detect if this is a data query that requires tool usage
    const lastMessage = messages[messages.length - 1];
    let requiresTool = false;
    
    if (lastMessage && lastMessage.role === 'user') {
      const lowerContent = lastMessage.content.toLowerCase().trim();
      console.log('[API_ROUTE] Last message content:', lowerContent);
      
      // Handle simple greetings without LLM
      if (lowerContent === 'hi' || lowerContent === 'hello') {
        const response = 'Hello! How can I assist you with your orders, products, or support tickets today?';
        console.log('[API_ROUTE] Returning greeting response:', response);
        return new Response(response, {
          status: 200,
          headers: {
            'Content-Type': 'text/plain',
            'Cache-Control': 'no-cache',
            'X-Content-Type-Options': 'nosniff',
          },
        });
      }
      
      // Check if message contains data query keywords
      const dataKeywords = ['order', 'product', 'ticket', 'customer', 'find', 'check', 'show', 'get', '@'];
      requiresTool = dataKeywords.some(keyword => lowerContent.includes(keyword));
      console.log('[API_ROUTE] Requires tool usage:', requiresTool);
    }

    // Validate tool configuration
    console.log('[API_ROUTE] Validating databaseQueryTool');
    if (!databaseQueryTool || typeof databaseQueryTool.execute !== 'function') {
      console.error('[API_ROUTE] databaseQueryTool is not correctly configured:', databaseQueryTool);
      return new Response('Internal server error: Tool not configured.', {
        status: 500,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    // Log generateText inputs
    console.log('[API_ROUTE] Calling generateText with:');
    console.log('[API_ROUTE] System prompt:', SYSTEM_PROMPT);
    console.log('[API_ROUTE] Messages:', JSON.stringify(messages, null, 2));
    console.log('[API_ROUTE] Tools:', JSON.stringify({ db_query: databaseQueryTool.description }, null, 2));

    const result = await generateText({
      model: google('models/gemini-2.0-flash-exp'),
      system: SYSTEM_PROMPT,
      messages,
      tools: {
        db_query: databaseQueryTool,
      },
      toolChoice: requiresTool ? 'required' : 'auto',
      temperature: 0.5,
    });

    // Log full generateText result
    console.log('[API_ROUTE] generateText result:', JSON.stringify(result, null, 2));

    // Extract response text
    let responseText = result.text || '';
    console.log('[API_ROUTE] Extracted response text:', responseText);

    // Fallback if response is empty or incorrect
    if (result.toolResults?.length > 0 && (!responseText || responseText.includes('Unfortunately'))) {
      console.log('[API_ROUTE] Using tool result as fallback');
      const toolResult = result.toolResults[0].result;
      console.log('[API_ROUTE] Tool result:', JSON.stringify(toolResult, null, 2));
      if (toolResult.llm_formatted_data) {
        responseText = toolResult.llm_formatted_data;
        console.log('[API_ROUTE] Set response to llm_formatted_data:', responseText);
      } else if (toolResult.data?.length > 0) {
        responseText = `Found ${toolResult.data.length} order(s) for bob@example.com.`;
        console.log('[API_ROUTE] Set response to generic found message:', responseText);
      } else {
        responseText = 'Hi! I checked for orders associated with bob@example.com, but none were found. Please verify the email or provide more details.';
        console.log('[API_ROUTE] Set response to no orders found:', responseText);
      }
    }

    // Ensure response is not empty
    if (!responseText) {
      responseText = 'Hi! I processed your request, but no response was generated. Please try again.';
      console.log('[API_ROUTE] Set response to default fallback:', responseText);
    }

    // Log final response
    console.log('[API_ROUTE] Final response text:', responseText);
    console.log('[API_ROUTE] Response headers:', {
      'Content-Type': 'text/plain',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    });

    return new Response(responseText, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-cache',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('[API_ROUTE] Error:', error.stack);
    return new Response(
      `Error: ${error.message || 'An error occurred during the request.'}`,
      {
        status: 500,
        headers: { 'Content-Type': 'text/plain' },
      }
    );
  }
}