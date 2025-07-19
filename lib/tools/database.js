import { z } from 'zod';
import { tool } from 'ai';
import { Client } from '@neondatabase/serverless';

console.log('[DEBUG] Initializing databaseQueryTool');

// Configuration constants
const DB_CONFIG = {
  CONNECTION_TIMEOUT: 3000, // 3 seconds
  TABLE_MAP: {
    customer: 'customer',
    product: 'product',
    order: 'order',
    ticket: 'support_ticket',
  },
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  COMMON_TABLES: ['product', 'customer', 'order', 'support_ticket']
};

// Utility functions for validation and formatting
function isValidEmail(email) {
  return DB_CONFIG.EMAIL_REGEX.test(email);
}

function formatPrice(price) {
  return `${parseFloat(price).toFixed(2)}`;
}

function isDatabaseConnectionError(error) {
  const connectionErrors = ['timeout', 'connect', 'ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT'];
  return connectionErrors.some(trigger => 
    error.message.toLowerCase().includes(trigger.toLowerCase())
  );
}

// Database connection with proper error handling
async function queryDatabase(query, params) {
  const neonClient = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  
  const timeout = new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Database connection timeout after ${DB_CONFIG.CONNECTION_TIMEOUT / 1000} seconds`)), DB_CONFIG.CONNECTION_TIMEOUT);
  });
  
  try {
    console.log('[INFO] Attempting database connection...');
    await Promise.race([neonClient.connect(), timeout]);
    console.log('[INFO] Database connection successful');
    
    const { rows } = await neonClient.query(query, params);
    return rows;
  } catch (error) {
    console.error('[ERROR] Database query error:', error);
    throw error;
  } finally {
    try {
      await neonClient.end();
    } catch (err) {
      console.error('[ERROR] Error closing database connection:', err);
    }
  }
}

// Table existence check with proper error handling
async function checkTableExists(tableName) {
  try {
    const result = await queryDatabase(
      `SELECT EXISTS (
         SELECT FROM information_schema.tables 
         WHERE table_name = $1
       )`,
      [tableName]
    );
    return result[0].exists;
  } catch (error) {
    console.error('[ERROR] Failed to check table existence:', error);
    throw new Error(`Unable to verify table "${tableName}" exists. Database connection failed: ${error.message}`);
  }
}

const databaseQueryTool = tool({
  description: 'Query the database for customers, products, orders, or support tickets. Requires email parameter for all user-specific queries to ensure data security.',
  parameters: z.object({
    type: z.enum(['customer', 'product', 'order', 'ticket']).describe('Type of query: "customer", "product", "order", or "ticket"'),
    email: z.string().email().describe('User email address - required for all queries to ensure data security and privacy'),
    identifiers: z
      .array(
        z.object({
          productId: z.string().optional().describe('Product ID to filter by'),
          orderId: z.string().optional().describe('Order ID to filter by'),
          ticketId: z.string().optional().describe('Ticket ID to filter by'),
        })
      )
      .optional()
      .describe('Additional identifiers for filtering (optional when email is provided)'),
  }),
  execute: async ({ type, email, identifiers = [] }) => {
    console.log('[DEBUG] Executing database query:', { type, email, identifiers });

    // Validate email parameter is provided and valid
    if (!email) {
      throw new Error('Email parameter is required for all database queries to ensure data security');
    }

    if (!isValidEmail(email)) {
      throw new Error(`Invalid email format: ${email}. Please provide a valid email address.`);
    }

    try {
      // Test database connection first
      await queryDatabase('SELECT 1', []);
      
      // With email-based security, we only need additional validation for product queries
      if (type === 'product' && !identifiers.some((id) => id.productId)) {
        throw new Error('productId is required for product queries');
      }

      // Additional validation for identifiers if provided
      if (identifiers && identifiers.length > 0) {
        identifiers.forEach((id) => {
          if (id.orderId && isNaN(parseInt(id.orderId))) {
            throw new Error(`Invalid order ID format: ${id.orderId}`);
          }
          if (id.ticketId && isNaN(parseInt(id.ticketId))) {
            throw new Error(`Invalid ticket ID format: ${id.ticketId}`);
          }
          if (id.productId && isNaN(parseInt(id.productId))) {
            throw new Error(`Invalid product ID format: ${id.productId}`);
          }
        });
      }

      const tableName = DB_CONFIG.TABLE_MAP[type];
      const tableExists = await checkTableExists(tableName);
      
      if (!tableExists) {
        throw new Error(`Table "${tableName}" does not exist. Please contact support.`);
      }

      let result;
      switch (type) {
        case 'customer':
          result = await queryDatabase(
            `SELECT id, name, email, phone, address 
             FROM customer 
             WHERE email = $1`,
            [email]
          );
          
          const customerData = {
            type: 'customer',
            data: result.map((customer) => ({
              id: customer.id,
              name: customer.name || 'Unknown',
              email: customer.email,
              phone: customer.phone || 'Not provided',
              address: customer.address || 'Not provided',
            })),
            summary: result.length > 0
              ? `Found ${result.length} customer(s)`
              : 'No customers found',
            llm_formatted_data: result.length > 0
              ? result.map((customer) => 
                  `- **Customer #${customer.id}**: ${customer.name || 'Unknown'}\n  - **Email**: ${customer.email}\n  - **Phone**: ${customer.phone || 'Not provided'}\n  - **Address**: ${customer.address || 'Not provided'}`
                ).join('\n')
              : 'No customer found with that email address.'
          };
          
          console.log('[INFO] Returning formatted customer data:', JSON.stringify(customerData, null, 2));
          return customerData;

        case 'product':
          const productIds = identifiers.map((id) => parseInt(id.productId)).filter(Boolean);
          result = await queryDatabase(
            `SELECT id, name, price, description, stock 
             FROM product 
             WHERE id = ANY($1)`,
            [productIds]
          );
          
          const productData = {
            type: 'product',
            data: result.map((product) => ({
              id: product.id,
              name: product.name,
              price: formatPrice(product.price),
              description: product.description || 'No description',
              stock: product.stock,
              available: product.stock > 0 ? 'In stock' : 'Out of stock',
            })),
            summary: result.length > 0
              ? `Found ${result.length} product(s)`
              : 'No products found',
            llm_formatted_data: result.length > 0
              ? `| **ID** | **Name** | **Price** | **Stock** | **Description** |\n|--------|----------|-----------|-----------|-----------------|\n` +
                result.map((product) => 
                  `| ${product.id} | ${product.name} | ${formatPrice(product.price)} | ${product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'} | ${product.description || 'No description'} |`
                ).join('\n')
              : 'No products found matching your criteria.'
          };
          
          console.log('[INFO] Returning formatted product data:', JSON.stringify(productData, null, 2));
          return productData;

        case 'order':
          // Build query with email-based filtering for security
          let orderQuery = `SELECT o.id, o.order_date, o.total, o.status, 
                           c.name AS customer_name, c.email AS customer_email,
                           p.name AS product_name, p.price AS product_price
                    FROM "order" o
                    JOIN customer c ON o.customer_id = c.id
                    JOIN product p ON o.product_id = p.id
                    WHERE c.email = $1`;
          let orderParams = [email];

          // Add additional filtering by order ID if provided
          if (identifiers.some(id => id.orderId)) {
            const orderIds = identifiers.map(id => parseInt(id.orderId)).filter(Boolean);
            orderQuery += ` AND o.id = ANY($2)`;
            orderParams.push(orderIds);
          }

          console.log('[DEBUG] Order query:', {
            query: orderQuery,
            params: orderParams
          });

          result = await queryDatabase(orderQuery, orderParams);
          
          const orderData = {
            type: 'order',
            data: result.map((order) => ({
              id: order.id,
              customer: {
                name: order.customer_name || 'Unknown',
                email: order.customer_email,
              },
              product: {
                name: order.product_name,
                price: formatPrice(order.product_price),
              },
              status: order.status,
              orderDate: new Date(order.order_date).toISOString(),
            })),
            summary: result.length > 0
              ? `Found ${result.length} order(s)`
              : 'No orders found',
            llm_formatted_data: result.length > 0
              ? result.map((order) => 
                  `- **Order #${order.id}**: ${order.product_name}\n  - **Price**: ${formatPrice(order.product_price)}\n  - **Status**: ${order.status}\n  - **Ordered on**: ${new Date(order.order_date).toLocaleDateString()}`
                ).join('\n')
              : 'No orders found for this customer.'
          };
          
          console.log('[INFO] Returning formatted order data:', JSON.stringify(orderData, null, 2));
          return orderData;

        case 'ticket':
          // Build query with email-based filtering for security
          let ticketQuery = `SELECT st.id, st.issue, st.status, st.created_at,
                            c.name AS customer_name, c.email AS customer_email
                     FROM support_ticket st
                     JOIN customer c ON st.customer_id = c.id
                     WHERE c.email = $1`;
          let ticketParams = [email];

          // Add additional filtering by ticket ID if provided
          if (identifiers.some(id => id.ticketId)) {
            const ticketIds = identifiers.map(id => parseInt(id.ticketId)).filter(Boolean);
            ticketQuery += ` AND st.id = ANY($2)`;
            ticketParams.push(ticketIds);
          }

          result = await queryDatabase(ticketQuery, ticketParams);
          
          const ticketData = {
            type: 'ticket',
            data: result.map((ticket) => ({
              id: ticket.id,
              customer: {
                name: ticket.customer_name || 'Unknown',
                email: ticket.customer_email,
              },
              issue: ticket.issue,
              status: ticket.status,
              createdAt: new Date(ticket.created_at).toISOString(),
            })),
            summary: result.length > 0
              ? `Found ${result.length} support ticket(s)`
              : 'No support tickets found',
            llm_formatted_data: result.length > 0
              ? result.map((ticket) => 
                  `- **Ticket #${ticket.id}**: ${ticket.issue}\n  - **Status**: ${ticket.status}\n  - **Created**: ${new Date(ticket.created_at).toLocaleDateString()}\n  - **Customer**: ${ticket.customer_name || 'Unknown'} (${ticket.customer_email})`
                ).join('\n')
              : 'No support tickets found for this customer.'
          };
          
          console.log('[INFO] Returning formatted ticket data:', JSON.stringify(ticketData, null, 2));
          return ticketData;

        default:
          throw new Error(`Invalid query type: ${type}`);
      }
    } catch (error) {
      console.error('[ERROR] Database query error:', error);
      
      // Return proper error response without fallback data
      const errorMessage = isDatabaseConnectionError(error) 
        ? 'Database is currently unavailable. Please try again later or contact support.'
        : `Query failed: ${error.message}`;
      
      return {
        error: true,
        message: errorMessage,
        suggestion: isDatabaseConnectionError(error)
          ? 'Please check your internet connection and try again, or contact support if the issue persists.'
          : 'Please verify your request parameters and try again.',
      };
    }
  },
});

console.log('[DEBUG] Exported databaseQueryTool:', {
  hasDescription: !!databaseQueryTool.description,
  hasParameters: !!databaseQueryTool.parameters,
  hasExecute: !!databaseQueryTool.execute,
});

export { databaseQueryTool };