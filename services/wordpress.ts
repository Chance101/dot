// services/wordpress.ts

// Cache mechanism
let cachedPosts: any[] = [];
let lastFetch: number = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

interface WordPressPost {
  id: number;
  date: string;
  slug: string;
  title: {
    rendered: string;
  };
  content: {
    rendered: string;
  };
  excerpt: {
    rendered: string;
  };
  link: string;
  modified: string;
}

export async function fetchBlogPosts() {
  // Return cached version if it's less than 1 hour old
  if (cachedPosts.length > 0 && (Date.now() - lastFetch < CACHE_DURATION)) {
    return cachedPosts;
  }

  try {
    const response = await fetch(
      'https://public-api.wordpress.com/wp/v2/sites/conversatingclaude.wordpress.com/posts',
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`WordPress API error: ${response.statusText}`);
    }

    const posts: WordPressPost[] = await response.json();

    // Transform the posts to a more usable format
    const transformedPosts = posts.map(post => {
      return {
        id: post.id,
        title: stripHtmlTags(post.title.rendered),
        excerpt: stripHtmlTags(post.excerpt.rendered),
        content: stripHtmlTags(post.content.rendered),
        url: post.link,
        slug: post.slug,
        date: new Date(post.date).toISOString(),
        modified: new Date(post.modified).toISOString()
      };
    });

    // Sort posts by date, newest first
    const sortedPosts = transformedPosts.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // Update cache
    cachedPosts = sortedPosts;
    lastFetch = Date.now();

    return sortedPosts;
  } catch (error) {
    console.error('Error fetching WordPress posts:', error);
    // Return cached posts if available, even if they're old
    if (cachedPosts.length > 0) {
      return cachedPosts;
    }
    throw error;
  }
}

// Helper function to strip HTML tags
function stripHtmlTags(html: string): string {
  return html
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
    .replace(/&amp;/g, '&') // Replace &amp; with &
    .replace(/&quot;/g, '"') // Replace &quot; with "
    .replace(/&#039;/g, "'") // Replace &#039; with '
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim(); // Remove leading/trailing spaces
}

// Export a function that returns blog posts or empty array
export async function getBlogPosts() {
  try {
    return await fetchBlogPosts();
  } catch (error) {
    console.error('Error getting blog posts:', error);
    return [];
  }
}
