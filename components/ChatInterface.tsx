'use client';

// components/ChatInterface.tsx
import React, { useReducer, useRef, useEffect, useState } from 'react';
import { Send, User, Bot } from 'lucide-react';
import { MessageType } from '../types/chat';

type MessageAction = 
  | { type: 'ADD_MESSAGE'; message: MessageType }
  | { type: 'UPDATE_LAST_BOT_MESSAGE'; content: string };

function messageReducer(state: MessageType[], action: MessageAction): MessageType[] {
  switch (action.type) {
    case 'ADD_MESSAGE':
      return [...state, action.message];
    case 'UPDATE_LAST_BOT_MESSAGE':
      const lastMessage = state[state.length - 1];
      if (lastMessage.type !== 'bot') return state;
      return [
        ...state.slice(0, -1),
        { ...lastMessage, content: action.content }
      ];
    default:
      return state;
  }
}

const FormatMessageContent = React.memo(({ content }: { content: string }) => {
  return content.split('\n\n').map((paragraph, index) => (
    <p key={index} className={index > 0 ? 'mt-4' : ''}>
      {paragraph}
    </p>
  ));
});

FormatMessageContent.displayName = 'FormatMessageContent';

const ChatInterface = () => {
  const [messages, dispatch] = useReducer(messageReducer, [{
    id: '1',
    type: 'bot',
    content: "Hi! I'm Dot. And I'm Chase's AI bot. How may I assist you today?",
    timestamp: new Date()
  }]);
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentBotMessage = useRef('');
  const abortControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const getBotResponse = async (input: string): Promise<void> => {
    abortControllerRef.current = new AbortController();
    let streamTimeout: NodeJS.Timeout;
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      const decoder = new TextDecoder();
      
      while (true) {
        // Set a timeout for each chunk
        const timeoutPromise = new Promise((_, reject) => {
          streamTimeout = setTimeout(() => {
            reject(new Error('Stream timeout'));
          }, 10000); // 10 second timeout
        });

        try {
          const readResult = await Promise.race([
            reader.read(),
            timeoutPromise
          ]) as ReadableStreamDefaultReadResult<Uint8Array>;

          if (readResult.done) break;
          
          const chunk = decoder.decode(readResult.value);
          currentBotMessage.current += chunk;
          dispatch({ 
            type: 'UPDATE_LAST_BOT_MESSAGE', 
            content: currentBotMessage.current 
          });
        } finally {
          clearTimeout(streamTimeout);
        }
      }
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'AbortError') return;
        if (err.message === 'Stream timeout') {
          // Handle timeout by appending a message
          currentBotMessage.current += '\n\n[Message was interrupted. Please try again.]';
          dispatch({
            type: 'UPDATE_LAST_BOT_MESSAGE',
            content: currentBotMessage.current
          });
          return;
        }
      }
      console.error('Error in getBotResponse:', err);
      throw err;
    } finally {
      clearTimeout(streamTimeout);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const userMessage: MessageType = {
      id: Date.now().toString(),
      type: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    dispatch({ type: 'ADD_MESSAGE', message: userMessage });
    setInput('');
    setIsLoading(true);
    currentBotMessage.current = '';

    try {
      const botMessage: MessageType = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: '',
        timestamp: new Date()
      };

      dispatch({ type: 'ADD_MESSAGE', message: botMessage });
      await getBotResponse(input);
    } catch {
      dispatch({
        type: 'ADD_MESSAGE',
        message: {
          id: (Date.now() + 1).toString(),
          type: 'bot',
          content: "I apologize, but I'm having trouble processing your request. Please try again.",
          timestamp: new Date()
        }
      });
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
                <FormatMessageContent content={message.content} />
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
};

ChatInterface.displayName = 'ChatInterface';

export default ChatInterface;
