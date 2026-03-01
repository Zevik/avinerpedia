'use client';

import { useState } from 'react';
import { getContentItems } from '@/lib/db';
import { ArticleCard } from './ArticleCard';
import { QAListItem } from './QAListItem';
import { VideoCard } from './VideoCard';
import { Loader2 } from 'lucide-react';

interface InfiniteContentListProps {
    initialItems: any[];
    filters: any;
    type: 'article' | 'qa' | 'video';
}

export function InfiniteContentList({
    initialItems,
    filters,
    type,
}: InfiniteContentListProps) {
    const [items, setItems] = useState(initialItems);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(initialItems.length >= (filters.limit || 50));
    const [offset, setOffset] = useState(initialItems.length);

    const loadMore = async () => {
        if (loading) return;
        setLoading(true);

        try {
            const nextBatch = await getContentItems({
                ...filters,
                offset: offset,
            });

            if (nextBatch.length === 0) {
                setHasMore(false);
            } else {
                setItems((prev) => [...prev, ...nextBatch]);
                setOffset((prev) => prev + nextBatch.length);
                if (nextBatch.length < (filters.limit || 50)) {
                    setHasMore(false);
                }
            }
        } catch (error) {
            console.error('Error loading more items:', error);
        } finally {
            setLoading(false);
        }
    };

    if (items.length === 0) {
        return (
            <div className="text-center py-16">
                <p className="text-xl text-muted-foreground">לא נמצאו תוצאות</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className={type === 'qa' ? 'space-y-4' : type === 'video' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-6'}>
                {items.map((item) => {
                    if (type === 'article') return <ArticleCard key={item.id} article={item} />;
                    if (type === 'qa') return <QAListItem key={item.id} item={item} />;
                    if (type === 'video') return <VideoCard key={item.id} item={item} />;
                    return null;
                })}
            </div>

            {hasMore && (
                <div className="flex justify-center pt-8 pb-12">
                    <button
                        onClick={loadMore}
                        disabled={loading}
                        className="px-8 py-3 text-lg font-semibold rounded-full border-2 border-primary text-primary hover:bg-primary hover:text-white transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                                טוען...
                            </>
                        ) : (
                            'טען פריטים נוספים'
                        )}
                    </button>
                </div>
            )}
        </div>
    );
}
