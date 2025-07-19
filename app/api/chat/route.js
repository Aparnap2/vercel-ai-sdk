import { streamUI } from 'ai/rsc';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { SYSTEM_PROMPT } from './system-prompt';
import { databaseQueryTool } from '../../../lib/tools/database';
import { userCardTool, productCardTool, orderCardTool, supportTicketCardTool } from '../../../lib/tools/ui-components';
import { nanoid } from 'nanoid';
import ServerCardWrapper from '../../components/ServerCardWrapper';

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
    console.error(`[${timestamp}] [ERROR] ${message}`, {
      ...data,
      ...(errorDetails && { error: errorDetails })
    });
  },
  debug: (message, data = {}) => {
    if (process.env.NODE_ENV !== 'production') {
      const timestamp = new Date().toISOString();
      console.debug(`[${timestamp}] [DEBUG] ${message}`, JSON.stringify(data, null, 2));
    }
  },
  api: (endpoint, data = {}) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [API] ${endpoint}`, JSON.stringify(data, null, 2));
  }
};

// Ensure GOOGLE_GENERATIVE_AI_API_KEY is available
if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
  console.error('[API_ROUTE] Missing GOOGLE_GENERATIVE_AI_API_KEY');
  throw new Error('Missing GOOGLE_GENERATIVE_AI_API_KEY environment variable');
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
      // Remove sensitive headers from logging
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

    // Handle simple greetings without LLM
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === 'user') {
      const lowerContent = lastMessage.content.toLowerCase().trim();
      
      logger.debug('Checking for greeting', { ...logContext, content: lowerContent });
      if (lowerContent === 'hi' || lowerContent === 'hello') {
        logger.info('Handling greeting', { ...logContext, content: lowerContent });
        logger.debug('Returning greeting response', { ...logContext });
        return new Response(JSON.stringify({
          text: 'Hello! How can I assist you with your orders, products, or support tickets today?'
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    logger.info('Generating response with tools', { ...logContext });
    
    try {
      // Format messages if needed
      const formattedMessages = messages.map((msg, index) => {
        logger.debug(`Processing message ${index}`, { ...logContext, message: msg });
        if (msg.role === 'user' && msg.content) {
          // Normalize the message content first (replace common typos in emails)
          const normalizedContent = msg.content
            // Fix comma instead of period in email
            .replace(/([a-zA-Z0-9._-]+)@([a-zA-Z0-9_-]+),([a-zA-Z]{2,})/g, '$1@$2.$3')
            // Ensure single space after commas
            .replace(/\s*,\s*/g, ', ');

          // Extract email from the normalized message
          const emailMatch = normalizedContent.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/i);
          
          if (emailMatch) {
            const email = emailMatch[0];
            const content = normalizedContent.toLowerCase();
            
            // Check if it's asking for orders
            if (content.includes('order')) {
              return {
                ...msg,
                content: `Find orders for email: ${email}`
              };
            }
            // Check if it's asking for customer info
            else if (content.includes('customer') || content.includes('info') || content.includes('details')) {
              return {
                ...msg,
                content: `Find customer with email: ${email}`
              };
            }
            // Default to order search if no specific type mentioned
            return {
              ...msg,
              content: `Find orders for email: ${email}`
            };
          }
        }
        return msg;
      });

      // Enhanced email extraction function with improved validation
      function extractEmailFromMessages(messages) {
        // Enhanced email regex pattern for better matching and validation
        const EMAIL_REGEX = /\b[a-zA-Z0-9](?:[a-zA-Z0-9._-]*[a-zA-Z0-9])?@[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,}\b/gi;
        
        for (const message of messages.reverse()) {
          if (message.role === 'user' && message.content) {
            // Normalize the message content (fix common typos and formatting issues)
            const normalizedContent = message.content
              // Fix comma instead of period in email domains
              .replace(/([a-zA-Z0-9._-]+)@([a-zA-Z0-9_-]+),([a-zA-Z]{2,})/g, '$1@$2.$3')
              // Fix space in email addresses
              .replace(/([a-zA-Z0-9._-]+)\s*@\s*([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '$1@$2')
              // Fix missing dots in common domains
              .replace(/@(gmail|yahoo|hotmail|outlook)([a-zA-Z]{2,})/g, '@$1.$2')
              // Ensure single space after commas
              .replace(/\s*,\s*/g, ', ');

            // Find all potential email matches
            const emailMatches = normalizedContent.match(EMAIL_REGEX);
            
            if (emailMatches && emailMatches.length > 0) {
              // Validate and return the first valid email
              for (const emailMatch of emailMatches) {
                const email = emailMatch.toLowerCase().trim();
                
                // Additional validation checks
                if (isValidEmailAddress(email)) {
                  logger.debug('Valid email extracted from message', { 
                    ...logContext, 
                    email: email.substring(0, 3) + '***@' + email.split('@')[1], // Partially redact for logging
                    originalContent: message.content.substring(0, 100) + '...'
                  });
                  return email;
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
        
        // Basic format check
        const basicEmailRegex = /^[a-zA-Z0-9](?:[a-zA-Z0-9._-]*[a-zA-Z0-9])?@[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,}$/;
        if (!basicEmailRegex.test(email)) return false;
        
        // Additional validation rules
        const parts = email.split('@');
        if (parts.length !== 2) return false;
        
        const [localPart, domainPart] = parts;
        
        // Local part validation
        if (localPart.length === 0 || localPart.length > 64) return false;
        if (localPart.startsWith('.') || localPart.endsWith('.')) return false;
        if (localPart.includes('..')) return false;
        
        // Domain part validation
        if (domainPart.length === 0 || domainPart.length > 255) return false;
        if (domainPart.startsWith('.') || domainPart.endsWith('.')) return false;
        if (domainPart.startsWith('-') || domainPart.endsWith('-')) return false;
        if (domainPart.includes('..')) return false;
        
        // Check for valid TLD
        const tldPart = domainPart.split('.').pop();
        if (!tldPart || tldPart.length < 2) return false;
        
        return true;
      }

      // Extract email from messages for security
      const userEmail = extractEmailFromMessages([...messages]);
      
      if (!userEmail) {
        logger.warn('No email found in messages', { ...logContext });
        return new Response(JSON.stringify({
          text: 'Please provide your email address to access your personal data. For example: "Show my orders for john@example.com"',
          requestId
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Create a simplified version of the tool that matches the expected parameter structure
      const simplifiedTool = {
        description: 'Query the database for customers, products, orders, or support tickets with email-based security.',
        parameters: z.object({
          type: z.enum(['customer', 'product', 'order', 'ticket']).describe('Type of data to query'),
          query: z.string().describe('Search query or identifier (ID or other relevant information)')
        }),
        execute: async (params) => {
          const toolCallId = nanoid();
          const toolLogContext = { ...logContext, toolCallId };
          
          logger.info('Executing database query', { 
            ...toolLogContext, 
            params,
            userEmail
          });
          
          try {
            // Ensure params is an object
            const safeParams = params || {};
            
            // Extract type and query with validation
            const type = (safeParams.type || 'order').toLowerCase();
            const query = safeParams.query || '';
            
            logger.debug('Query parameters validated', { 
              ...toolLogContext, 
              type, 
              query,
              userEmail
            });
            
            // Parse identifiers from query if needed
            let identifiers = [];
            if (query) {
              // Check for order ID
              const orderIdMatch = query.match(/order[#\s]*(\d+)/i);
              if (orderIdMatch) {
                identifiers.push({ orderId: orderIdMatch[1] });
              }
              
              // Check for ticket ID
              const ticketIdMatch = query.match(/ticket[#\s]*(\d+)/i);
              if (ticketIdMatch) {
                identifiers.push({ ticketId: ticketIdMatch[1] });
              }
              
              // Check for product ID
              const productIdMatch = query.match(/product[#\s]*(\d+)/i);
              if (productIdMatch) {
                identifiers.push({ productId: productIdMatch[1] });
              }
            }
            
            // Call the database query tool with the correct parameter structure including email
            const startTime = Date.now();
            const result = await databaseQueryTool.execute({ 
              type, 
              email: userEmail,
              identifiers: identifiers.length > 0 ? identifiers : undefined
            });
            const duration = Date.now() - startTime;
            
            logger.info('Database query completed', {
              ...toolLogContext,
              durationMs: duration,
              resultType: result?.type,
              resultSummary: result?.summary,
              hasData: Array.isArray(result?.data) ? result.data.length : 0
            });
            
            return result;
          } catch (error) {
            logger.error('Database query failed', error, {
              ...toolLogContext,
              errorType: error.name,
              stack: error.stack
            });
            
            return {
              type: 'error',
              data: [],
              llm_formatted_data: `Error: ${error.message}`,
              error: error.message,
              requestId
            };
          }
        }
      };

      // Log the model request
      const modelRequest = {
        model: 'gemini-2.0-flash',
        messageCount: formattedMessages.length,
        hasTools: true,
        temperature: 0.2
      };
      
      logger.info('Sending request to Gemini model', {
        ...logContext,
        ...modelRequest
      });
      
      let modelStartTime = null;
      try {
        modelStartTime = Date.now();
        let result;
        let lastError;
        const maxRetries = 2;
        let attempt = 0;
        
        while (attempt <= maxRetries) {
          attempt++;
          lastError = null;
        
        try {
          const model = google('gemini-1.5-flash');
          logger.debug('Initialized Gemini model', { 
            ...logContext, 
            modelName: 'gemini-1.5-flash',
            attempt,
            maxRetries
          });
          
          // Log the exact request being sent to the model
          const requestPayload = {
            system: SYSTEM_PROMPT,
            messages: formattedMessages,
            tools: { databaseQuery: { description: simplifiedTool.description } },
            toolChoice: 'auto',
            temperature: 0.2,
            maxRetries: 0 // We handle retries ourselves
          };
          
          logger.debug('Sending request to Gemini model', {
            ...logContext,
            attempt,
            request: {
              ...requestPayload,
              messages: requestPayload.messages.map(m => ({
                ...m,
                content: m.content?.substring(0, 100) + (m.content?.length > 100 ? '...' : '')
              }))
            }
          });
          
          result = await streamUI({
            model,
            ...requestPayload,
            text: ({ content, done }) => {
              if (done) {
                logger.debug('Text generation completed', { ...logContext, contentLength: content.length });
              }
              return <div>{content}</div>;
            },
            tools: {
              databaseQuery: {
                description: simplifiedTool.description,
                parameters: simplifiedTool.parameters,
                generate: async function* ({ type, query }) {
                  const toolCallId = nanoid();
                  const toolLogContext = { ...logContext, toolCallId };
                  
                  logger.info('Executing database query via streamUI', { 
                    ...toolLogContext, 
                    type,
                    query,
                    userEmail
                  });
                  
                  // Yield loading state
                  yield <ServerCardWrapper type={type} loading={true} />;
                  
                  try {
                    // Execute the database query
                    const result = await simplifiedTool.execute({ type, query });
                    
                    logger.info('Database query completed via streamUI', {
                      ...toolLogContext,
                      resultType: result?.type,
                      resultSummary: result?.summary,
                      hasData: Array.isArray(result?.data) ? result.data.length : 0
                    });
                    
                    // Handle error results
                    if (result.error) {
                      yield <ServerCardWrapper 
                        type={type} 
                        error={new Error(result.message)} 
                        data={result.data}
                        fallbackToMarkdown={true}
                      />;
                      return result;
                    }
                    
                    // Handle successful results with data
                    if (result.data && result.data.length > 0) {
                      // Generate UI components for each data item using enhanced UI tools
                      try {
                        const uiResult = await generateUIComponents(type, result.data, userEmail, toolLogContext);
                        if (uiResult && uiResult.components) {
                          for (const component of uiResult.components) {
                            yield <ServerCardWrapper {...component.props} />;
                          }
                        } else {
                          // Fallback to direct ServerCardWrapper usage
                          for (const item of result.data) {
                            yield <ServerCardWrapper 
                              type={type} 
                              data={item}
                              loading={false}
                              fallbackToMarkdown={true}
                            />;
                          }
                        }
                      } catch (uiError) {
                        logger.warn('UI component generation failed, using fallback', uiError, toolLogContext);
                        // Fallback to direct ServerCardWrapper usage
                        for (const item of result.data) {
                          yield <ServerCardWrapper 
                            type={type} 
                            data={item}
                            loading={false}
                            fallbackToMarkdown={true}
                          />;
                        }
                      }
                    } else {
                      // No data found
                      yield <ServerCardWrapper 
                        type={type} 
                        data={null}
                        loading={false}
                        fallbackToMarkdown={true}
                      />;
                    }
                    
                    return result;
                  } catch (error) {
                    logger.error('Database query failed via streamUI', error, {
                      ...toolLogContext,
                      errorType: error.name,
                      stack: error.stack
                    });
                    
                    // Yield error state
                    yield <ServerCardWrapper 
                      type={type} 
                      error={error}
                      data={null}
                      fallbackToMarkdown={true}
                    />;
                    
                    return {
                      type: 'error',
                      data: [],
                      llm_formatted_data: `Error: ${error.message}`,
                      error: error.message,
                      requestId
                    };
                  }
                }
              }
            }
          });
          
          // If we got here, the request was successful
          break;
          
        } catch (error) {
          lastError = error;
          const isLastAttempt = attempt >= maxRetries;
          const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          
          logger.warn('Gemini API call failed', {
            ...logContext,
            attempt,
            maxRetries,
            error: {
              name: error.name,
              message: error.message,
              code: error.code,
              status: error.status,
              ...(isLastAttempt ? { stack: error.stack } : {})
            },
            willRetry: !isLastAttempt,
            delayMs: isLastAttempt ? 0 : delayMs
          });
          
          if (isLastAttempt) {
            throw error; // Rethrow on final attempt
          }
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
        
        const modelDuration = Date.now() - modelStartTime;
        
        // Log the raw response for debugging
        logger.debug('Raw Gemini response', {
          ...logContext,
          response: result,
          responseKeys: Object.keys(result)
        });
        
        // Validate the response
        if (!result || typeof result !== 'object') {
          throw new Error('Invalid response format from Gemini API');
        }
        
        logger.info('Received response from Gemini model', {
          ...logContext,
          durationMs: modelDuration,
          hasText: !!result.text,
          textLength: result.text?.length,
          toolResultsCount: result.toolResults?.length || 0,
          finishReason: result.finishReason || 'unknown',
          hasToolCalls: result.toolResults?.some(tr => tr.toolCall)
        });
        
        // If we have tool calls but no text, ensure we have a default response
        if (result.toolResults?.length > 0 && !result.text) {
          result.text = 'Processing your request...';
        }
        
        logger.debug('Model response details', {
          ...logContext,
          result: {
            textLength: result.text?.length,
            toolResults: result.toolResults?.map(tr => ({
              toolName: tr.toolName,
              resultType: typeof tr.result,
              resultKeys: tr.result ? Object.keys(tr.result) : []
            }))
          }
        });
      } catch (error) {
        const modelDuration = Date.now() - modelStartTime;
        logger.error('Model request failed', error, {
          ...logContext,
          durationMs: modelDuration,
          errorType: error.name,
          errorCode: error.code,
          errorStatus: error.status
        });
        throw error;
      }

      // Format the response
      let responseText = result.text || 'I couldn\'t find any information about that.';
      let responseData = null;
      
      // Handle tool results if any
      if (result.toolResults?.length > 0) {
        logger.debug('Processing tool results', {
          ...logContext,
          toolResultsCount: result.toolResults.length,
          toolResults: result.toolResults.map(tr => ({
            toolName: tr.toolName,
            toolCallId: tr.toolCallId,
            resultType: typeof tr.result,
            hasError: !!tr.result?.error
          }))
        });
        
        // Process each tool result
        for (const toolResult of result.toolResults) {
          const { result: toolResponse } = toolResult;
          
          if (!toolResponse) {
            logger.warn('Empty tool response', {
              ...logContext,
              toolName: toolResult.toolName,
              toolCallId: toolResult.toolCallId
            });
            continue;
          }
          
          if (toolResponse.error) {
            logger.warn('Tool execution resulted in error', {
              ...logContext,
              toolName: toolResult.toolName,
              error: toolResponse.error,
              hasFormattedData: !!toolResponse.llm_formatted_data,
              hasSuggestion: !!toolResponse.suggestion
            });
            
            responseText = `## Error\n${toolResponse.error}`;
            
            // Add more context if available
            if (toolResponse.llm_formatted_data) {
              responseText += `\n\n${toolResponse.llm_formatted_data}`;
            }
            
            // Add suggestion if available
            if (toolResponse.suggestion) {
              responseText += `\n\n**Suggestion**: ${toolResponse.suggestion}`;
            }
          } 
          // Handle successful tool execution with formatted data
          else if (toolResponse.llm_formatted_data) {
            logger.info('Tool execution successful with formatted data', {
              ...logContext,
              toolName: toolResult.toolName,
              resultType: toolResponse.type,
              dataLength: Array.isArray(toolResponse.data) ? toolResponse.data.length : null
            });
            
            responseText = toolResponse.llm_formatted_data;
            responseData = toolResponse.data;
            
            // If we have data but no formatted output, create a basic one
            if (toolResponse.data && toolResponse.data.length > 0 && !toolResponse.llm_formatted_data) {
              responseText = `## ${toolResponse.type ? `${toolResponse.type} Information` : 'Results'}\n`;
              responseText += `Found ${toolResponse.data.length} result(s).`;
            }
          } 
          // Fallback to raw data if no formatted data is available
          else if (toolResponse.data) {
            logger.debug('Falling back to raw data format', {
              ...logContext,
              toolName: toolResult.toolName,
              dataType: typeof toolResponse.data,
              isArray: Array.isArray(toolResponse.data)
            });
            
            responseText = `## Raw Data\n\`\`\`json\n${JSON.stringify(toolResponse.data, null, 2)}\n\`\`\``;
          }
          
          // Stop after processing the first tool result with content
          if (responseText) {
            break;
          }
        }
      } else {
        logger.debug('No tool results to process', { ...logContext });
      }
      
      // If we still don't have any text, provide a fallback
      if (!responseText) {
        logger.warn('No response text generated, using fallback', { ...logContext });
        responseText = 'I encountered an issue processing your request. Please try again.';
      }

      // Prepare the response object
      const responseObj = {
        text: responseText,
        data: responseData || null,
        ui_components: result.toolResults?.[0]?.result?.ui_components || [],
        requestId
      };

      const responseHeaders = {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'X-Content-Type-Options': 'nosniff',
        'X-Request-ID': requestId
      };
      
      const response = new Response(JSON.stringify(responseObj), {
        status: 200,
        headers: responseHeaders
      });
      
      const totalDuration = Date.now() - startTime;
      logger.info('Sending response', {
        ...logContext,
        status: 200,
        durationMs: totalDuration,
        responseSize: JSON.stringify(responseObj).length,
        hasData: !!responseData,
        hasUIComponents: responseObj.ui_components.length > 0
      });
      
      return response;
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
}