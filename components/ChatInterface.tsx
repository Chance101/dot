'use client';

import React, { useReducer, useRef, useEffect, useState, useCallback } from 'react';
import { Send, User, Bot, RefreshCw } from 'lucide-react';
import { MessageType } from '../types/chat';

// Enhanced message actions to support more operations
type MessageAction = 
  | { type: 'ADD_MESSAGE'; message: MessageType }
  | { type: 'APPEND_TO_LAST_MESSAGE'; content: string }
  | { type: 'SET_ERROR_STATE'; messageId: string; isError: boolean }
  | { type: 'RETRY_MESSAGE'; messageId: string }
  | { type: 'CLEAR_MESSAGES' };

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
    case 'SET_ERROR_STATE':
      return state.map(message => 
        message.id === action.messageId 
          ? { ...message, isError: action.isError }
          : message
      );
    case 'RETRY_MESSAGE':
      // Find the message to retry and all messages after it
      const messageIndex = state.findIndex(msg => msg.id === action.messageId);
      if (messageIndex === -1) return state;
      
      // Keep messages up to the target message (inclusive if it's a user message)
      return state.filter((_, index) => 
        index < messageIndex || (index === messageIndex && state[messageIndex].type === 'user')
      );
    case 'CLEAR_MESSAGES':
      // Keep only the welcome message
      return state.slice(0, 1);
    default:
      return state;
  }
}

// Enhanced message formatting component with support for rich text
const FormatMessageContent = React.memo(({ content }: { content: string }) => {
  // Helper function to process lists
  const processList = (text: string) => {
    // Match both bullet points and numbered lists
    return text.replace(/^[•\-*]\s(.+)$/gm, '<li>$1</li>')
               .replace(/^(\d+)[\.\)]\s(.+)$/gm, '<li>$1. $2</li>');
  };

  // Split content into paragraphs
  const paragraphs = content.split('\n\n');
  
  return (
    <>
      {paragraphs.map((paragraph, index) => {
        // Check if paragraph contains list items
        if (paragraph.match(/^[•\-*]\s(.+)$/m) || paragraph.match(/^(\d+)[\.\)]\s(.+)$/m)) {
          const processedList = processList(paragraph);
          return (
            <ul key={index} className={`list-disc pl-5 ${index > 0 ? 'mt-4' : ''}`}
                dangerouslySetInnerHTML={{ __html: processedList }} />
          );
        }
        
        // Regular paragraph
        return (
          <p key={index} className={index > 0 ? 'mt-4' : ''}>
            {paragraph}
          </p>
        );
      })}
    </>
  );
});

FormatMessageContent.displayName = 'FormatMessageContent';

// Typing indicator component
const TypingIndicator = () => (
  <div className="flex space-x-1 py-1 px-2">
    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse delay-100"></div>
    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse delay-200"></div>
  </div>
);

const ChatInterface = () => {
  const [messages, dispatch] = useReducer(messageReducer, [{
    id: '1',
    type: 'bot',
    content: "Hi! I'm Dot. And I'm Chase's AI bot. How may I assist you today?",
    timestamp: new Date(),
    isError: false
  }]);
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [streamTimeout, setStreamTimeout] = useState<NodeJS.Timeout | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const streamComplete = useRef<boolean>(false);

  // Focus input on component mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

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
    
    if (streamTimeout) {
      clearTimeout(streamTimeout);
      setStreamTimeout(null);
    }
    
    streamComplete.current = false;
    setIsLoading(false);
  }, [streamTimeout]);

  useEffect(() => {
    return () => {
      cleanupStream();
    };
  }, [cleanupStream]);

  const getBotResponse = async (userMessage: string): Promise<void> => {
    streamComplete.current = false;
    abortControllerRef.current = new AbortController();
    
    // Set a timeout for the entire stream
    const timeout = setTimeout(() => {
      if (!streamComplete.current) {
        dispatch({
          type: 'SET_ERROR_STATE',
          messageId: (Date.now() + 1).toString(),
          isError: true
        });
        cleanupStream();
      }
    }, 30000); // 30 second timeout
    
    setStreamTimeout(timeout);
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
        body: JSON.stringify({ message: userMessage }),
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
      clearTimeout(timeout);
      setStreamTimeout(null);
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
      timestamp: new Date(),
      isError: false
    };

    dispatch({ type: 'ADD_MESSAGE', message: userMessage });
    setInput('');
    setIsLoading(true);

    try {
      const botMessage: MessageType = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: '',
        timestamp: new Date(),
        isError: false
      };

      dispatch({ type: 'ADD_MESSAGE', message: botMessage });
      await getBotResponse(userMessage.content);
    } catch (error) {
      console.error('Error in handleSend:', error);
      dispatch({
        type: 'SET_ERROR_STATE',
        messageId: (Date.now() + 1).toString(),
        isError: true
      });
    } finally {
      setIsLoading(false);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  const handleRetry = (messageId: string) => {
    // Find the message to retry
    const messageToRetry = messages.find(msg => msg.id === messageId);
    if (!messageToRetry || messageToRetry.type !== 'bot') return;
    
    // Find the previous user message
    const userMessageIndex = messages.findIndex(msg => msg.id === messageId) - 1;
    if (userMessageIndex < 0) return;
    
    const userMessage = messages[userMessageIndex];
    if (userMessage.type !== 'user') return;
    
    // Clear messages after (and including) the message to retry
    dispatch({ type: 'RETRY_MESSAGE', messageId });
    
    // Trigger a new bot message
    setIsLoading(true);
    
    const botMessage: MessageType = {
      id: Date.now().toString(),
      type: 'bot',
      content: '',
      timestamp: new Date(),
      isError: false
    };

    dispatch({ type: 'ADD_MESSAGE', message: botMessage });
    getBotResponse(userMessage.content).catch(() => {
      dispatch({
        type: 'SET_ERROR_STATE',
        messageId: botMessage.id,
        isError: true
      });
    });
  };

  const handleClearChat = () => {
    cleanupStream();
    dispatch({ type: 'CLEAR_MESSAGES' });
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        <div className="flex justify-between items-center px-4 py-2 border-b dark:border-gray-700">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center mr-2">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <h2 className="font-medium text-gray-900 dark:text-gray-100">Chase&apos;s Assistant</h2>
          </div>
          <button 
            onClick={handleClearChat}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            title="Clear chat"
          >
            Clear
          </button>
        </div>
        
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
                    : message.isError 
                      ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                }`}
              >
                {message.content ? (
                  <FormatMessageContent content={message.content} />
                ) : (
                  <TypingIndicator />
                )}
                
                {message.isError && (
                  <div className="mt-2 flex items-center">
                    <button 
                      onClick={() => handleRetry(message.id)}
                      className="text-xs inline-flex items-center text-red-700 dark:text-red-300 hover:text-red-800 dark:hover:text-red-200"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" /> Retry
                    </button>
                  </div>
                )}
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
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask me anything about Chase..."
              className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 
                dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 dark:placeholder-gray-400"
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 transition-colors 
                disabled:bg-blue-300 dark:disabled:bg-blue-400"
              aria-label="Send message"
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
