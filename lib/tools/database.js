// lib/tools/database.js
import { z } from 'zod';
import { tool } from 'ai';
import { Client } from '@neondatabase/serverless';

console.log('[DEBUG] Initializing databaseQueryTool');

async function queryDatabase(query, params) {
  const neonClient = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  try {
    await neonClient.connect();
    const { rows } = await neonClient.query(query, params);
    return rows;
  } catch (error) {
    console.error('[ERROR] Database query error:', error);
    throw error;
  } finally {
    await neonClient.end();
  }
}

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
    return false;
  }
}

const databaseQueryTool = tool({
  description: 'Query the database for products, orders, or support tickets. Requires specific identifiers like productId, orderId, ticketId, or email.',
  parameters: z.object({
    type: z.enum(['product', 'order', 'ticket']).describe('Type of query: "product", "order", or "ticket"'),
    identifiers: z.array(
      z.object({
        productId: z.string().optional().describe('Product ID to filter by'),
        orderId: z.string().optional().describe('Order ID to filter by'),
        ticketId: z.string().optional().describe('Ticket ID to filter by'),
        email: z.string().optional().describe('Customer email to filter by (must be a valid email address)'),
      })
    ).min(1).describe('At least one identifier is required for the query'),
  }),
  execute: async ({ type, identifiers }) => {
    console.log('[DEBUG] Executing database query:', { type, identifiers });

    try {
      // Validate identifiers
      if (type === 'product' && !identifiers.some(id => id.productId)) {
        throw new Error('productId is required for product queries');
      }
      if (type === 'order' && !identifiers.some(id => id.orderId || id.email)) {
        throw new Error('Either orderId or email is required for order queries');
      }
      if (type === 'ticket' && !identifiers.some(id => id.ticketId || id.email)) {
        throw new Error('Either ticketId or email is required for ticket queries');
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      identifiers.forEach(id => {
        if (id.email && !emailRegex.test(id.email)) {
          throw new Error(`Invalid email format: ${id.email}`);
        }
      });

      // Check table existence
      const tableMap = {
        product: 'product',
        order: 'order',
        ticket: 'support_ticket',
      };
      const tableName = tableMap[type];
      const tableExists = await checkTableExists(tableName);
      if (!tableExists) {
        throw new Error(`Table "${tableName}" does not exist in the database. Please contact support to set up the database.`);
      }

      let result;
      switch (type) {
        case 'product':
          const productIds = identifiers.map(id => parseInt(id.productId)).filter(Boolean);
          result = await queryDatabase(
            `SELECT id, name, price, description, stock 
             FROM product 
             WHERE id = ANY($1)`,
            [productIds]
          );
          return {
            type: 'product',
            data: result.map(product => ({
              id: product.id,
              name: product.name,
              price: `$${parseFloat(product.price).toFixed(2)}`,
              description: product.description || 'No description available',
              stock: product.stock,
              available: product.stock > 0 ? 'In stock' : 'Out of stock',
            })),
            summary: result.length > 0 
              ? `Found ${result.length} product(s) matching the provided IDs`
              : 'No products found for the provided IDs',
          };

        case 'order':
          const orderConditions = identifiers
            .map((id, index) => {
              if (id.orderId) return `o.id = $${index + 1}`;
              if (id.email) return `c.email = $${index + 1}`;
              return null;
            })
            .filter(Boolean)
            .join(' OR ');
          const orderParams = identifiers
            .map(id => id.orderId ? parseInt(id.orderId) : id.email)
            .filter(Boolean);
          
          if (!orderConditions) {
            throw new Error('Invalid order query parameters');
          }

          result = await queryDatabase(
            `SELECT o.id, o.order_date, o.total, o.status, 
                    c.name AS customer_name, c.email AS customer_email,
                    p.name AS product_name, p.price AS product_price
             FROM "order" o
             JOIN customer c ON o.customer_id = c.id
             JOIN product p ON o.product_id = p.id
             WHERE ${orderConditions}`,
            orderParams
          );
          return {
            type: 'order',
            data: result.map(order => ({
              id: order.id,
              customer: {
                name: order.customer_name || 'Unknown',
                email: order.customer_email,
              },
              product: {
                name: order.product_name,
                price: `$${parseFloat(order.product_price).toFixed(2)}`,
              },
              status: order.status,
              orderDate: new Date(order.order_date).toISOString(),
            })),
            summary: result.length > 0 
              ? `Found ${result.length} order(s) for the provided identifiers`
              : 'No orders found for the provided email or order ID',
          };

        case 'ticket':
          const ticketConditions = identifiers
            .map((id, index) => {
              if (id.ticketId) return `st.id = $${index + 1}`;
              if (id.email) return `c.email = $${index + 1}`;
              return null;
            })
            .filter(Boolean)
            .join(' OR ');
          const ticketParams = identifiers
            .map(id => id.ticketId ? parseInt(id.ticketId) : id.email)
            .filter(Boolean);
          
          if (!orderConditions) {
            throw new Error('Invalid ticket query parameters');
          }

          result = await queryDatabase(
            `SELECT st.id, st.issue, st.status, st.created_at,
                    c.name AS customer_name, c.email AS customer_email
             FROM support_ticket st
             JOIN customer c ON st.customer_id = c.id
             WHERE ${ticketConditions}`,
            ticketParams
          );
          return {
            type: 'ticket',
            data: result.map(ticket => ({
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
              ? `Found ${result.length} support ticket(s) for the provided identifiers`
              : 'No support tickets found for the provided email or ticket ID',
          };

        default:
          throw new Error(`Invalid query type: ${type}`);
      }
    } catch (error) {
      console.error('[ERROR] Database query error:', error);
      return {
        error: true,
        message: `Database query failed: ${error.message}`,
        suggestion: 'Please provide specific identifiers like orderId, ticketId, productId, or a valid email, or contact support if the issue persists',
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