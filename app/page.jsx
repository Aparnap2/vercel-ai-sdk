'use client';
import { useChat } from 'ai/react';
import { useState, useEffect } from 'react';

export default function Home() {
  const { messages, input, handleInputChange, handleSubmit, error, isLoading: chatLoading } = useChat({ 
    api: '/api/chat',
    streamProtocol: 'text' // Added to fix stream parsing
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [lastMessage, setLastMessage] = useState(null);

  // Enhanced error handling
  useEffect(() => {
    if (error) {
      console.error('Chat error:', error);
      let errorMessage = 'An error occurred. Please try again.';
      let retryDelay = 0;

      if (error.message.includes('Failed to parse stream')) {
        errorMessage = 'Connection issue. Please wait...';
        retryDelay = 2000;
      } else if (error.message.includes('No response')) {
        errorMessage = 'No response from server. Please try again.';
      }

      setConnectionError(errorMessage);

      const errorTimer = setTimeout(() => {
        setConnectionError(null);
      }, 5000);

      if (retryDelay && lastMessage) {
        const retryTimer = setTimeout(() => {
          if (!connectionError) {
            const fakeEvent = new Event('submit');
            handleSubmit(fakeEvent);
          }
        }, retryDelay);

        return () => {
          clearTimeout(errorTimer);
          clearTimeout(retryTimer);
        };
      }

      return () => clearTimeout(errorTimer);
    }
  }, [error, lastMessage, handleSubmit, connectionError]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (connectionError || !input.trim() || input === lastMessage) return;

    setIsLoading(true);
    try {
      setLastMessage(input);
      await handleSubmit(e);
    } catch (err) {
      console.error('Submit error:', err);
      setConnectionError('Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    console.log('[DEBUG] Current chat messages:', messages);
    if (messages.length > 0) {
      const last = messages[messages.length - 1];
      console.log('[DEBUG] Last message received:', last);
    }
  }, [messages]);

  return (
    <div
      className="min-h-screen"
      style={{
        fontFamily: "'Inter', 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif",
        background: "linear-gradient(135deg, #f0f4ff 0%, #e0e7ff 100%)",
      }}
    >
      <header className="bg-gradient-to-r from-blue-700 to-indigo-600 text-white p-6 shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-3xl font-extrabold tracking-tight">TechTrend Innovations</h1>
          <nav>
            <a href="#" className="mr-6 hover:underline hover:text-indigo-200 transition">Shop</a>
            <a href="#" className="hover:underline hover:text-indigo-200 transition">Support</a>
          </nav>
        </div>
      </header>

      <section
        className="bg-cover bg-center h-[28rem] flex items-center justify-center"
        style={{
          backgroundImage: 'linear-gradient(rgba(30,41,59,0.7),rgba(30,41,59,0.7)), url(/hero.jpg)',
        }}
      >
        <div className="text-center text-white drop-shadow-lg">
          <h2 className="text-5xl font-extrabold mb-5">Discover the Latest in Tech</h2>
          <p className="text-xl mb-8 font-medium">Shop smartphones, laptops, and more at unbeatable prices!</p>
          <a
            href="#"
            className="bg-gradient-to-r from-indigo-500 to-blue-600 text-white px-8 py-3 rounded-full shadow-lg hover:scale-105 hover:from-blue-600 hover:to-indigo-500 transition-all font-semibold"
          >
            Shop Now
          </a>
        </div>
      </section>

      <section className="max-w-7xl mx-auto py-16 px-4">
        <h2 className="text-4xl font-extrabold text-center mb-12 text-gray-800">Featured Products</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            { name: 'Smartphone X', price: 699.99, image: '/product1.jpg' },
            { name: 'Laptop Pro', price: 1299.99, image: '/product2.jpg' },
            { name: 'Wireless Earbuds', price: 149.99, image: '/product3.jpg' },
          ].map((product) => (
            <div
              key={product.name}
              className="bg-white/80 backdrop-blur-md shadow-xl rounded-2xl overflow-hidden border border-gray-200 hover:shadow-2xl transition-shadow"
            >
              <img src={product.image} alt={product.name} className="w-full h-56 object-cover" />
              <div className="p-6">
                <h3 className="text-2xl font-bold mb-2 text-gray-900">{product.name}</h3>
                <p className="text-lg text-indigo-600 font-semibold mb-4">${product.price.toFixed(2)}</p>
                <button className="w-full bg-gradient-to-r from-blue-600 to-indigo-500 text-white px-4 py-2 rounded-lg font-semibold shadow hover:scale-105 hover:from-indigo-500 hover:to-blue-600 transition-all">
                  Add to Cart
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <button
        onClick={() => setIsChatOpen(!isChatOpen)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-blue-600 to-indigo-500 text-white p-5 rounded-full shadow-2xl hover:scale-110 transition-all font-bold text-lg z-50"
      >
        {isChatOpen ? 'Close Chat' : '💬 Chat with Support'}
      </button>

      {isChatOpen && (
        <div className="fixed bottom-28 right-8 w-96 bg-white/90 backdrop-blur-lg shadow-2xl rounded-2xl overflow-hidden border border-indigo-100 z-50">
          <div className="bg-gradient-to-r from-blue-700 to-indigo-600 text-white p-4 flex justify-between items-center">
            <h3 className="font-bold text-lg">TechTrend Support</h3>
            <button onClick={() => setIsChatOpen(false)} className="text-white text-xl hover:text-indigo-200 transition">✕</button>
          </div>
          <div className="h-96 p-5 overflow-y-auto">
            {connectionError && (
              <p className="text-red-500 text-center mb-2">{connectionError}</p>
            )}
            {messages.length === 0 && !connectionError ? (
              <p className="text-gray-400 text-center mt-20">Ask about orders, returns, or support!</p>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`mb-4 ${m.role === 'user' ? 'text-right' : 'text-left'}`}
                >
                  <span
                    className={`inline-block p-3 rounded-xl ${
                      m.role === 'user'
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-400 text-white'
                        : 'bg-gray-100 text-gray-800'
                    } max-w-[80%] ${isLoading ? 'opacity-60' : ''} shadow`}
                  >
                    {m.content}
                    {isLoading && m === messages[messages.length - 1] && (
                      <span className="ml-2 inline-flex">
                        <span className="animate-bounce">.</span>
                        <span className="animate-bounce delay-100">.</span>
                        <span className="animate-bounce delay-200">.</span>
                      </span>
                    )}
                  </span>
                </div>
              ))
            )}
          </div>
          <form onSubmit={onSubmit} className="p-4 border-t flex gap-2 bg-white/80">
            <input
              className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-50 text-gray-900 font-bold"
              value={input}
              onChange={handleInputChange}
              placeholder="Type your question..."
              disabled={isLoading || chatLoading || connectionError}
              style={{ fontFamily: 'inherit' }}
            />
            <button
              type="submit"
              className="p-3 bg-gradient-to-r from-blue-600 to-indigo-500 text-white rounded-lg font-bold shadow hover:scale-105 hover:from-indigo-500 hover:to-blue-600 transition-all disabled:bg-gray-300"
              disabled={isLoading || chatLoading || connectionError}
            >
              Send
            </button>
          </form>
        </div>
      )}

      <footer className="bg-gradient-to-r from-blue-700 to-indigo-600 text-white py-8 mt-16 shadow-inner">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-lg font-medium">© 2025 TechTrend Innovations. All rights reserved.</p>
          <div className="mt-3">
            <a href="#" className="text-indigo-200 hover:text-white mx-3 transition">Privacy Policy</a>
            <a href="#" className="text-indigo-200 hover:text-white mx-3 transition">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
}