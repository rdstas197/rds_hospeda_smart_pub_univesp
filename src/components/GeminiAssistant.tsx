import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send, Bot, User, Loader2, Minimize2, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getGeminiResponse } from '../services/geminiService';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function GeminiAssistant({ context }: { context?: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Olá! Sou o assistente inteligente do Hotel Master. Como posso ajudar com a gestão do seu hotel hoje?' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOpen = (e: any) => {
      setIsOpen(true);
      setIsMinimized(false);
      if (e.detail?.prompt) {
        handleSend(e.detail.prompt);
      }
    };

    window.addEventListener('open-gemini-assistant', handleOpen);
    return () => window.removeEventListener('open-gemini-assistant', handleOpen);
  }, [context, isLoading]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (promptOverride?: string) => {
    const userMessage = promptOverride || input.trim();
    if (!userMessage || isLoading) return;

    if (!promptOverride) setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await getGeminiResponse(userMessage, context);
      setMessages(prev => [...prev, { role: 'assistant', content: response || 'Desculpe, não consegui processar sua solicitação.' }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Ocorreu um erro ao falar com o Gemini. Verifique sua conexão e chave de API.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className="w-14 h-14 rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-200 flex items-center justify-center hover:bg-indigo-700 transition-all hover:scale-110 group"
          >
            <Sparkles className="group-hover:animate-pulse" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ y: 100, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 100, opacity: 0, scale: 0.9 }}
            className={`bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden transition-all duration-300 ${isMinimized ? 'h-16 w-72' : 'h-[500px] w-[350px] md:w-[400px]'}`}
          >
            {/* Header */}
            <div className="p-4 bg-indigo-600 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <Bot size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Assistente Gemini</h3>
                  <p className="text-[10px] opacity-80">Online para ajudar</p>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <button 
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {!isMinimized && (
              <>
                {/* Messages */}
                <div 
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 custom-scrollbar"
                >
                  {messages.map((msg, idx) => (
                    <div 
                      key={idx}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-sm ${
                        msg.role === 'user' 
                          ? 'bg-indigo-600 text-white rounded-tr-none' 
                          : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                      }`}>
                        <div className="flex items-center space-x-1 mb-1 opacity-60 text-[10px] font-bold uppercase tracking-wider">
                          {msg.role === 'user' ? <User size={10} /> : <Bot size={10} />}
                          <span>{msg.role === 'user' ? 'Você' : 'Gemini'}</span>
                        </div>
                        <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white text-slate-700 border border-slate-100 p-3 rounded-2xl rounded-tl-none shadow-sm">
                        <Loader2 size={18} className="animate-spin text-indigo-600" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Input */}
                <div className="p-4 bg-white border-t border-slate-100">
                  <div className="relative">
                    <input 
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                      placeholder="Pergunte algo ao Gemini..."
                      className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                    />
                    <button 
                      onClick={handleSend}
                      disabled={!input.trim() || isLoading}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all"
                    >
                      <Send size={16} />
                    </button>
                  </div>
                  <p className="text-[9px] text-center text-slate-400 mt-2">
                    O Gemini pode cometer erros. Verifique informações importantes.
                  </p>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
