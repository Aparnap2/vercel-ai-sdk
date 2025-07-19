'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Send, RotateCcw, X, ShoppingCart, Star, Search } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { nanoid } from 'nanoid';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';

// Import UI components
const UserCard = dynamic(() => import('./components/UserCard'), { ssr: false });
const ProductCard = dynamic(() => import('./components/ProductCard'), { ssr: false });
const OrderCard = dynamic(() => import('./components/OrderCard'), { ssr: false });
const TicketCard = dynamic(() => import('./components/TicketCard'), { ssr: false });

// Product data
const products = [
  { id: 1, name: 'Premium Laptop', price: 1299.99, description: 'High-performance laptop with 16GB RAM and 512GB SSD', image: '/laptop.jpg', category: 'Computers' },
  { id: 2, name: 'Wireless Earbuds', price: 149.99, description: 'Noise-cancelling earbuds with 24-hour battery life', image: '/earbuds.jpg', category: 'Audio' },
  { id: 3, name: 'Smartphone Pro', price: 999.99, description: 'Latest smartphone with advanced camera system and all-day battery', image: '/smartphone.jpg', category: 'Phones' },
  { id: 4, name: 'Smart Watch', price: 299.99, description: 'Fitness tracker with heart rate monitor and GPS', image: '/smartwatch.jpg', category: 'Wearables' },
];

// Categories
const categories = [
  { name: 'All', icon: '' },
  { name: 'Computers', icon: '' },
  { name: 'Phones', icon: '' },
  { name: 'Audio', icon: '' },
  { name: 'Wearables', icon: '' },
  { name: 'Gaming', icon: '' },
  { name: 'Accessories', icon: '' }
];

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Scroll to latest message
  useEffect(() => {
    console.log('[UI] Messages updated, scrolling to end');
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    console.log('[UI] Form submitted, input:', input);
    const userMessage = {
      id: nanoid(),
      role: 'user',
      content: input,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      console.log('[UI] Sending request to /api/chat');
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
      });

      console.log('[UI] Response received, status:', response.status);
      console.log('[UI] Response headers:', JSON.stringify(Object.fromEntries(response.headers), null, 2));

      const responseData = await response.json().catch(() => ({}));
      console.log('[UI] Parsed response data:', responseData);

      if (!response.ok) {
        console.error('[UI] Response error, status:', response.status, 'data:', responseData);
        toast.error('Failed to process chat response.');
        setMessages((prev) => [
          ...prev,
          {
            id: nanoid(),
            role: 'assistant',
            content: `# Error\nError: ${responseData.error || response.statusText || 'Failed to process request.'}`,
            ui_components: []
          },
        ]);
        setIsLoading(false);
        return;
      }

      const responseText = responseData.text || '';
      const cleanedText = responseText.replace(/^f:/, '').replace(/^0:/g, '').trim();
      console.log('[UI] Cleaned response text:', cleanedText);

      if (!cleanedText) {
        console.warn('[UI] Empty response received');
        toast.error('Empty response from server.');
        setMessages((prev) => [
          ...prev,
          {
            id: nanoid(),
            role: 'assistant',
            content: '# Error\nReceived an empty response. Please try again.',
            ui_components: []
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: nanoid(),
            role: 'assistant',
            content: cleanedText,
            ui_components: responseData.ui_components || []
          },
        ]);
        console.log('[UI] Added response to messages:', { text: cleanedText, ui_components: responseData.ui_components });
      }
    } catch (error) {
      console.error('[UI] Fetch error:', error.stack);
      toast.error('Failed to process chat response.');
      setMessages((prev) => [
        {
          id: nanoid(),
          role: 'assistant',
          content: '# Error\nSorry, there was an error processing your request. Please try again.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter messages to display
  const displayedMessages = useMemo(() => {
    console.log('[UI] Filtering messages for display');
    return messages.filter((m) => m.role !== 'system');
  }, [messages]);

  // Reset chat
  const resetChat = () => {
    console.log('[UI] Resetting chat');
    setMessages([]);
    toast.success('Chat history reset!');
  };

  // Component mapping for UI components
  const componentMap = {
    UserCard,
    ProductCard,
    OrderCard,
    TicketCard
  };

  // Render message content
  const renderMessageContent = (message) => {
    console.log('[UI] Rendering message:', JSON.stringify(message, null, 2));
    
    const renderContent = () => {
      if (!message.content) {
        console.warn('[UI] Message has no content:', message.id);
        return (
          <div className="text-gray-500 dark:text-gray-400 text-sm">
            No response content available.
          </div>
        );
      }
      
      return (
        <div className="prose dark:prose-invert prose-sm max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeSanitize]}
            components={{
              h1: ({ node, ...props }) => <h1 className="text-xl font-bold mt-4 mb-2" {...props} />,
              h2: ({ node, ...props }) => <h2 className="text-lg font-semibold mt-3 mb-1" {...props} />,
              p: ({ node, ...props }) => <p className="mb-2" {...props} />,
              ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-2" {...props} />,
              li: ({ node, ...props }) => <li className="mb-1" {...props} />,
              table: ({ node, ...props }) => (
                <div className="overflow-x-auto">
                  <table className="border-collapse border border-gray-300 dark:border-gray-600 mb-2 w-full" {...props} />
                </div>
              ),
              th: ({ node, ...props }) => <th className="border border-gray-300 dark:border-gray-600 p-2 bg-gray-100 dark:bg-gray-700" {...props} />,
              td: ({ node, ...props }) => <td className="border border-gray-300 dark:border-gray-600 p-2" {...props} />,
              code: ({ node, ...props }) => <code className="bg-gray-100 dark:bg-gray-800 rounded px-1 py-0.5" {...props} />,
              pre: ({ node, ...props }) => <pre className="bg-gray-100 dark:bg-gray-800 rounded p-2 overflow-x-auto text-sm" {...props} />,
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
      );
    };

    return (
      <div className="space-y-4">
        {renderContent()}
        {message.ui_components?.map((comp, idx) => {
          const Component = componentMap[comp.component];
          if (!Component) {
            console.warn(`[UI] Unknown component: ${comp.component}`);
            return null;
          }
          return <Component key={idx} {...comp.props} />;
        })}
      </div>
    );
  };

  // Filter products
  const filteredProducts = products.filter(
    (product) =>
      (searchQuery === '' ||
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description.toLowerCase().includes(searchQuery.toLowerCase())) &&
      (selectedCategory === 'All' || product.category === selectedCategory)
  );
  console.log('[UI] Filtered products:', filteredProducts.length);

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <Toaster position="top-center" />
      <header className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">TechTrend</h1>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search products..."
                className="px-4 py-2 rounded-full text-sm text-gray-800 w-64 focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={searchQuery}
                onChange={(e) => {
                  console.log('[UI] Search query changed:', e.target.value);
                  setSearchQuery(e.target.value);
                }}
              />
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
            </div>
            <button
              onClick={() => {
                console.log('[UI] Opening chat');
                setIsChatOpen(true);
              }}
              className="bg-white text-blue-600 px-4 py-2 rounded-full text-sm font-medium hover:bg-blue-50 transition"
            >
              Chat Support
            </button>
          </div>
        </div>
      </header>
      <div className="container mx-auto p-4">
        <div className="flex overflow-x-auto pb-2 space-x-2">
          {categories.map((category) => (
            <button
              key={category.name}
              onClick={() => {
                console.log('[UI] Selected category:', category.name);
                setSelectedCategory(category.name);
              }}
              className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${
                selectedCategory === category.name
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="mr-2">{category.icon}</span>
              {category.name}
            </button>
          ))}
        </div>
      </div>
      <div className="container mx-auto p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition"
            >
              <div className="h-48 bg-gray-200 dark:bg-gray-700 relative flex items-center justify-center">
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="object-contain h-full w-full"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.style.display = 'none';
                      // Optionally, you could set a state to show the icon if image fails
                    }}
                  />
                ) : (
                  <ShoppingCart size={48} className="text-gray-400 dark:text-gray-500" />
                )}
              </div>
              <div className="p-4">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-lg">{product.name}</h3>
                  <div className="flex items-center text-amber-500">
                    <Star className="h-4 w-4 fill-current" />
                    <span className="ml-1 text-xs">4.5</span>
                  </div>
                </div>
                <p className="text-blue-600 dark:text-blue-400 font-bold mt-1">${product.price.toFixed(2)}</p>
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-2 line-clamp-2">{product.description}</p>
                <div className="mt-4 flex justify-between items-center">
                  <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
                    {product.category}
                  </span>
                  <button
                    onClick={() => console.log('[UI] Add to cart:', product.name)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition"
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            className="fixed bottom-4 right-4 w-96 h-[600px] bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden flex flex-col z-50"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
          >
            <div className="bg-gradient-to-r from-blue-700 to-indigo-600 text-white p-4 flex justify-between items-center rounded-t-2xl">
              <h3 className="font-bold text-lg">TechTrend Support</h3>
              <div>
                <button
                  onClick={resetChat}
                  title="Reset Chat"
                  className="text-sm mr-3 p-1 hover:bg-white/20 rounded-full transition"
                >
                  <RotateCcw size={18} />
                </button>
                <button
                  onClick={() => {
                    console.log('[UI] Closing chat');
                    setIsChatOpen(false);
                  }}
                  title="Close Chat"
                  className="text-xl p-1 hover:bg-white/20 rounded-full transition"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {displayedMessages.length === 0 && (
                <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
                  <div className="mb-4">
                    <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                      <ShoppingCart className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                  <h3 className="font-medium text-lg mb-2">Welcome to TechTrend Support</h3>
                  <p className="text-sm">
                    Ask about your orders, products, or get help with any issues.
                  </p>
                </div>
              )}
              {displayedMessages.map((message, i) => {
                console.log('[UI] Rendering message index:', i);
                return message.role === 'user' ? (
                  <motion.div
                    key={i}
                    className="flex justify-end"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="inline-block p-3 rounded-xl text-sm bg-blue-600 text-white max-w-[85%] shadow-sm">
                      {message.content}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key={i}
                    className="flex justify-start"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="inline-block p-3 rounded-xl text-sm bg-gray-100 dark:bg-neutral-700 text-gray-800 dark:text-gray-200 max-w-[85%] shadow-sm">
                      {renderMessageContent(message)}
                    </div>
                  </motion.div>
                );
              })}
              {isLoading && (
                <motion.div
                  className="flex justify-start"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  key="loading-indicator"
                >
                  <div className="inline-block p-3 rounded-xl text-sm bg-gray-100 dark:bg-neutral-700 text-gray-800 dark:text-gray-200 max-w-[85%] shadow-sm">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-xs">
                        {messages.length === 0 ? 'Starting conversation...' : 'Thinking...'}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <form
              onSubmit={handleSubmit}
              className="border-t border-gray-200 dark:border-gray-700 p-4 flex items-center"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => {
                  console.log('[UI] Input changed:', e.target.value);
                  setInput(e.target.value);
                }}
                placeholder="Ask about orders, products, or support..."
                className="flex-1 p-2 rounded-l-lg border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-r-lg transition"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
      {!isChatOpen && (
        <motion.button
          onClick={() => {
            console.log('[UI] Opening chat from button');
            setIsChatOpen(true);
          }}
          className="fixed bottom-4 right-4 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
        </motion.button>
      )}
    </main>
  );
}