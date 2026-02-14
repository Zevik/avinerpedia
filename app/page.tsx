import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

async function getPosts() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return null;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase
      .from('posts')
      .select('id, title, slug, category_id')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Supabase error:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Failed to fetch posts:', error);
    return null;
  }
}

export default async function Home() {
  const posts = await getPosts();

  return (
    <main className="p-8 max-w-6xl mx-auto" dir="rtl">
      <h1 className="text-5xl font-bold mb-8 text-center">אבינרפדיה 📚</h1>
      <p className="text-center text-gray-600 mb-10">
        {posts ? `מאגר של ${posts.length} שיעורים, מאמרים ושו"תים.` : 'מאגר תוכן מקיף של הרב שלמה אבינר'}
      </p>

      {posts && posts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {posts.map((post: any) => (
            <Link
              key={post.slug}
              href={`/wiki/${post.slug}`}
              className="block p-6 bg-white border rounded-lg shadow hover:bg-gray-50 transition"
            >
              <h2 className="text-lg font-bold mb-2">{post.title}</h2>
              <p className="text-xs text-gray-500">קרא עוד →</p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
          <p className="text-gray-700 mb-4">המאגר מתחדש כעת עם מאות שיעורים ומאמרים.</p>
          <p className="text-sm text-gray-600">🔄 המערכת בהפעלה לעדכון...</p>
        </div>
      )}

      {/* Navigation Links */}
      <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/wiki" className="text-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition">
          📚 <div className="font-semibold">ויקי</div>
        </Link>
        <Link href="/articles" className="text-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition">
          📝 <div className="font-semibold">מאמרים</div>
        </Link>
        <Link href="/qa" className="text-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition">
          ❓ <div className="font-semibold">שו"תים</div>
        </Link>
        <Link href="/videos" className="text-center p-4 bg-red-50 rounded-lg hover:bg-red-100 transition">
          🎥 <div className="font-semibold">וידאו</div>
        </Link>
      </div>
    </main>
  );
}
