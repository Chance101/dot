// components/ChatInterface.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot } from 'lucide-react';
import { MessageType } from '../types/chat';

export default function ChatInterface() {
  const [messages, setMessages] = useState<MessageType[]>([
    {
      id: '1',
      type: 'bot',
      content: "Hi! I'm a Dot. And I'm Chase's AI bot. How may I assist you today?",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Function to format message content with proper paragraphs
  const formatMessageContent = (content: string) => {
    return content.split('\n\n').map((paragraph, index) => (
      <p key={index} className={index > 0 ? 'mt-4' : ''}>
        {paragraph}
      </p>
    ));
  };

  const getBotResponse = async (input: string, onChunk: (chunk: string) => void): Promise<void> => {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: input }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No reader available');
      }

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        onChunk(chunk);
      }
    } catch (error) {
      console.error('Error in getBotResponse:', error);
      throw error;
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: MessageType = {
      id: Date.now().toString(),
      type: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const botMessage: MessageType = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: '',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);

      await getBotResponse(input, (chunk) => {
        setMessages(prev => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage.type === 'bot') {
            return [
              ...prev.slice(0, -1),
              { ...lastMessage, content: lastMessage.content + chunk }
            ];
          }
          return prev;
        });
      });
    } catch (error) {
      console.error('Error getting bot response:', error);
      const errorMessage: MessageType = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: "I apologize, but I'm having trouble processing your request. Please try again.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <div className="bg-white rounded-lg shadow-lg">
        <div className="h-96 overflow-y-auto p-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start gap-2 mb-4 ${
                message.type === 'user' ? 'justify-end' : ''
              }`}
            >
              {message.type === 'bot' && (
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
              )}
              <div
                className={`rounded-lg p-3 max-w-[80%] ${
                  message.type === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100'
                }`}
              >
                {message.type === 'bot' ? formatMessageContent(message.content) : message.content}
              </div>
              {message.type === 'user' && (
                <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                  <User className="w-5 h-5 text-gray-600" />
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask me anything..."
              className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={isLoading}
              className="bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 transition-colors disabled:bg-blue-300"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
