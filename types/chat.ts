// types/chat.ts
export type MessageType = {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  isError?: boolean; // Added this property to support error handling
};