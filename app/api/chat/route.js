import { streamUI } from 'ai/rsc';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { SYSTEM_PROMPT } from './system-prompt';
import { databaseQueryTool } from '../../../lib/tools/database';
import { userCardTool, productCardTool, orderCardTool, supportTicketCardTool } from '../../../lib/tools/ui-components';
import { nanoid } from 'nanoid';
import ServerCardWrapper from '../../components/ServerCardWrapper';
import React from 'react';

// Enhanced logger utility
const logger = {
  info: (message, data = {}) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [INFO] ${message}`, JSON.stringify(data, null, 2));
  },
  error: (message, error = null, data = {}) => {
    const timestamp = new Date().toISOString();
    const errorDetails = error ? {
      message: error.message,
      stack: error.stack,
      ...(error.cause && { cause: error.cause })
    } : null;
    // Use console.error for proper error stream handling in production environments
    console.error(`[${timestamp}] [ERROR] ${message}`, JSON.stringify({
      ...data,
      ...(errorDetails && { error: errorDetails })
    }, null, 2));
  },
  debug: (message, data = {}) => {
    if (process.env.NODE_ENV !== 'production') {
      const timestamp = new Date().toISOString();
      console.debug(`[${timestamp}] [DEBUG] ${message}`, JSON.stringify(data, null, 2));
    }
  },
  warn: (message, data = {}) => {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] [WARN] ${message}`, JSON.stringify(data, null, 2));
  },
  api: (endpoint, data = {}) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [API] ${endpoint}`, JSON.stringify(data, null, 2));
  }
};

// Ensure GOOGLE_GENERATIVE_AI_API_KEY is available
if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
  const errorMessage = 'Missing GOOGLE_GENERATIVE_AI_API_KEY environment variable';
  logger.error(errorMessage);
  throw new Error(errorMessage);
}

// Generate UI components using enhanced UI component tools
async function generateUIComponents(type, data, userEmail, logContext) {
  try {
    logger.debug('Generating UI components', { 
      ...logContext, 
      type, 
      dataCount: Array.isArray(data) ? data.length : 0,
      userEmail: userEmail ? '[REDACTED]' : null
    });

    // Map data type to appropriate UI component tool
    const toolMap = {
      customer: userCardTool,
      user: userCardTool,
      order: orderCardTool,
      product: productCardTool,
      ticket: supportTicketCardTool,
      support_ticket: supportTicketCardTool
    };

    const tool = toolMap[type.toLowerCase()];
    if (!tool) {
      logger.warn('No UI component tool found for type', { ...logContext, type });
      return null;
    }

    // Prepare parameters based on data type
    const params = { email: userEmail };
    
    switch (type.toLowerCase()) {
      case 'customer':
      case 'user':
        params.users = Array.isArray(data) ? data : [data];
        break;
      case 'order':
        params.orders = Array.isArray(data) ? data : [data];
        break;
      case 'product':
        params.products = Array.isArray(data) ? data : [data];
        break;
      case 'ticket':
      case 'support_ticket':
        params.tickets = Array.isArray(data) ? data : [data];
        break;
      default:
        logger.warn('Unknown data type for UI component generation', { ...logContext, type });
        return null;
    }

    // Execute the UI component tool
    const result = await tool.execute(params);
    
    logger.info('UI components generated successfully', {
      ...logContext,
      componentCount: result.components?.length || 0,
      resultType: result.type
    });

    return result;
  } catch (error) {
    logger.error('Failed to generate UI components', error, {
      ...logContext,
      type,
      errorType: error.name
    });
    throw error;
  }
}

// Rate limiting configuration
const RATE_LIMIT = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30, // 30 requests per minute per IP
  blockDuration: 5 * 60 * 1000 // 5 minutes block
};

// Simple in-memory rate limiter (for production, use Redis or similar)
const rateLimitStore = new Map();

function checkRateLimit(clientIP) {
  const now = Date.now();
  const key = clientIP;
  
  if (!rateLimitStore.has(key)) {
    rateLimitStore.set(key, { count: 1, resetTime: now + RATE_LIMIT.windowMs, blockedUntil: null });
    return { allowed: true, remaining: RATE_LIMIT.maxRequests - 1 };
  }
  
  const record = rateLimitStore.get(key);
  
  // Check if currently blocked
  if (record.blockedUntil && now < record.blockedUntil) {
    return { 
      allowed: false, 
      remaining: 0, 
      resetTime: record.blockedUntil,
      reason: 'Rate limit exceeded - temporarily blocked'
    };
  }
  
  // Reset window if expired
  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + RATE_LIMIT.windowMs;
    record.blockedUntil = null;
    rateLimitStore.set(key, record);
    return { allowed: true, remaining: RATE_LIMIT.maxRequests - 1 };
  }
  
  // Check if limit exceeded
  if (record.count >= RATE_LIMIT.maxRequests) {
    record.blockedUntil = now + RATE_LIMIT.blockDuration;
    rateLimitStore.set(key, record);
    return { 
      allowed: false, 
      remaining: 0, 
      resetTime: record.blockedUntil,
      reason: 'Rate limit exceeded'
    };
  }
  
  // Increment count
  record.count++;
  rateLimitStore.set(key, record);
  return { allowed: true, remaining: RATE_LIMIT.maxRequests - record.count };
}

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime && (!record.blockedUntil || now > record.blockedUntil)) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000); // Clean up every 5 minutes

export async function POST(req) {
  const requestId = nanoid();
  const logContext = { requestId, path: '/api/chat' };
  const startTime = Date.now();
  
  try {
    // Get client IP for rate limiting
    const clientIP = req.headers.get('x-forwarded-for') || 
                    req.headers.get('x-real-ip') || 
                    req.ip || 
                    'unknown';
    
    // Apply rate limiting
    const rateLimitResult = checkRateLimit(clientIP);
    if (!rateLimitResult.allowed) {
      logger.warn('Rate limit exceeded', { 
        ...logContext, 
        clientIP: clientIP.substring(0, 8) + '***', // Partially redact IP
        reason: rateLimitResult.reason
      });
      
      return new Response(JSON.stringify({
        error: 'Too many requests. Please try again later.',
        requestId,
        retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
      }), { 
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': RATE_LIMIT.maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetTime / 1000).toString(),
          'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString()
        }
      });
    }

    logger.info('Received request', { 
      ...logContext,
      method: req.method,
      url: req.url,
      clientIP: clientIP.substring(0, 8) + '***', // Partially redact IP for logging
      rateLimitRemaining: rateLimitResult.remaining,
      headers: {
        'content-type': req.headers.get('content-type'),
        'user-agent': req.headers.get('user-agent')?.substring(0, 50) + '...',
        'accept': req.headers.get('accept')
      }
    });

    let body;
    try {
      body = await req.json();
      logger.debug('Request body parsed', { ...logContext, body });
    } catch (parseError) {
      logger.error('Failed to parse request body', parseError, logContext);
      return new Response(JSON.stringify({ 
        error: 'Invalid request body',
        requestId 
      }), { status: 400 });
    }

    const { messages } = body;
    if (!Array.isArray(messages)) {
      logger.error('Invalid messages array', null, { ...logContext, messages });
      return new Response(JSON.stringify({ 
        error: 'Messages must be an array',
        requestId 
      }), { status: 400 });
    }
    
    logger.debug('Processing messages', { 
      ...logContext, 
      messageCount: messages.length,
      lastMessage: messages[messages.length - 1] 
    });

    // Handle simple greetings without LLM for efficiency
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === 'user') {
      const lowerContent = lastMessage.content.toLowerCase().trim();
      
      logger.debug('Checking for greeting', { ...logContext, content: lowerContent });
      if (['hi', 'hello'].includes(lowerContent)) {
        logger.info('Handling simple greeting', { ...logContext, content: lowerContent });
        
        // For simple greetings, we need to return a properly formatted streaming response
        // that the frontend can understand
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          async start(controller) {
            const message = 'Hello! How can I assist you with your orders, products, or support tickets today?';
            logger.debug('Sending greeting response', { ...logContext, message });
            
            // Send the message in the format expected by the frontend
            controller.enqueue(encoder.encode(`0:"${message}"\n`));
            controller.close();
          },
        });
        
        logger.debug('Returning greeting stream response', { ...logContext });
        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        });
      }
    }

    logger.info('Generating response with tools', { ...logContext });
    
    // Enhanced email extraction function with improved validation
function extractEmailFromMessages(messages) {
  // More precise email regex that requires word boundaries
  const EMAIL_REGEX = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}\b/g;
  
  for (const message of messages.slice().reverse()) {
    if (message.role === 'user' && message.content) {
      // Find all email matches
      const emailMatches = message.content.match(EMAIL_REGEX);
      if (emailMatches) {
        // Process each match and return the first valid one
        for (const emailMatch of emailMatches) {
          const email = emailMatch.toLowerCase().trim();
          // Additional validation to ensure it's a proper email
          if (isValidEmailAddress(email) && email.includes('.') && email.split('@').length === 2) {
            const [localPart, domain] = email.split('@');
            // Ensure both parts are reasonable lengths
            if (localPart.length >= 1 && localPart.length <= 64 && 
                domain.length >= 4 && domain.length <= 255 &&
                domain.includes('.')) {
              logger.debug('Valid email extracted from message', { 
                ...logContext, 
                email: email.substring(0, 3) + '***@' + email.split('@')[1],
                originalContent: message.content.substring(0, 100) + '...'
              });
              return email;
            }
          }
        }
      }
    }
  }
  return null;
}

    // Enhanced email validation function
    function isValidEmailAddress(email) {
      if (!email || typeof email !== 'string') return false;
      const basicEmailRegex = /^[a-zA-Z0-9](?:[a-zA-Z0-9._-]*[a-zA-Z0-9])?@[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,}$/;
      if (!basicEmailRegex.test(email)) return false;
      
      const [localPart, domainPart] = email.split('@');
      if (localPart.length > 64 || domainPart.length > 255) return false;
      if (localPart.startsWith('.') || localPart.endsWith('.') || localPart.includes('..')) return false;
      if (domainPart.startsWith('.') || domainPart.endsWith('.') || domainPart.startsWith('-') || domainPart.endsWith('-') || domainPart.includes('..')) return false;
      
      const tldPart = domainPart.split('.').pop();
      return tldPart && tldPart.length >= 2;
    }

    // Extract email from messages for security and context.
    const userEmail = extractEmailFromMessages(messages);
    
    if (!userEmail) {
      logger.warn('No email found in messages. Prompting user.', { ...logContext });
      
      // Return properly formatted streaming response for email prompt
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const message = 'Please provide your email address to access your personal data. For example: "Show my orders for john@example.com"';
          logger.debug('Sending email prompt response', { ...logContext, message });
          
          controller.enqueue(encoder.encode(`0:"${message}"\n`));
          controller.close();
        },
      });
      
      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Enhanced tool for streamUI with React Server Components and progressive loading
    const databaseQuery = {
      description: 'Query the database for customers, products, orders, or support tickets. Requires an email for authorization. Supports progressive loading and real-time updates.',
      parameters: z.object({
        type: z.enum(['customer', 'product', 'order', 'ticket']).describe('Type of data to query'),
        query: z.string().describe('Search query, ID, or other relevant information. The user email is used for authorization.')
      }),
      generate: async function* ({ type, query }) {
        const toolCallId = nanoid();
        const toolLogContext = { ...logContext, toolCallId };
        
        logger.info('Executing enhanced database query via streamUI', { 
          ...toolLogContext, 
          type,
          query,
          userEmail: '[REDACTED]'
        });
        
        try {
          // Yield initial loading state with enhanced skeleton
          yield (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 text-sm">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span>Searching {type} data...</span>
              </div>
              <ServerCardWrapper 
                type={type} 
                data={null} 
                loading={true} 
                fallbackToMarkdown={true} 
              />
            </div>
          );
          
          // Parse identifiers from query with enhanced pattern matching
          let identifiers = [];
          if (query) {
            // Enhanced regex patterns for better ID extraction
            const patterns = {
              order: /(?:order|ord)[#\s]*(\d+)/i,
              ticket: /(?:ticket|tkt|support)[#\s]*(\d+)/i,
              product: /(?:product|prod|item)[#\s]*(\d+)/i,
              customer: /(?:customer|user|cust)[#\s]*(\d+)/i
            };
            
            for (const [key, pattern] of Object.entries(patterns)) {
              const match = query.match(pattern);
              if (match) {
                identifiers.push({ [`${key}Id`]: match[1] });
              }
            }
          }
          
          // Call the database query tool with enhanced parameters
          const startTime = Date.now();
          const result = await databaseQueryTool.execute({ 
            type, 
            email: userEmail,
            identifiers: identifiers.length > 0 ? identifiers : undefined,
            query: query // Pass the full query for better context
          });
          const duration = Date.now() - startTime;
          
          logger.info('Enhanced database query completed', {
            ...toolLogContext,
            durationMs: duration,
            resultType: result?.type,
            hasData: Array.isArray(result?.data) ? result.data.length : 0,
            identifiersFound: identifiers.length
          });
          
          // Handle error results with enhanced error UI
          if (result.error) {
            return (
              <div className="max-w-md mx-auto p-4 border border-red-200 rounded-lg bg-red-50 dark:bg-red-900/20 shadow-sm">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                      Unable to load {type} data
                    </h3>
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                      {result.message || 'An error occurred while fetching your data. Please try again.'}
                    </p>
                  </div>
                </div>
              </div>
            );
          }
          
          // Handle successful results with enhanced UI and progressive loading
          if (result.data && result.data.length > 0) {
            // Yield success indicator first
            yield (
              <div className="flex items-center space-x-2 text-green-600 dark:text-green-400 text-sm mb-4">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Found {result.data.length} {type}{result.data.length !== 1 ? 's' : ''}</span>
              </div>
            );
            
            // Progressive loading: yield components one by one for better UX
            const components = [];
            for (let i = 0; i < result.data.length; i++) {
              const item = result.data[i];
              components.push(
                <ServerCardWrapper 
                  key={`${type}-${item.id || i}`}
                  type={type} 
                  data={item} 
                  loading={false} 
                  fallbackToMarkdown={true}
                  className="animate-in slide-in-from-bottom-2 duration-300"
                />
              );
              
              // Yield progressive updates for better perceived performance
              if (i < 3 || i % 2 === 0) { // Show first 3 immediately, then every other one
                yield (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 text-green-600 dark:text-green-400 text-sm">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Found {result.data.length} {type}{result.data.length !== 1 ? 's' : ''}</span>
                    </div>
                    {components.slice(0, i + 1)}
                    {i < result.data.length - 1 && (
                      <div className="flex items-center space-x-2 text-blue-500 dark:text-blue-400 text-sm">
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500"></div>
                        <span>Loading more...</span>
                      </div>
                    )}
                  </div>
                );
              }
            }
            
            // Final result with all components
            return (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 text-green-600 dark:text-green-400 text-sm">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Found {result.data.length} {type}{result.data.length !== 1 ? 's' : ''}</span>
                </div>
                {components}
              </div>
            );
          } else {
            // Enhanced no data found UI
            return (
              <div className="max-w-md mx-auto p-6 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 shadow-sm">
                <div className="text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                    No {type} data found
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    We couldn't find any {type} records for your account.
                  </p>
                  {query && (
                    <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                      Search query: "{query}"
                    </p>
                  )}
                </div>
              </div>
            );
          }
        } catch (error) {
          logger.error('Enhanced database query failed via streamUI', error, {
            ...toolLogContext,
            errorType: error.name,
            errorStack: error.stack
          });
          
          // Enhanced error component with retry functionality
          return (
            <div className="max-w-md mx-auto p-4 border border-red-200 rounded-lg bg-red-50 dark:bg-red-900/20 shadow-sm">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                    Query Failed
                  </h3>
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {error.message || 'An unexpected error occurred while processing your request.'}
                  </p>
                  <div className="mt-3">
                    <button 
                      onClick={() => window.location.reload()} 
                      className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 underline"
                    >
                      Try refreshing the page
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        }
      }
    };

    // Log the model request
    logger.info('Sending request to Gemini model', {
      ...logContext,
      model: 'gemini-1.5-flash',
      hasTools: true,
      temperature: 0.2
    });
    
    let lastError;
    const maxRetries = 2;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Use the latest available Gemini model with enhanced capabilities
        // Default to gemini-1.5-flash but allow for environment variable override
        const modelId = process.env.GOOGLE_MODEL_ID || 'gemini-1.5-flash';
        
        // Create model with advanced settings
        const model = google(modelId, {
          // Add safety settings to moderate content, as per best practices.
          safetySettings: [
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          ],
          // Enable structured outputs for tool calling
          structuredOutputs: true,
          
          // Conditionally enable search grounding for specific queries that might benefit from updated information
          useSearchGrounding: lastMessage?.content?.toLowerCase().includes('latest') || 
                             lastMessage?.content?.toLowerCase().includes('recent') ||
                             lastMessage?.content?.toLowerCase().includes('news') || 
                             false,
        });
        
        logger.debug('Calling streamUI with tools', {
          ...logContext,
          hasTools: !!{ databaseQuery },
          toolsCount: Object.keys({ databaseQuery }).length
        });

        const result = await streamUI({
          model,
          system: SYSTEM_PROMPT,
          messages,
          tools: { databaseQuery },
          toolChoice: 'auto',
          temperature: 0.2,
          maxRetries: 0 // Handle retries manually
        });

        logger.debug('StreamUI call completed', {
          ...logContext,
          resultType: typeof result,
          hasResult: !!result
        });
        
        const totalDuration = Date.now() - startTime;
        logger.info('Stream response initiated successfully', {
          ...logContext,
          durationMs: totalDuration,
          attempt,
          modelId
        });

        // Log the result type for debugging
        logger.debug('StreamUI result type', {
          ...logContext,
          resultType: typeof result,
          hasToDataStreamResponse: typeof result.toDataStreamResponse === 'function',
          resultKeys: Object.keys(result || {})
        });

        // Convert to proper streaming response for React Server Components
        try {
          const response = result.toDataStreamResponse();
          logger.info('Successfully created streamUI data stream response', {
            ...logContext,
            responseType: typeof response,
            isResponse: response instanceof Response
          });
          return response;
        } catch (streamError) {
          logger.error('Failed to create streamUI data stream response', streamError, {
            ...logContext,
            errorType: streamError.name,
            errorMessage: streamError.message
          });
          throw streamError;
        }

      } catch (error) {
        lastError = error;
        const isLastAttempt = attempt >= maxRetries;
        const delayMs = Math.min(1000 * Math.pow(2, attempt), 5000);
        
        logger.warn('Gemini API call failed', {
          ...logContext,
          attempt,
          maxRetries,
          error: {
            name: error.name,
            message: error.message,
            code: error.code,
            status: error.status,
          },
          willRetry: !isLastAttempt,
          delayMs: isLastAttempt ? 0 : delayMs
        });
        
        if (isLastAttempt) {
          throw error; // Rethrow on final attempt
        }
        
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    
    // This part should not be reached if retries are configured correctly
    throw lastError || new Error('Failed to get a response from the model after multiple attempts.');

  } catch (error) {
    const errorDuration = Date.now() - startTime;
    logger.error('Request processing failed', error, {
      ...logContext,
      durationMs: errorDuration,
      errorType: error.name,
      errorCode: error.code,
      errorStatus: error.status,
      stack: error.stack
    });
    
    // Prepare error response
    const errorResponse = {
      error: 'An error occurred while processing your request',
      requestId,
      ...(process.env.NODE_ENV !== 'production' && {
        details: error.message,
        ...(error.stack && { stack: error.stack.split('\n') })
      })
    };
    
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId
      }
    });
  }
}
