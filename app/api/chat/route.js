import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { databaseQueryTool } from '../../../lib/tools/database';
import { nanoid } from 'nanoid';

export async function POST(req) {
  try {
    const body = await req.json();
    console.log('[DEBUG] Request received:', body);

    const { messages } = body;
    const chatHistory = messages
      .slice(0, -1)
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n');
    const input = messages[messages.length - 1].content;

    console.log('[DEBUG] Processed chat history:', { chatHistory, lastInput: input });

    const prompt = `You are a customer support assistant for TechTrend Innovations, an electronics store. Use the db_query tool to fetch order or support ticket data when needed. For simple greetings like "hi", respond with a friendly message. Be friendly and concise.
Conversation history:
${chatHistory}

User: ${input}
Assistant:`;

    console.log('[DEBUG] Generated prompt:', { prompt });

    // Fallback for simple messages
    if (input.trim().toLowerCase() === 'hi') {
      const messageId = nanoid();
      const response = {
        id: messageId,
        role: 'assistant',
        content: 'Hello! How can I assist you today?',
      };
      console.log('[DEBUG] Streaming fallback response:', response);
      const stream = new ReadableStream({
        start(controller) {
          const messageData = `event: message\ndata: ${JSON.stringify(response)}\n\n`;
          controller.enqueue(new TextEncoder().encode(messageData));
          controller.enqueue(new TextEncoder().encode('event: done\ndata: [DONE]\n\n'));
          controller.close();
        },
      });
      return new Response(stream, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Validate tool
    if (!databaseQueryTool || !databaseQueryTool.parameters) {
      throw new Error('Database query tool is not properly configured');
    }

    console.log('[DEBUG] Calling Gemini API:', {
      model: 'gemini-1.5-flash',
      toolsEnabled: true,
      temperature: 0.7,
    });

    const { text } = await generateText({
      model: google('gemini-1.5-flash'),
      prompt,
      tools: {
        db_query: databaseQueryTool,
      },
      toolChoice: 'auto',
      temperature: 0.7,
      safetySettings: [
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
      ],
    });

    console.log('[DEBUG] Gemini response:', { text });

    // Stream response for useChat
    const messageId = nanoid();
    const response = {
      id: messageId,
      role: 'assistant',
      content: text || 'Sorry, I encountered an issue. Please try again or contact support.',
    };
    console.log('[DEBUG] Streaming Gemini response:', response);
    const stream = new ReadableStream({
      start(controller) {
        const messageData = `event: message\ndata: ${JSON.stringify(response)}\n\n`;
        controller.enqueue(new TextEncoder().encode(messageData));
        controller.enqueue(new TextEncoder().encode('event: done\ndata: [DONE]\n\n'));
        controller.close();
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('[ERROR] API processing failed:', {
      message: error.message,
      stack: error.stack,
    });
    const messageId = nanoid();
    const errorResponse = {
      id: messageId,
      role: 'assistant',
      content: `Error: ${error.message}`,
    };
    console.log('[DEBUG] Streaming error response:', errorResponse);
    const stream = new ReadableStream({
      start(controller) {
        const messageData = `event: message\ndata: ${JSON.stringify(errorResponse)}\n\n`;
        controller.enqueue(new TextEncoder().encode(messageData));
        controller.enqueue(new TextEncoder().encode('event: done\ndata: [DONE]\n\n'));
        controller.close();
      },
    });
    return new Response(stream, {
      status: 500,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  }
}