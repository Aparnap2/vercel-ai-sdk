# Vercel AI SDK E-commerce Chatbot

A **production-ready, AI-powered e-commerce support chatbot** built with:

- **Vercel AI SDK** (streaming, tools, edge-ready)
- **Google Gemini** (LLM)
- **Prisma** + **Neon DB** (type-safe, serverless Postgres)
- **Zod** (robust schema validation)
- **Next.js** (modern frontend, App Router)

---

## ✨ Features

- **Conversational AI**: Natural support for orders, products, support tickets, and more.
- **Database integration**: Type-safe queries and mutations via Prisma and Neon DB.
- **Streaming LLM responses**: Fast, real-time answers powered by Google Gemini and Vercel AI SDK.
- **Input validation**: All API and LLM-tool inputs validated with Zod.
- **Modern UI**: Responsive React/Next.js chat interface with Markdown rendering and animated UX.
- **Extensible**: Add tools, business logic, validation, or third-party API integrations easily.

---

## 🛠️ Tech Stack

- **Frontend**: Next.js, React, Tailwind CSS, framer-motion, react-markdown
- **Backend**: Vercel AI SDK, Google Gemini, Prisma, Neon DB, Zod, nanoid

---

## 🚀 Quick Start

### 1. **Clone the repo**

```bash
git clone https://github.com/Aparnap2/vercel-ai-sdk.git
cd vercel-ai-sdk
```

### 2. **Install dependencies**

```bash
npm install
```

### 3. **Set up environment variables**

- **Google Gemini API Key**:  
  Get your key from [Google AI Studio](https://aistudio.google.com/app/apikey)  
  Add to `.env.local`:

  ```
  GOOGLE_GENERATIVE_AI_API_KEY=your-google-api-key
  ```

- **Neon DB (Postgres) connection**:  
  Get your connection string from [neon.tech](https://neon.tech)  
  Add also to `.env.local`:

  ```
  DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DB
  ```

### 4. **Set up the database**

```bash
npx prisma db push
npx prisma generate
# (Optional) seed your DB if you have a script
```

### 5. **Run the dev server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and chat!

---

## 🧩 Project Structure

```
├── app/
│   ├── api/
│   │   └── chat/
│   │       ├── route.js          # API endpoint (Vercel AI SDK + tools)
│   │       └── system-prompt.js  # System prompt for LLM
│   └── page.jsx                  # Main chat UI
├── lib/
│   ├── ai/
│   │   └── google.js             # Google Gemini config
│   └── tools/
│       └── database.js           # DB query tool with Zod validation
├── prisma/
│   └── schema.prisma             # Prisma models
├── public/
│   └── images/                   # Project images
├── .env.local                    # API keys and DB URL
├── package.json
└── README.md
```

---

## 🧑‍💻 How It Works

- **Frontend**: Users chat with the bot via a Next.js interface. Messages are sent to `/api/chat`.
- **API Route**:  
  - Handles simple greetings directly.
  - For all other queries, uses `generateText` from Vercel AI SDK with Google Gemini, and exposes a custom `db_query` tool (validated by Zod and powered by Prisma).
  - Returns Markdown-formatted, streaming responses.
- **Database**: All queries are validated (Zod) and run with Prisma on Neon DB, returning only safe, allowed data.

---

## 🛡️ Security & Best Practices

- **All tool inputs are validated** with Zod before touching the DB.
- **Edge runtime ready**: Fast, scalable, serverless deployment.
- **No sensitive data returned** by default (customize tool output as needed).
- **Easy to extend**:  
  - Add new tools (APIs, actions, etc.)
  - Expand the Prisma schema
  - Customize system prompt/business logic

---

## 📦 Customization

- **Change the System Prompt**:  
  Edit `app/api/chat/system-prompt.js`
- **Modify data models**:  
  Edit `prisma/schema.prisma` and run `npx prisma db push`
- **Add/modify tools**:  
  See `lib/tools/database.js`
- **UI tweaks**:  
  Edit `app/page.jsx` and Tailwind classes

---

## 📝 License

MIT

---

## 👤 Author

**Aparnap2**  
[GitHub](https://github.com/Aparnap2) | [LinkedIn](https://linkedin.com/in/aparnap2)

---

## ⭐️ If this helped you, star the repo!
