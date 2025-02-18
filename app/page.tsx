'use client';

import ChatInterface from '../components/ChatInterface';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 min-h-screen flex items-center justify-center">
        <div className="w-full">
          <ChatInterface />
        </div>
      </div>
    </main>
  );
}
