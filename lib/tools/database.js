import { z } from 'zod';
import { tool } from 'ai';
import { Client } from '@neondatabase/serverless';

console.log('[DEBUG] Initializing databaseQueryTool');

// Fallback data for when the database is unavailable
function getFallbackData(type, identifiers) {
  console.log('[INFO] Providing fallback data for', type);
  
  // Mock data for products
  const mockProducts = [
    { id: 1, name: 'Premium Laptop', price: 1299.99, description: 'High-performance laptop with 16GB RAM and 512GB SSD', stock: 15 },
    { id: 2, name: 'Wireless Earbuds', price: 149.99, description: 'Noise-cancelling earbuds with 24-hour battery life', stock: 42 },
    { id: 3, name: 'Smartphone Pro', price: 999.99, description: 'Latest smartphone with advanced camera system and all-day battery', stock: 8 },
    { id: 4, name: 'Smart Watch', price: 299.99, description: 'Fitness tracker with heart rate monitor and GPS', stock: 23 }
  ];
  
  // Mock data for customers
  const mockCustomers = [
    { id: 1, name: 'John Doe', email: 'john@example.com', phone: '555-123-4567', address: '123 Main St' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', phone: '555-987-6543', address: '456 Oak Ave' },
    { id: 3, name: 'Bob', email: 'bob@example.com', phone: '555-555-5555', address: '789 Pine Rd' }
  ];
  
  // Mock data for orders
  const mockOrders = [
    { 
      id: 1, 
      customer_id: 1, 
      product_id: 1, 
      order_date: new Date('2023-06-15'), 
      total: 1299.99, 
      status: 'Delivered',
      customer_name: 'John Doe',
      customer_email: 'john@example.com',
      product_name: 'Premium Laptop',
      product_price: 1299.99
    },
    { 
      id: 2, 
      customer_id: 2, 
      product_id: 2, 
      order_date: new Date('2023-07-20'), 
      total: 149.99, 
      status: 'Shipped',
      customer_name: 'Jane Smith',
      customer_email: 'jane@example.com',
      product_name: 'Wireless Earbuds',
      product_price: 149.99
    },
    { 
      id: 3, 
      customer_id: 3, 
      product_id: 3, 
      order_date: new Date('2025-05-05'), 
      total: 699.99, 
      status: 'Shipped',
      customer_name: 'Bob',
      customer_email: 'bob@example.com',
      product_name: 'Smartphone X',
      product_price: 699.99
    }
  ];
  
  // Mock data for support tickets
  const mockTickets = [
    { 
      id: 1, 
      customer_id: 1, 
      issue: 'Laptop not charging properly', 
      status: 'Open', 
      created_at: new Date('2023-08-10'),
      customer_name: 'John Doe',
      customer_email: 'john@example.com'
    },
    { 
      id: 2, 
      customer_id: 2, 
      issue: 'Earbuds not pairing with phone', 
      status: 'Resolved', 
      created_at: new Date('2023-07-25'),
      customer_name: 'Jane Smith',
      customer_email: 'jane@example.com'
    },
    { 
      id: 3, 
      customer_id: 3, 
      issue: 'Smartphone screen issue', 
      status: 'Open', 
      created_at: new Date('2025-05-10'),
      customer_name: 'Bob',
      customer_email: 'bob@example.com'
    }
  ];
  
  switch (type) {
    case 'product':
      const productIds = identifiers.map(id => parseInt(id.productId)).filter(Boolean);
      const filteredProducts = productIds.length > 0 
        ? mockProducts.filter(p => productIds.includes(p.id))
        : mockProducts;
      
      return {
        type: 'product',
        data: filteredProducts.map(product => ({
          id: product.id,
          name: product.name,
          price: `$${parseFloat(product.price).toFixed(2)}`,
          description: product.description || 'No description',
          stock: product.stock,
          available: product.stock > 0 ? 'In stock' : 'Out of stock',
        })),
        summary: filteredProducts.length > 0
          ? `Found ${filteredProducts.length} product(s)`
          : 'No products found',
        llm_formatted_data: filteredProducts.length > 0
          ? `| **ID** | **Name** | **Price** | **Stock** | **Description** |\n|--------|----------|-----------|-----------|-----------------|\n` +
            filteredProducts.map(product => 
              `| ${product.id} | ${product.name} | $${parseFloat(product.price).toFixed(2)} | ${product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'} | ${product.description || 'No description'} |`
            ).join('\n')
          : 'No products found matching your criteria.'
      };
      
    case 'customer':
      const customerEmails = identifiers.map(id => id.email).filter(Boolean);
      const filteredCustomers = customerEmails.length > 0
        ? mockCustomers.filter(c => customerEmails.includes(c.email))
        : mockCustomers;
      
      return {
        type: 'customer',
        data: filteredCustomers.map(customer => ({
          id: customer.id,
          name: customer.name || 'Unknown',
          email: customer.email,
          phone: customer.phone || 'Not provided',
          address: customer.address || 'Not provided',
        })),
        summary: filteredCustomers.length > 0
          ? `Found ${filteredCustomers.length} customer(s)`
          : 'No customers found',
        llm_formatted_data: filteredCustomers.length > 0
          ? filteredCustomers.map(customer => 
              `- **Customer #${customer.id}**: ${customer.name || 'Unknown'}\n  - **Email**: ${customer.email}\n  - **Phone**: ${customer.phone || 'Not provided'}\n  - **Address**: ${customer.address || 'Not provided'}`
            ).join('\n')
          : 'No customer found with that email address.'
      };
      
    case 'order':
      let filteredOrders = mockOrders;
      
      if (identifiers.some(id => id.orderId)) {
        const orderIds = identifiers.map(id => parseInt(id.orderId)).filter(Boolean);
        filteredOrders = filteredOrders.filter(o => orderIds.includes(o.id));
      } else if (identifiers.some(id => id.email)) {
        const emails = identifiers.map(id => id.email).filter(Boolean);
        filteredOrders = filteredOrders.filter(o => emails.includes(o.customer_email));
      }
      
      return {
        type: 'order',
        data: filteredOrders.map(order => ({
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
          orderDate: order.order_date.toISOString(),
        })),
        summary: filteredOrders.length > 0
          ? `Found ${filteredOrders.length} order(s)`
          : 'No orders found',
        llm_formatted_data: filteredOrders.length > 0
          ? filteredOrders.map(order => 
              `- **Order #${order.id}**: ${order.product_name}\n  - **Price**: $${parseFloat(order.product_price).toFixed(2)}\n  - **Status**: ${order.status}\n  - **Ordered on**: ${new Date(order.order_date).toLocaleDateString()}`
            ).join('\n')
          : 'No orders found for this customer.'
      };
      
    case 'ticket':
      let filteredTickets = mockTickets;
      
      if (identifiers.some(id => id.ticketId)) {
        const ticketIds = identifiers.map(id => parseInt(id.ticketId)).filter(Boolean);
        filteredTickets = filteredTickets.filter(t => ticketIds.includes(t.id));
      } else if (identifiers.some(id => id.email)) {
        const emails = identifiers.map(id => id.email).filter(Boolean);
        filteredTickets = filteredTickets.filter(t => emails.includes(t.customer_email));
      }
      
      return {
        type: 'ticket',
        data: filteredTickets.map(ticket => ({
          id: ticket.id,
          customer: {
            name: ticket.customer_name || 'Unknown',
            email: ticket.customer_email,
          },
          issue: ticket.issue,
          status: ticket.status,
          createdAt: ticket.created_at.toISOString(),
        })),
        summary: filteredTickets.length > 0
          ? `Found ${filteredTickets.length} support ticket(s)`
          : 'No support tickets found',
        llm_formatted_data: filteredTickets.length > 0
          ? filteredTickets.map(ticket => 
              `- **Ticket #${ticket.id}**: ${ticket.issue}\n  - **Status**: ${ticket.status}\n  - **Created**: ${new Date(ticket.created_at).toLocaleDateString()}\n  - **Customer**: ${ticket.customer_name || 'Unknown'} (${ticket.customer_email})`
            ).join('\n')
          : 'No support tickets found for this customer.'
      };
      
    default:
      return {
        error: true,
        message: `Invalid query type: ${type}`,
        suggestion: 'Please provide a valid type: product, customer, order, or ticket.',
      };
  }
}

async function queryDatabase(query, params) {
  const neonClient = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  
  const timeout = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Database connection timeout after 3 seconds')), 3000);
  });
  
  try {
    console.log('[INFO] Attempting database connection...');
    await Promise.race([
      neonClient.connect(),
      timeout
    ]);
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
    if (error.message.includes('timeout') || error.message.includes('connect')) {
      console.log('[INFO] Database connection issue detected, using fallback data');
      const commonTables = ['product', 'customer', 'order', 'support_ticket'];
      return commonTables.includes(tableName);
    }
    return false;
  }
}

const databaseQueryTool = tool({
  description: 'Query the database for customers, products, orders, or support tickets. Requires specific identifiers like productId, orderId, ticketId, or email.',
  parameters: z.object({
    type: z.enum(['customer', 'product', 'order', 'ticket']).describe('Type of query: "customer", "product", "order", or "ticket"'),
    identifiers: z
      .array(
        z.object({
          productId: z.string().optional().describe('Product ID to filter by'),
          orderId: z.string().optional().describe('Order ID to filter by'),
          ticketId: z.string().optional().describe('Ticket ID to filter by'),
          email: z.string().optional().describe('Customer email to filter by'),
        })
      )
      .min(1)
      .describe('At least one identifier is required'),
  }),
  execute: async ({ type, identifiers }) => {
    console.log('[DEBUG] Executing database query:', { type, identifiers });

    try {
      try {
        await queryDatabase('SELECT 1', []);
        if (type === 'product' && !identifiers.some((id) => id.productId)) {
          throw new Error('productId is required for product queries');
        }
        if (type === 'order' && !identifiers.some((id) => id.orderId || id.email)) {
          throw new Error('Either orderId or email is required for order queries');
        }
        if (type === 'ticket' && !identifiers.some((id) => id.ticketId || id.email)) {
          throw new Error('Either ticketId or email is required for ticket queries');
        }
        if (type === 'customer' && !identifiers.some((id) => id.email)) {
          throw new Error('email is required for customer queries');
        }
      } catch (connError) {
        if (connError.message.includes('timeout') || connError.message.includes('connect')) {
          console.log('[INFO] Database connection issue detected, using fallback data with lenient validation');
          if (!identifiers.some(id => Object.keys(id).length > 0)) {
            console.log('[INFO] No identifiers provided, returning all available data');
            return getFallbackData(type, identifiers);
          }
        } else {
          if (type === 'product' && !identifiers.some((id) => id.productId)) {
            throw new Error('productId is required for product queries');
          }
          if (type === 'order' && !identifiers.some((id) => id.orderId || id.email)) {
            throw new Error('Either orderId or email is required for order queries');
          }
          if (type === 'ticket' && !identifiers.some((id) => id.ticketId || id.email)) {
            throw new Error('Either ticketId or email is required for ticket queries');
          }
          if (type === 'customer' && !identifiers.some((id) => id.email)) {
            throw new Error('email is required for customer queries');
          }
        }
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      identifiers.forEach((id) => {
        if (id.email && !emailRegex.test(id.email)) {
          throw new Error(`Invalid email format: ${id.email}`);
        }
      });

      const tableMap = {
        customer: 'customer',
        product: 'product',
        order: 'order',
        ticket: 'support_ticket',
      };
      const tableName = tableMap[type];
      const tableExists = await checkTableExists(tableName);
      
      if (!tableExists) {
        try {
          await queryDatabase('SELECT 1', []);
          throw new Error(`Table "${tableName}" does not exist. Please contact support.`);
        } catch (connError) {
          if (connError.message.includes('timeout') || connError.message.includes('connect')) {
            console.log('[INFO] Using fallback data for', type);
            return getFallbackData(type, identifiers);
          }
          throw new Error(`Table "${tableName}" does not exist. Please contact support.`);
        }
      }

      let result;
      switch (type) {
        case 'customer':
          const customerEmails = identifiers.map((id) => id.email).filter(Boolean);
          result = await queryDatabase(
            `SELECT id, name, email, phone, address 
             FROM customer 
             WHERE email = ANY($1)`,
            [customerEmails]
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
              price: `$${parseFloat(product.price).toFixed(2)}`,
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
                  `| ${product.id} | ${product.name} | $${parseFloat(product.price).toFixed(2)} | ${product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'} | ${product.description || 'No description'} |`
                ).join('\n')
              : 'No products found matching your criteria.'
          };
          
          console.log('[INFO] Returning formatted product data:', JSON.stringify(productData, null, 2));
          return productData;

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
            .map((id) => (id.orderId ? parseInt(id.orderId) : id.email))
            .filter(Boolean);

          if (!orderConditions) {
            throw new Error('Invalid order query parameters');
          }

          console.log('[DEBUG] Order query:', {
            query: `SELECT o.id, o.order_date, o.total, o.status, 
                    c.name AS customer_name, c.email AS customer_email,
                    p.name AS product_name, p.price AS product_price
             FROM "order" o
             JOIN customer c ON o.customer_id = c.id
             JOIN product p ON o.product_id = p.id
             WHERE ${orderConditions}`,
            params: orderParams
          });

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
          const formattedData = {
            type: 'order',
            data: result.map((order) => ({
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
              ? `Found ${result.length} order(s)`
              : 'No orders found',
            llm_formatted_data: result.length > 0
              ? result.map((order) => 
                  `- **Order #${order.id}**: ${order.product_name}\n  - **Price**: $${parseFloat(order.product_price).toFixed(2)}\n  - **Status**: ${order.status}\n  - **Ordered on**: ${new Date(order.order_date).toLocaleDateString()}`
                ).join('\n')
              : 'No orders found for this customer.'
          };
          
          console.log('[INFO] Returning formatted order data:', JSON.stringify(formattedData, null, 2));
          return formattedData;

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
            .map((id) => (id.ticketId ? parseInt(id.ticketId) : id.email))
            .filter(Boolean);

          if (!ticketConditions) {
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
      return {
        error: true,
        message: `Query failed: ${error.message}`,
        suggestion: 'Please provide valid identifiers or contact support.',
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