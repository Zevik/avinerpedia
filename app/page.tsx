import Link from 'next/link';
import { BookOpen, MessageSquare, FileText, Video, ArrowLeft } from 'lucide-react';
import { getContentItems } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function Home() {
  // Fetch content for each category in parallel
  const [seriesItems, qaItems, articlesItems, videosItems] = await Promise.all([
    getContentItems({ main_category: 'סדרות', limit: 6 }),
    getContentItems({ main_category: 'שו"ת הלכה', limit: 8 }),
    getContentItems({ main_category: 'מאמרים', limit: 8 }),
    getContentItems({ main_category: 'סרטונים', limit: 8 }),
  ]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-secondary/20" dir="rtl">
      {/* Hero Section */}
      <section className="relative h-[60vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900">
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
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 py-16 space-y-20">
        {/* Series Section */}
        <CategorySection
          title="סדרות לימוד"
          icon={<BookOpen className="w-8 h-8" />}
          items={seriesItems}
          viewAllHref="/series"
          color="blue"
        />

        {/* Q&A Section */}
        <CategorySection
          title="שו&quot;ת הלכה"
          icon={<MessageSquare className="w-8 h-8" />}
          items={qaItems}
          viewAllHref="/qa"
          color="green"
        />

        {/* Articles Section */}
        <CategorySection
          title="מאמרים"
          icon={<FileText className="w-8 h-8" />}
          items={articlesItems}
          viewAllHref="/articles"
          color="purple"
        />

        {/* Videos Section */}
        <CategorySection
          title="סרטונים"
          icon={<Video className="w-8 h-8" />}
          items={videosItems}
          viewAllHref="/videos"
          color="red"
        />
      </div>
    </main>
  );
}

interface CategorySectionProps {
  title: string;
  icon: React.ReactNode;
  items: any[];
  viewAllHref: string;
  color: 'blue' | 'green' | 'purple' | 'red';
}

function CategorySection({ title, icon, items, viewAllHref, color }: CategorySectionProps) {
  const colorClasses = {
    blue: {
      border: 'border-blue-600',
      bg: 'bg-blue-50',
      text: 'text-blue-600',
      hover: 'hover:bg-blue-600 hover:text-white',
      iconBg: 'bg-blue-100',
    },
    green: {
      border: 'border-green-600',
      bg: 'bg-green-50',
      text: 'text-green-600',
      hover: 'hover:bg-green-600 hover:text-white',
      iconBg: 'bg-green-100',
    },
    purple: {
      border: 'border-purple-600',
      bg: 'bg-purple-50',
      text: 'text-purple-600',
      hover: 'hover:bg-purple-600 hover:text-white',
      iconBg: 'bg-purple-100',
    },
    red: {
      border: 'border-red-600',
      bg: 'bg-red-50',
      text: 'text-red-600',
      hover: 'hover:bg-red-600 hover:text-white',
      iconBg: 'bg-red-100',
    },
  };

  const colors = colorClasses[color];

  return (
    <section>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${colors.iconBg} ${colors.text}`}>
            {icon}
          </div>
          <h2 className="text-3xl font-bold text-gray-900">{title}</h2>
        </div>
        <Link
          href={viewAllHref}
          className={`flex items-center gap-2 px-6 py-3 rounded-full border-2 ${colors.border} ${colors.text} ${colors.hover} transition-all duration-300 font-semibold`}
        >
          <span>צפה בהכל</span>
          <ArrowLeft className="w-4 h-4" />
        </Link>
      </div>

      {items.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/content/${item.id}`}
              className="group block bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden"
            >
              <div className={`h-2 w-full ${colors.bg}`}></div>
              <div className="p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-2 line-clamp-2 group-hover:text-${color}-600 transition-colors">
                  {item.title}
                </h3>
                {item.summary && (
                  <p className="text-sm text-gray-600 line-clamp-3 mb-3">
                    {item.summary}
                  </p>
                )}
                {item.sub_category && (
                  <span className={`inline-block px-3 py-1 ${colors.bg} ${colors.text} rounded-full text-xs font-medium`}>
                    {item.sub_category}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className={`${colors.bg} border ${colors.border} rounded-2xl p-12 text-center`}>
          <p className="text-gray-700">אין תוכן זמין כרגע בקטגוריה זו</p>
        </div>
      )}
    </section>
  );
}
