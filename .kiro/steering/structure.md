# Project Structure

## Root Configuration
- `package.json` - Dependencies and scripts
- `next.config.mjs` - Next.js configuration
- `tailwind.config.js` - Tailwind CSS configuration
- `prisma/schema.prisma` - Database schema
- `.env` / `.env.public` - Environment variables

## App Directory (Next.js App Router)
```
app/
├── layout.js              # Root layout with fonts and metadata
├── page.jsx               # Main homepage with product catalog and chat
├── globals.css            # Global styles and Tailwind imports
├── api/
│   └── chat/
│       ├── route.js       # Chat API endpoint with AI integration
│       └── system-prompt.js # AI system prompt configuration
└── components/
    ├── UserCard.jsx       # Customer information display
    ├── ProductCard.jsx    # Product information display
    ├── OrderCard.jsx      # Order details display
    └── TicketCard.jsx     # Support ticket display
```

## Library Directory
```
lib/
├── ai/
│   └── google.js          # Google AI configuration
├── prisma/
│   └── seed.js            # Database seeding script
└── tools/
    ├── database.js        # Database query tool for AI
    └── ui-components.js   # UI component tools for AI
```

## Database
```
prisma/
├── schema.prisma          # Database schema (Customer, Product, Order, SupportTicket)
└── migrations/            # Database migration files
```

## Static Assets
```
public/
├── *.jpg                  # Product images (laptop, earbuds, smartphone, smartwatch)
└── *.svg                  # Icons and logos
```

## Architecture Patterns

### Component Organization
- **Dynamic Imports**: UI components are dynamically imported for better performance
- **Client Components**: Interactive components use `'use client'` directive
- **Reusable Cards**: Standardized card components for different data types

### API Structure
- **Route Handlers**: Next.js 13+ API routes in `app/api/`
- **Tool Integration**: AI tools for database queries and UI generation
- **Error Handling**: Comprehensive logging and fallback mechanisms

### Database Design
- **Relational Schema**: Customer → Orders → Products, Support Tickets
- **Prisma ORM**: Type-safe database operations
- **Fallback Data**: Mock data when database is unavailable

### State Management
- **React Hooks**: useState, useEffect for local state
- **No Global State**: Simple application doesn't require Redux/Zustand

### Styling Conventions
- **Tailwind Classes**: Utility-first approach
- **Dark Mode**: Built-in dark mode support
- **Responsive Design**: Mobile-first responsive layouts
- **Custom Animations**: Framer Motion for smooth transitions