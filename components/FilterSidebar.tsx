'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Filter } from 'lucide-react';

interface FilterSidebarProps {
  categories: string[];
  currentCategory?: string;
  basePath: string;
}

export function FilterSidebar({ categories, currentCategory, basePath }: FilterSidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleFilterChange = (category: string | null) => {
    const params = new URLSearchParams(searchParams);

    if (category) {
      params.set('topic', category);
    } else {
      params.delete('topic');
    }

    router.push(`${basePath}?${params.toString()}`);
  };

  return (
    <>
      {/* Desktop Sidebar (visible on lg and up) */}
      <aside className="hidden lg:block bg-white rounded-lg shadow-lg p-6 sticky top-24">
        <div className="flex items-center space-x-2 space-x-reverse mb-6">
          <Filter className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold">סינון לפי נושא</h3>
        </div>

        <div className="space-y-2">
          <button
            onClick={() => handleFilterChange(null)}
            className={`w-full text-right px-4 py-2 rounded-lg transition-colors font-medium ${!currentCategory
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'hover:bg-secondary text-gray-700'
              }`}
          >
            הכל
          </button>

          {categories.map((category) => (
            <button
              key={category}
              onClick={() => handleFilterChange(category)}
              className={`w-full text-right px-4 py-2 rounded-lg transition-colors font-medium ${currentCategory === category
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'hover:bg-secondary text-gray-700'
                }`}
            >
              {category}
            </button>
          ))}
        </div>
      </aside>

      {/* Mobile Top Bar (visible on md and below) */}
      <div className="lg:hidden sticky top-[64px] z-30 bg-white/95 backdrop-blur-sm -mx-4 px-4 py-3 border-b mb-6 shadow-sm overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-2 whitespace-nowrap">
          <button
            onClick={() => handleFilterChange(null)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${!currentCategory
              ? 'bg-primary text-primary-foreground shadow-md scale-105'
              : 'bg-gray-100 text-gray-600 active:bg-gray-200'
              }`}
          >
            הכל
          </button>

          {categories.map((category) => (
            <button
              key={category}
              onClick={() => handleFilterChange(category)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${currentCategory === category
                ? 'bg-primary text-primary-foreground shadow-md scale-105'
                : 'bg-gray-100 text-gray-600 active:bg-gray-200'
                }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
