'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface AdminStats {
  totalPosts: number;
  publishedPosts: number;
  draftPosts: number;
  categories: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Get current user
        const { data } = await supabase.auth.getUser();
        if (data.user) {
          setUser(data.user);
        }

        // Get statistics
        const [postsRes, categoriesRes] = await Promise.all([
          supabase.from('posts').select('id, status', { count: 'exact' }),
          supabase.from('categories').select('id', { count: 'exact' }),
        ]);

        const totalPosts = postsRes.count || 0;
        const publishedPosts =
          postsRes.data?.filter((p) => p.status === 'published').length || 0;
        const draftPosts = postsRes.data?.filter((p) => p.status === 'draft').length || 0;
        const categories = categoriesRes.count || 0;

        setStats({
          totalPosts,
          publishedPosts,
          draftPosts,
          categories,
        });
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-600 text-sm font-medium">Total Posts</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">{stats?.totalPosts}</div>
            <div className="text-gray-500 text-xs mt-2">All content items</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-600 text-sm font-medium">Published</div>
            <div className="text-3xl font-bold text-green-600 mt-2">{stats?.publishedPosts}</div>
            <div className="text-gray-500 text-xs mt-2">Live on website</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-600 text-sm font-medium">Drafts</div>
            <div className="text-3xl font-bold text-yellow-600 mt-2">{stats?.draftPosts}</div>
            <div className="text-gray-500 text-xs mt-2">In progress</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-600 text-sm font-medium">Categories</div>
            <div className="text-3xl font-bold text-blue-600 mt-2">{stats?.categories}</div>
            <div className="text-gray-500 text-xs mt-2">Content categories</div>
          </div>
        </div>

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Posts Management */}
          <div className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition">
            <div className="bg-blue-600 h-32 flex items-center justify-center">
              <div className="text-white text-5xl">📝</div>
            </div>
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Manage Posts</h2>
              <p className="text-gray-600 text-sm mb-4">
                Create, edit, delete, and publish articles and lessons
              </p>
              <a
                href="/admin/posts"
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
              >
                Go to Posts →
              </a>
            </div>
          </div>

          {/* Categories Management */}
          <div className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition">
            <div className="bg-purple-600 h-32 flex items-center justify-center">
              <div className="text-white text-5xl">🏷️</div>
            </div>
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Manage Categories</h2>
              <p className="text-gray-600 text-sm mb-4">
                Organize content with categories and subcategories
              </p>
              <a
                href="/admin/categories"
                className="inline-block bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
              >
                Go to Categories →
              </a>
            </div>
          </div>

          {/* Users Management */}
          <div className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition">
            <div className="bg-green-600 h-32 flex items-center justify-center">
              <div className="text-white text-5xl">👥</div>
            </div>
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Admin Users</h2>
              <p className="text-gray-600 text-sm mb-4">
                Manage admin access and editor permissions
              </p>
              <a
                href="/admin/users"
                className="inline-block bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
              >
                Go to Users →
              </a>
            </div>
          </div>

          {/* Database Browser */}
          <div className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition">
            <div className="bg-indigo-600 h-32 flex items-center justify-center">
              <div className="text-white text-5xl">🗄️</div>
            </div>
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Database Browser</h2>
              <p className="text-gray-600 text-sm mb-4">
                View and manage database tables directly
              </p>
              <a
                href="https://app.supabase.com/project/gmxnfgbillsvscqouhke/editor"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg"
              >
                Open Supabase →
              </a>
            </div>
          </div>
        </div>

        {/* Quick Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">🚀 Admin System Status</h3>
          <ul className="text-blue-800 text-sm space-y-1">
            <li>✅ Authentication: Active</li>
            <li>✅ Database: Connected ({stats?.totalPosts} posts imported)</li>
            <li>✅ RLS Policies: Enabled</li>
            <li>⏳ Post Editor: Coming soon</li>
            <li>⏳ Rich Text Editor: Coming soon</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
