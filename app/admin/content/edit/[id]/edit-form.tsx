'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { ContentForm } from '@/components/admin/ContentForm';
import { getContentItemById } from '@/lib/db';
import type { ContentItem } from '@/lib/types';

/** Loads the item (with the admin's session, so hidden items too) and shows the shared form. */
export default function EditContentForm({ id }: { id: string }) {
  const router = useRouter();
  const [item, setItem] = useState<ContentItem | null>(null);

  useEffect(() => {
    getContentItemById(Number(id))
      .then((data) => {
        if (data) setItem(data);
        else router.push('/admin/content');
      })
      .catch((error) => {
        console.error('Error loading item:', error);
        router.push('/admin/content');
      });
  }, [id, router]);

  if (!item) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">טוען תוכן לעריכה...</p>
        </div>
      </div>
    );
  }

  return <ContentForm item={item} />;
}
