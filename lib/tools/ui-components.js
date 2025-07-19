import { z } from 'zod';
import { tool } from 'ai';
import { nanoid } from 'nanoid';

// Email validation utility
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(email) {
  return EMAIL_REGEX.test(email);
}

// Filter data by email for security
function filterDataByEmail(data, userEmail, emailField = 'email') {
  if (!userEmail || !isValidEmail(userEmail)) {
    return [];
  }

  return data.filter(item => {
    // Handle nested email fields (e.g., customer.email)
    if (emailField.includes('.')) {
      const [parent, field] = emailField.split('.');
      return item[parent] && item[parent][field] === userEmail;
    }
    return item[emailField] === userEmail;
  });
}

// Tool for generating UserCard components with ServerCardWrapper
export const userCardTool = tool({
  description: 'Generate UserCard components to display customer information in a visually appealing card format. Use this when showing customer details, profiles, or user information. Requires email parameter for security.',
  parameters: z.object({
    email: z.string().email().describe('User email address - required for data security and filtering'),
    users: z
      .array(
        z.object({
          id: z.union([z.string(), z.number()]).optional().describe('User/Customer ID'),
          name: z.string().describe('Customer name'),
          email: z.string().optional().describe('Customer email address'),
          phone: z.string().optional().describe('Customer phone number'),
          address: z.string().optional().describe('Customer address'),
        })
      )
      .min(1)
      .describe('Array of user/customer objects to display in cards'),
  }),
  execute: async ({ email, users }) => {
    // Validate email parameter
    if (!email || !isValidEmail(email)) {
      throw new Error('Valid email address is required for user card generation');
    }

    // Filter users by email for security
    const filteredUsers = filterDataByEmail(users, email, 'email');

    if (filteredUsers.length === 0) {
      return {
        type: 'ui_components',
        components: [],
        summary: 'No user data found for the provided email address',
        text_response: 'No customer information found for your account.',
        error: 'No matching user data found'
      };
    }

    const components = filteredUsers.map((user) => ({
      component: 'ServerCardWrapper',
      props: {
        type: 'user',
        data: {
          id: user.id,
          name: user.name,
          email: user.email || 'Not provided',
          phone: user.phone || 'Not provided',
          address: user.address || 'Not provided',
        },
        loading: false,
        fallbackToMarkdown: true
      }
    }));

    return {
      type: 'ui_components',
      components,
      summary: `Generated ${filteredUsers.length} user card component(s)`,
      text_response: `Here ${filteredUsers.length === 1 ? 'is' : 'are'} your customer detail${filteredUsers.length === 1 ? '' : 's'}:`
    };
  }
});

// Tool for generating ProductCard components with ServerCardWrapper
export const productCardTool = tool({
  description: 'Generate ProductCard components to display product information in a visually appealing card format. Use this when showing product details, catalogs, or inventory information. Requires email parameter for security.',
  parameters: z.object({
    email: z.string().email().describe('User email address - required for data security and filtering'),
    products: z
      .array(
        z.object({
          id: z.union([z.string(), z.number()]).optional().describe('Product ID'),
          name: z.string().describe('Product name'),
          price: z.union([z.string(), z.number()]).describe('Product price'),
          description: z.string().optional().describe('Product description'),
          stock: z.number().optional().describe('Available stock quantity'),
        })
      )
      .min(1)
      .describe('Array of product objects to display in cards'),
  }),
  execute: async ({ email, products }) => {
    // Validate email parameter
    if (!email || !isValidEmail(email)) {
      throw new Error('Valid email address is required for product card generation');
    }

    // Note: Products don't typically have email filtering, but we validate the user has access
    // In a real scenario, you might filter products based on user permissions or purchase history
    const components = products.map((product) => ({
      component: 'ServerCardWrapper',
      props: {
        type: 'product',
        data: {
          id: product.id,
          name: product.name,
          price: typeof product.price === 'number' ? product.price : parseFloat(product.price.replace('$', '')) || 0,
          description: product.description || 'No description available',
          stock: product.stock || 0,
        },
        loading: false,
        fallbackToMarkdown: true
      }
    }));

    return {
      type: 'ui_components',
      components,
      summary: `Generated ${products.length} product card component(s)`,
      text_response: `Here ${products.length === 1 ? 'is' : 'are'} the product detail${products.length === 1 ? '' : 's'}:`
    };
  }
});

// Tool for generating OrderCard components with ServerCardWrapper
export const orderCardTool = tool({
  description: 'Generate OrderCard components to display order information in a visually appealing card format. Use this when showing order history, order details, or order tracking information. Requires email parameter for security.',
  parameters: z.object({
    email: z.string().email().describe('User email address - required for data security and filtering'),
    orders: z
      .array(
        z.object({
          id: z.union([z.string(), z.number()]).describe('Order ID'),
          customer: z.object({
            name: z.string().optional().describe('Customer name'),
            email: z.string().optional().describe('Customer email'),
          }).optional().describe('Customer information'),
          product: z.object({
            name: z.string().optional().describe('Product name'),
            price: z.union([z.string(), z.number()]).optional().describe('Product price'),
          }).optional().describe('Product information'),
          status: z.string().optional().describe('Order status'),
          orderDate: z.string().optional().describe('Order date (ISO string)'),
          order_date: z.string().optional().describe('Alternative order date field'),
          total: z.union([z.string(), z.number()]).optional().describe('Order total amount'),
        })
      )
      .min(1)
      .describe('Array of order objects to display in cards'),
  }),
  execute: async ({ email, orders }) => {
    // Validate email parameter
    if (!email || !isValidEmail(email)) {
      throw new Error('Valid email address is required for order card generation');
    }

    // Filter orders by customer email for security
    const filteredOrders = filterDataByEmail(orders, email, 'customer.email');

    if (filteredOrders.length === 0) {
      return {
        type: 'ui_components',
        components: [],
        summary: 'No order data found for the provided email address',
        text_response: 'No orders found for your account.',
        error: 'No matching order data found'
      };
    }

    const components = filteredOrders.map((order) => ({
      component: 'ServerCardWrapper',
      props: {
        type: 'order',
        data: {
          id: order.id,
          customer: order.customer || { name: 'Unknown', email: '' },
          product: order.product || { name: 'Unknown Product', price: 0 },
          status: order.status || 'Unknown',
          orderDate: order.orderDate || order.order_date,
          total: order.total || 0,
        },
        loading: false,
        fallbackToMarkdown: true
      }
    }));

    return {
      type: 'ui_components',
      components,
      summary: `Generated ${filteredOrders.length} order card component(s)`,
      text_response: `Here ${filteredOrders.length === 1 ? 'is' : 'are'} your order detail${filteredOrders.length === 1 ? '' : 's'}:`
    };
  }
});

// Tool for generating TicketCard components with ServerCardWrapper
export const supportTicketCardTool = tool({
  description: 'Generate TicketCard components to display support ticket information in a visually appealing card format. Use this when showing support requests, help tickets, or customer service issues. Requires email parameter for security.',
  parameters: z.object({
    email: z.string().email().describe('User email address - required for data security and filtering'),
    tickets: z
      .array(
        z.object({
          id: z.union([z.string(), z.number()]).describe('Ticket ID'),
          customer: z.object({
            name: z.string().optional().describe('Customer name'),
            email: z.string().optional().describe('Customer email'),
          }).optional().describe('Customer information'),
          issue: z.string().describe('Description of the issue'),
          status: z.string().optional().describe('Ticket status'),
          createdAt: z.string().optional().describe('Ticket creation date (ISO string)'),
          created_at: z.string().optional().describe('Alternative creation date field'),
        })
      )
      .min(1)
      .describe('Array of support ticket objects to display in cards'),
  }),
  execute: async ({ email, tickets }) => {
    // Validate email parameter
    if (!email || !isValidEmail(email)) {
      throw new Error('Valid email address is required for support ticket card generation');
    }

    // Filter tickets by customer email for security
    const filteredTickets = filterDataByEmail(tickets, email, 'customer.email');

    if (filteredTickets.length === 0) {
      return {
        type: 'ui_components',
        components: [],
        summary: 'No support ticket data found for the provided email address',
        text_response: 'No support tickets found for your account.',
        error: 'No matching support ticket data found'
      };
    }

    const components = filteredTickets.map((ticket) => ({
      component: 'ServerCardWrapper',
      props: {
        type: 'ticket',
        data: {
          id: ticket.id,
          customer: ticket.customer || { name: 'Unknown', email: '' },
          issue: ticket.issue,
          status: ticket.status || 'Open',
          createdAt: ticket.createdAt || ticket.created_at,
        },
        loading: false,
        fallbackToMarkdown: true
      }
    }));

    return {
      type: 'ui_components',
      components,
      summary: `Generated ${filteredTickets.length} support ticket card component(s)`,
      text_response: `Here ${filteredTickets.length === 1 ? 'is' : 'are'} your support ticket detail${filteredTickets.length === 1 ? '' : 's'}:`
    };
  }
});