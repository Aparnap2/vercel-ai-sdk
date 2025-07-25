// app/actions.js
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

export const generateSQLQuery = async (input) => {
  'use server';
  try {
    const result = await generateObject({
      model: google('gemini-1.5-flash'),
      system: `
        You are a SQL (PostgreSQL) expert. Generate a SQL query to retrieve data based on the user's natural language input. The table schema is:

        customer (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255),
          email VARCHAR(255) UNIQUE NOT NULL,
          phone VARCHAR(50),
          address TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        product (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          price FLOAT NOT NULL,
          stock INTEGER NOT NULL,
          image VARCHAR(255)
        );

        "order" (
          id SERIAL PRIMARY KEY,
          customer_id INTEGER REFERENCES customer(id),
          product_id INTEGER REFERENCES product(id),
          order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          total FLOAT NOT NULL,
          status VARCHAR(50) NOT NULL
        );

        support_ticket (
          id SERIAL PRIMARY KEY,
          customer_id INTEGER REFERENCES customer(id),
          issue TEXT NOT NULL,
          status VARCHAR(50) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        Rules:
        - Only SELECT queries are allowed.
        - Use LOWER() and ILIKE for case-insensitive string searches, e.g., LOWER(email) ILIKE LOWER('%search_term%').
        - Trim whitespace in conditions.
        - Validate email format (contains '@' and '.').
        - Return at least two columns for chart-friendly output.
        - For rates, return decimals (e.g., 10% = 0.1).
        - For 'over time' data, group by year.
        - Use table aliases (e.g., 'o' for "order", 'c' for customer).
        - Quote the "order" table (reserved keyword).
        - For email-based queries, prefer joining with the "order" table unless customer details are explicitly requested.
      `,
      prompt: `Generate a SQL query to retrieve the data the user wants: ${input}`,
      schema: z.object({
        query: z.string().describe('The generated SQL query'),
      }),
    });

    const query = result.object.query;
    if (
      !query.trim().toLowerCase().startsWith('select') ||
      query.trim().toLowerCase().includes('drop') ||
      query.trim().toLowerCase().includes('delete') ||
      query.trim().toLowerCase().includes('insert') ||
      query.trim().toLowerCase().includes('update') ||
      query.trim().toLowerCase().includes('alter') ||
      query.trim().toLowerCase().includes('truncate') ||
      query.trim().toLowerCase().includes('create') ||
      query.trim().toLowerCase().includes('grant') ||
      query.trim().toLowerCase().includes('revoke')
    ) {
      throw new Error('Only SELECT queries are allowed');
    }

    return query;
  } catch (error) {
    console.error('[ERROR] Failed to generate SQL query:', error);
    throw new Error('Failed to generate SQL query');
  }
};