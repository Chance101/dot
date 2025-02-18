'use client';

import { useState, useEffect } from 'react';
import { getBlogPosts } from '@/services/wordpress';

export default function TestPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPosts() {
      try {
        const fetchedPosts = await getBlogPosts();
        setPosts(fetchedPosts);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch posts');
      } finally {
        setLoading(false);
      }
    }

    loadPosts();
  }, []);

  if (loading) return <div className="p-4">Loading posts...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Blog Posts Test</h1>
      <div className="space-y-4">
        {posts.map((post) => (
          <div key={post.id} className="border p-4 rounded-lg">
            <h2 className="text-xl font-semibold">{post.title}</h2>
            <p className="text-gray-600 text-sm">Published: {new Date(post.date).toLocaleDateString()}</p>
            <p className="mt-2">{post.excerpt}</p>
            <a 
              href={post.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline mt-2 inline-block"
            >
              Read more
            </a>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <h2 className="text-xl font-bold mb-2">Raw Data:</h2>
        <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
          {JSON.stringify(posts, null, 2)}
        </pre>
      </div>
    </div>
  );
}
