import Link from 'next/link';
import { Calendar, ArrowLeft } from 'lucide-react';

export function ArticleCard({ article }: { article: any }) {
    // Helper to check if summary is valid content and not metadata
    const isValidSummary = (text: string) => {
        if (!text) return false;
        return !text.includes('catid=');
    };

    return (
        <Link
            href={`/content/${article.id}`}
            className="block bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow p-6"
        >
            <h2 className="text-2xl font-bold mb-3 hover:text-primary transition-colors">
                {article.title}
            </h2>

            {article.summary && isValidSummary(article.summary) && (
                <p className="text-muted-foreground mb-4 line-clamp-3">
                    {article.summary}
                </p>
            )}

            <div className="flex items-center justify-between">
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
                    <span>קרא עוד</span>
                    <ArrowLeft className="w-4 h-4" />
                </div>
            </div>
        </Link>
    );
}
