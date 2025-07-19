# Technology Stack

## Framework & Runtime
- **Next.js 15.3.1** - React framework with App Router
- **React 19** - UI library with latest features
- **Node.js** - JavaScript runtime

## AI & Language Models
- **Google Gemini** (`gemini-1.5-flash`) - Primary AI model via `@ai-sdk/google`
- **Vercel AI SDK** - AI integration and tool calling
- **LangChain** - Additional AI tooling with `@langchain/google-genai`

## Database & ORM
- **PostgreSQL** - Primary database via Neon serverless
- **Prisma 6.7.0** - Database ORM with adapter for PostgreSQL
- **@neondatabase/serverless** - Serverless PostgreSQL client

## Styling & UI
- **Tailwind CSS 4** - Utility-first CSS framework
- **Framer Motion** - Animation library
- **Lucide React** - Icon library
- **Sonner** - Toast notifications

## Development Tools
- **ESLint** - Code linting with Next.js config
- **PostCSS** - CSS processing
- **Autoprefixer** - CSS vendor prefixing

## Package Management
- **pnpm** - Fast, disk space efficient package manager

## Common Commands

### Development
```bash
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run ESLint
```

### Database
```bash
npx prisma generate    # Generate Prisma client
npx prisma db push     # Push schema to database
npx prisma db seed     # Seed database with test data
npx prisma studio      # Open Prisma Studio
```

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `GOOGLE_GENERATIVE_AI_API_KEY` - Google AI API key
- Additional environment variables in `.env` and `.env.public`