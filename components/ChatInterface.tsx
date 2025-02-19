'use client';

import React, { useReducer, useRef, useEffect, useState, useCallback } from 'react';
import { Send, User, Bot } from 'lucide-react';
import { MessageType } from '../types/chat';

type MessageAction = 
  | { type: 'ADD_MESSAGE'; message: MessageType }
  | { type: 'APPEND_TO_LAST_MESSAGE'; content: string };

function messageReducer(state: MessageType[], action: MessageAction): MessageType[] {
  switch (action.type) {
    case 'ADD_MESSAGE':
      return [...state, action.message];
    case 'APPEND_TO_LAST_MESSAGE':
      const lastMessage = state[state.length - 1];
      if (lastMessage.type !== 'bot') return state;
      return [
        ...state.slice(0, -1),
        { ...lastMessage, content: lastMessage.content + action.content }
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
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const currentBotMessage = useRef('');
  const abortControllerRef = useRef<AbortController | null>(null);
  const streamComplete = useRef<boolean>(false);

  const scrollToBottom = useCallback(() => {
    if (shouldAutoScroll) {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      });
    }
  }, [shouldAutoScroll]);

  const handleScroll = useCallback(() => {
    if (!chatContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const isNearBottom = scrollHeight - (scrollTop + clientHeight) < 100;
    
    setShouldAutoScroll(isNearBottom);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    const chatContainer = chatContainerRef.current;
    if (chatContainer) {
      chatContainer.addEventListener('scroll', handleScroll);
      return () => chatContainer.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  const cleanupStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    streamComplete.current = false;
    setIsLoading(false);
  }, []);

  useEffect(() => {
    return () => {
      cleanupStream();
    };
  }, [cleanupStream]);

  const getBotResponse = async (input: string): Promise<void> => {
    streamComplete.current = false;
    abortControllerRef.current = new AbortController();
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
        body: JSON.stringify({ message: input }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      if (!response.body) throw new Error('No response body available');

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');

      while (!streamComplete.current) {
        const { done, value } = await reader.read();

        if (done) {
          streamComplete.current = true;
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        
        // Check for the end marker
        if (chunk.includes('[DONE]')) {
          streamComplete.current = true;
          break;
        }

        if (chunk.trim()) {
          dispatch({
            type: 'APPEND_TO_LAST_MESSAGE',
            content: chunk.replace('[DONE]', '')
          });
        }
      }

      // Final cleanup
      if (reader) {
        await reader.cancel();
      }
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          console.log('Stream aborted');
          return;
        }
        console.error('Error in getBotResponse:', err);
      }
      throw err;
    } finally {
      streamComplete.current = true;
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    cleanupStream();

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
    } catch (error) {
      console.error('Error in handleSend:', error);
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <div 
          ref={chatContainerRef}
          className="h-96 overflow-y-auto p-4 scroll-smooth"
        >
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
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                }`}
              >
                <FormatMessageContent content={message.content} />
              </div>
              {message.type === 'user' && (
                <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                  <User className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <div className="p-4 border-t dark:border-gray-700">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask me anything..."
              className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 
                dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 dark:placeholder-gray-400"
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={isLoading}
              className="bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 transition-colors 
                disabled:bg-blue-300 dark:disabled:bg-blue-400"
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
