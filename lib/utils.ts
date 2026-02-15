/**
 * Utility functions for the Avinerpedia application
 */

/**
 * Format a date string to Hebrew locale
 */
export function formatDate(dateString: string | null): string {
  if (!dateString) return '';

  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

/**
 * Truncate text to a specified length
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

/**
 * Get YouTube video thumbnail URL
 */
export function getYouTubeThumbnail(videoId: string, quality: 'default' | 'medium' | 'high' | 'maxres' = 'medium'): string {
  const qualityMap = {
    default: 'default.jpg',
    medium: 'mqdefault.jpg',
    high: 'hqdefault.jpg',
    maxres: 'maxresdefault.jpg',
  };

  return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}`;
}

/**
 * Check if a video ID is a YouTube video
 */
export function isYouTubeVideo(videoId: string | null): boolean {
  if (!videoId) return false;
  return !videoId.includes('Maale:') && !videoId.includes(':');
}

/**
 * Check if a video ID is a Maale video
 */
export function isMaaleVideo(videoId: string | null): boolean {
  if (!videoId) return false;
  return videoId.includes('Maale:');
}

/**
 * Get Maale video URL
 */
export function getMaaleVideoUrl(videoId: string): string {
  const maaleId = videoId.replace('Maale:', '').replace('blog/', '');
  return `https://www.maale.org.il/blog/${maaleId}`;
}

/**
 * Create a slug from text (for URLs)
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-\u0590-\u05FF]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

/**
 * Get color for category badge
 */
export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    'סרטונים': 'bg-blue-100 text-blue-800',
    'מאמרים': 'bg-green-100 text-green-800',
    'שו"ת הלכה': 'bg-purple-100 text-purple-800',
    'סדרות': 'bg-orange-100 text-orange-800',
  };

  return colors[category] || 'bg-gray-100 text-gray-800';
}

/**
 * Extract excerpt from markdown content
 */
export function extractExcerpt(markdown: string | null, maxLength: number = 200): string {
  if (!markdown) return '';

  // Remove markdown formatting
  const plain = markdown
    .replace(/#{1,6}\s+/g, '') // Remove headers
    .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold
    .replace(/\*(.+?)\*/g, '$1') // Remove italic
    .replace(/\[(.+?)\]\(.+?\)/g, '$1') // Remove links
    .replace(/`(.+?)`/g, '$1') // Remove code
    .replace(/\n+/g, ' ') // Replace newlines with spaces
    .trim();

  return truncate(plain, maxLength);
}
/**
 * Class name merger utility
 */
export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}
