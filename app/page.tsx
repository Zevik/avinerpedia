import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

async function getStats() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) return { total: 0, latest: [] };

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get total count
    const { count: totalCount } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'published')
      .not('content', 'is', null)
      .neq('content', '');

    // Get latest 12 posts for the grid
    const { data: latestPosts } = await supabase
      .from('posts')
      .select('id, title, slug, category_id')
      .eq('status', 'published')
      .not('content', 'is', null)
      .neq('content', '')
      .order('created_at', { ascending: false })
      .limit(12);

    return {
      total: totalCount || 0,
      latest: latestPosts || []
    };
  } catch (error) {
    console.error('Stats fetch error:', error);
    return { total: 0, latest: [] };
  }
}

export default async function Home() {
  const { total, latest } = await getStats();

  return (
    <main className="min-h-screen bg-white" dir="rtl">
      {/* Hero Section */}
      <section className="relative h-[50vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
        </div>
        <div className="relative z-10 text-center px-4">
          <h1 className="text-6xl md:text-7xl font-bold text-white mb-6 drop-shadow-lg">
            אבינרפדיה 📚
          </h1>
          <p className="text-xl md:text-2xl text-blue-100 max-w-2xl mx-auto leading-relaxed font-light">
            הארכיון המקיף לשיעוריו ותורתו של הרב שלמה אבינר שליט"א
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-6 py-2 text-white font-medium">
              מאגר של <span className="text-yellow-400 font-bold">{total.toLocaleString()}</span> פריטים
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold mb-10 text-gray-900 border-r-4 border-blue-600 pr-4">שיעורים אחרונים</h2>

        {latest.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {latest.map((post: any) => (
              <Link
                key={post.slug}
                href={`/wiki/${post.slug}`}
                className="group block p-6 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <div className="h-1 w-12 bg-blue-600 mb-4 transition-all group-hover:w-full"></div>
                <h3 className="text-xl font-bold text-gray-800 mb-2 line-clamp-2">{post.title}</h3>
                <p className="text-sm text-blue-600 font-medium">קרא עוד ←</p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-12 text-center">
            <p className="text-gray-700 mb-4">המאגר מתחדש כעת עם אלפי שיעורים ומאמרים.</p>
            <p className="text-sm text-gray-500 italic">🔄 המערכת מעבדת את המידע...</p>
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
