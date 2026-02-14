import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

async function getPost(slug: string) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return null;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase
      .from('posts')
      .select('id, title, slug, content, category_id, status, created_at')
      .eq('slug', slug)
      .eq('status', 'published')
      .single();

    if (error || !data) {
      return null;
    }

    return data;
  } catch (error) {
    console.error('Failed to fetch post:', error);
    return null;
  }
}

async function getCategory(categoryId: string) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return null;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data } = await supabase
      .from('categories')
      .select('name')
      .eq('id', categoryId)
      .single();

    return data?.name || null;
  } catch (error) {
    return null;
  }
}

export default async function WikiPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);
  const post = await getPost(slug);

  if (!post) {
    notFound();
  }

  const categoryName = post.category_id ? await getCategory(post.category_id) : null;

  return (
    <div className="max-w-4xl mx-auto p-6" dir="rtl">
      {/* Header */}
      <div className="mb-8">
        <Link href="/" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
          ← חזור לעמוד הבית
        </Link>

        <h1 className="text-4xl font-bold mb-4 text-blue-800">{post.title}</h1>

        {/* Category Badge */}
        {categoryName && (
          <div className="mb-4">
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
              {categoryName}
            </span>
          </div>
        )}

        {/* Meta Info */}
        <div className="text-sm text-gray-500 mb-6">
          פורסם: {new Date(post.created_at).toLocaleDateString('he-IL')}
        </div>
      </div>

      {/* Content */}
      <article className="prose prose-lg max-w-none prose-headings:text-blue-700 whitespace-pre-wrap">
        {post.content}
      </article>

      {/* Footer */}
      <div className="mt-12 pt-8 border-t border-gray-200">
        <Link href="/" className="text-blue-600 hover:text-blue-800">
          ← חזור לרשימת השיעורים
        </Link>
      </div>
    </div>
  );
}
