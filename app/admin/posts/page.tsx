'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminPostsPage() {
    const router = useRouter();

    useEffect(() => {
        router.push('/admin/content');
    }, [router]);

    return (
        <div className="flex items-center justify-center min-h-screen">
            <p className="text-gray-500">Redirecting to Content Management...</p>
        </div>
    );
}
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import { Trash2, Edit, Search, Plus, ArrowRight } from 'lucide-react';

export default function AdminPostsPage() {
    const router = useRouter();
    const supabase = createClientComponentClient();
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchPosts();
    }, []);

    async function fetchPosts() {
        setLoading(true);
        const { data, error } = await supabase
            .from('posts')
            .select('id, title, slug, status, created_at')
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) {
            console.error('Error fetching posts:', error);
        } else {
            setPosts(data || []);
        }
        setLoading(false);
    }

    async function handleDelete(id: string) {
        if (!confirm('האם אתה בטוח שברצונך למחוק פוסט זה?')) return;

        const { error } = await supabase.from('posts').delete().eq('id', id);
        if (error) {
            alert('שגיאה במחיקה: ' + error.message);
        } else {
            setPosts(posts.filter(p => p.id !== id));
        }
    }

    const filteredPosts = posts.filter(post =>
        post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.slug.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            {/* Header */}
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Link href="/admin/dashboard" className="text-gray-500 hover:text-gray-700">
                            <ArrowRight className="w-6 h-6" />
                        </Link>
                        <h1 className="text-2xl font-bold text-gray-900">ניהול פוסטים</h1>
                    </div>
                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                        <Plus className="w-5 h-5" />
                        <span>פוסט חדש</span>
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8">
                {/* Search Bar */}
                <div className="mb-6 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="חיפוש לפי כותרת או Slug..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Posts Table */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="w-full text-right border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b">
                                <th className="px-6 py-4 text-sm font-semibold text-gray-600">כותרת</th>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-600">סטטוס</th>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-600">תאריך יצירה</th>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-600">פעולות</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">טוען...</td>
                                </tr>
                            ) : filteredPosts.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">לא נמצאו פוסטים</td>
                                </tr>
                            ) : (
                                filteredPosts.map((post) => (
                                    <tr key={post.id} className="border-b hover:bg-gray-50 transition">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">{post.title}</div>
                                            <div className="text-xs text-gray-500">{post.slug}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${post.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                {post.status === 'published' ? 'פורסם' : 'טיוטה'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {new Date(post.created_at).toLocaleDateString('he-IL')}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <Link
                                                    href={`/wiki/${post.slug}`}
                                                    target="_blank"
                                                    className="text-gray-400 hover:text-blue-600 transition"
                                                    title="צפייה"
                                                >
                                                    <Edit className="w-5 h-5" />
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(post.id)}
                                                    className="text-gray-400 hover:text-red-600 transition"
                                                    title="מחיקה"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <p className="mt-4 text-sm text-gray-500 text-left">
                    מציג {filteredPosts.length} פוסטים מתוך {posts.length} האחרונים
                </p>
            </main>
        </div>
    );
}
