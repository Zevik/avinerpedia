import Link from 'next/link';
import Image from 'next/image';
import { Calendar, ArrowLeft, Play } from 'lucide-react';
import { cardSummary, displayTitle } from '@/lib/utils';
import { cardThumbnail } from '@/lib/video';

export function ArticleCard({ article }: { article: any }) {
    const summary = cardSummary(article.summary);
    const thumbnail = cardThumbnail(article.video_id);

    return (
        <Link
            href={`/content/${article.id}`}
            className="group flex flex-col sm:flex-row gap-5 bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow p-6"
        >
            {thumbnail && (
                <div className="relative w-full sm:w-56 flex-shrink-0 aspect-video overflow-hidden rounded-lg bg-muted">
                    <Image src={thumbnail} alt={displayTitle(article.title)} fill className="object-cover" sizes="(max-width: 640px) 100vw, 224px" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow">
                            <Play className="w-6 h-6 text-primary mr-0.5" fill="currentColor" />
                        </div>
                    </div>
                </div>
            )}

            <div className="flex-1 min-w-0 flex flex-col">
                <h2 className="text-2xl font-bold mb-3 group-hover:text-primary transition-colors">
                    {displayTitle(article.title)}
                </h2>

                {summary && (
                    <p className="text-muted-foreground mb-4 line-clamp-3">
                        {summary}
                    </p>
                )}

                <div className="flex items-center justify-between mt-auto">
                    <div className="flex items-center space-x-4 space-x-reverse text-sm text-muted-foreground">
                        {article.publish_date && (
                            <div className="flex items-center space-x-2 space-x-reverse">
                                <Calendar className="w-4 h-4" />
                                <span>{new Date(article.publish_date).toLocaleDateString('he-IL')}</span>
                            </div>
                        )}
                        {article.sub_category && (
                            <span className="px-2 py-1 bg-secondary rounded-full text-xs">
                                {article.sub_category}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center space-x-2 space-x-reverse text-primary font-semibold">
                        <span>{article.video_id ? 'צפו בשיעור' : 'קראו עוד'}</span>
                        <ArrowLeft className="w-4 h-4" />
                    </div>
                </div>
            </div>
        </Link>
    );
}
