import { Suspense } from 'react';
export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { Book, Search, Filter } from 'lucide-react';
import { getWikiPosts, getWikiCategories } from '@/lib/db';

interface WikiPageProps {
    searchParams: Promise<{ category?: string; q?: string }>;
}

export default async function WikiPage({ searchParams }: WikiPageProps) {
    const params = await searchParams;
    const selectedCategoryId = params.category;
    const searchQuery = params.q;

    // Fetch posts and categories
    const [posts, categories] = await Promise.all([
        getWikiPosts(60, 0, selectedCategoryId),
        getWikiCategories(),
    ]);

    const selectedCategoryName = categories.find(c => String(c.id) === selectedCategoryId)?.name;

    return (
        <div className="min-h-screen bg-slate-50 py-12" dir="rtl">
            <div className="container mx-auto px-4 max-w-6xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
                    <div>
                        <h1 className="text-4xl font-bold text-slate-900 mb-2">ויקי אבינרפדיה 📚</h1>
                        <p className="text-slate-600 italic">כל הלקסיקון והמושגים של הרב שלמה אבינר</p>
                    </div>

                    <div className="relative max-w-md w-full">
                        {/* Simple search UI teaser - full search can be integrated later if needed */}
                        <div className="flex bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm focus-within:ring-2 focus-within:ring-blue-500 transition-all">
                            <div className="p-3 text-slate-400">
                                <Search className="w-5 h-5" />
                            </div>
                            <input
                                type="text"
                                placeholder="חיפוש מהיר בויקי..."
                                className="flex-1 p-3 outline-none text-slate-800"
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Categories Sidebar */}
                    <aside className="lg:col-span-1">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                            <div className="flex items-center gap-2 mb-6 text-blue-600 font-bold">
                                <Filter className="w-5 h-5" />
                                <h3>סינון לפי נושא</h3>
                            </div>
                            <div className="space-y-1">
                                <Link
                                    href="/wiki"
                                    className={`block px-4 py-2 rounded-lg transition-colors ${!selectedCategoryId ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}
                                >
                                    הכל
                                </Link>
                                {categories.map((cat: any) => (
                                    <Link
                                        key={cat.id}
                                        href={`/wiki?category=${cat.id}`}
                                        className={`block px-4 py-2 rounded-lg transition-colors ${selectedCategoryId === cat.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}
                                    >
                                        {cat.name}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </aside>

                    {/* Posts Grid */}
                    <main className="lg:col-span-3">
                        {selectedCategoryName && (
                            <div className="mb-6 flex items-center gap-2 text-slate-500 font-medium">
                                <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">{selectedCategoryName}</span>
                                <span>({posts.length} פריטים)</span>
                            </div>
                        )}

                        {posts.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {posts.map((post: any) => (
                                    <Link
                                        key={post.id}
                                        href={`/content/${post.id}`}
                                        className="p-5 bg-white border border-slate-100 rounded-xl shadow-sm hover:shadow-md hover:border-blue-200 transition-all group"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                <Book className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h2 className="text-lg font-bold text-slate-800 mb-1 group-hover:text-blue-600 transition-colors uppercase">{post.title}</h2>
                                                <div className="text-xs text-slate-400">
                                                    {new Date(post.created_at).toLocaleDateString('he-IL')}
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white p-20 rounded-2xl border border-dashed border-slate-200 text-center text-slate-400">
                                <p>לא נמצאו פריטים בקטגוריה זו</p>
                            </div>
                        )}

                        {posts.length === 60 && (
                            <div className="mt-12 text-center text-slate-400 italic text-sm">
                                מציג את 60 השיעורים האחרונים. השתמש בסינון לנושאים נוספים.
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
}
