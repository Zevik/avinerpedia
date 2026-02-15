'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';

interface AdminStats {
  totalContent: number;
  totalArticles: number;
  totalVideos: number;
  totalQA: number;
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

        // Get statistics from CORRECT tables using specific count queries
        const [
          totalRes,
          articlesRes,
          videosRes,
          qaRes,
          categoriesRes
        ] = await Promise.all([
          supabase.from('content_items').select('*', { count: 'exact', head: true }),
          supabase.from('content_items').select('*', { count: 'exact', head: true }).eq('main_category', 'מאמרים'),
          supabase.from('content_items').select('*', { count: 'exact', head: true }).eq('main_category', 'סרטונים'),
          supabase.from('content_items').select('*', { count: 'exact', head: true }).eq('main_category', 'שו"ת הלכה'),
          supabase.from('categories').select('id', { count: 'exact', head: true }),
        ]);

        setStats({
          totalContent: totalRes.count || 0,
          totalArticles: articlesRes.count || 0,
          totalVideos: videosRes.count || 0,
          totalQA: qaRes.count || 0,
          categories: categoriesRes.count || 0,
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
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">לוח בקרה - ניהול</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm"
            >
              התנתק
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6 border-r-4 border-blue-500">
            <div className="text-gray-600 text-sm font-medium">סה"כ תוכן</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">{stats?.totalContent}</div>
            <div className="text-gray-500 text-xs mt-2">כל הפריטים במערכת</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-r-4 border-green-500">
            <div className="text-gray-600 text-sm font-medium">מאמרים</div>
            <div className="text-3xl font-bold text-green-600 mt-2">{stats?.totalArticles}</div>
            <div className="text-gray-500 text-xs mt-2">שיעורים כתובים</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-r-4 border-red-500">
            <div className="text-gray-600 text-sm font-medium">סרטונים</div>
            <div className="text-3xl font-bold text-red-600 mt-2">{stats?.totalVideos}</div>
            <div className="text-gray-500 text-xs mt-2">וידאו ויוטיוב</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-r-4 border-purple-500">
            <div className="text-gray-600 text-sm font-medium">שו"ת וסמס</div>
            <div className="text-3xl font-bold text-purple-600 mt-2">{stats?.totalQA}</div>
            <div className="text-gray-500 text-xs mt-2">שאלות ותשובות</div>
          </div>
        </div>

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Content Management */}
          <div className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition group">
            <div className="bg-blue-600 h-32 flex items-center justify-center group-hover:bg-blue-700 transition">
              <div className="text-white text-5xl">📝</div>
            </div>
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">ניהול תוכן</h2>
              <p className="text-gray-600 text-sm mb-4">
                צפייה, עריכה ושיוך קטגוריות לכל סוגי התוכן (מאמרים, סרטונים, שו"ת)
              </p>
              <Link
                href="/admin/content"
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
              >
                עבור לניהול תוכן ←
              </Link>
            </div>
          </div>

          {/* Categories Management */}
          <div className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition group">
            <div className="bg-purple-600 h-32 flex items-center justify-center group-hover:bg-purple-700 transition">
              <div className="text-white text-5xl">🏷️</div>
            </div>
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">ניהול קטגוריות</h2>
              <p className="text-gray-600 text-sm mb-4">
                עריכת עץ הקטגוריות, הוספת נושאים חדשים ומיזוג כפילויות
              </p>
              <Link
                href="/admin/categories"
                className="inline-block bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
              >
                עבור לניהול קטגוריות ←
              </Link>
            </div>
          </div>

          {/* Database Browser */}
          <div className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition group">
            <div className="bg-indigo-600 h-32 flex items-center justify-center group-hover:bg-indigo-700 transition">
              <div className="text-white text-5xl">🗄️</div>
            </div>
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">דפדפן מסד נתונים</h2>
              <p className="text-gray-600 text-sm mb-4">
                גישה ישירה לטבלאות ב-Supabase (למתקדמים)
              </p>
              <a
                href="https://supabase.com/dashboard/project/gmxnfgbillsvscqouhke/editor"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg"
              >
                פתח ב-Supabase ←
              </a>
            </div>
          </div>
        </div>

        {/* Quick Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">🚀 סטטוס מערכת</h3>
          <ul className="text-blue-800 text-sm space-y-1">
            <li>✅ חיבור למסד נתונים: תקין ({stats?.totalContent} פריטים)</li>
            <li>✅ מערכת קטגוריות: פעילה ({stats?.categories} קטגוריות ונושאים)</li>
            <li>⏳ עורך תוכן עשיר: בפיתוח</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
