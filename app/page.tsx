'use client';

import ChatInterface from '../components/ChatInterface';
import SkillsGraph from '../components/SkillsGraph';
import { Linkedin, Github, ExternalLink } from 'lucide-react';
import { importantLinks } from '@/data';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Chase R. Hitchens
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-6">
            Business Leader | AI Enthusiast | Customer Success Advocate
          </p>
          <div className="flex justify-center gap-4">
            <a
              href={importantLinks.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Linkedin className="w-5 h-5" />
              LinkedIn
            </a>
            <a
              href={importantLinks.github}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
            >
              <Github className="w-5 h-5" />
              GitHub
            </a>
            <a
              href={importantLinks.blog}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <ExternalLink className="w-5 h-5" />
              Blog
            </a>
          </div>
        </div>
      </section>

      {/* Chat Section */}
      <section className="py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-4 text-gray-900 dark:text-gray-100">
            Chat with Dot
          </h2>
          <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
            Ask my AI assistant anything about my experience, skills, or projects
          </p>
          <ChatInterface />
          <p className="text-center text-xs text-gray-500 dark:text-gray-500 mt-4">
            Vibe-coded January to March 2025 with Sonnet 3.5, last 1% completed with Sonnet 3.7 & Claude Code beta (March 2025), updated with Claude Code for web beta (November 2025)
          </p>
        </div>
      </section>

      {/* Skills Graph Section */}
      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <SkillsGraph />
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto text-center text-gray-500 dark:text-gray-400">
          <p>Austin, TX</p>
        </div>
      </footer>
    </main>
  );
}
