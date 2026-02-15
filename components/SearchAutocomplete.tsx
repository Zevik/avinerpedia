
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2, FileText, Video, BookOpen, MessageSquare } from 'lucide-react';
import { useDebounce } from '@/lib/hooks/useDebounce';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface SearchResult {
    id: number;
    title: string;
    main_category: string;
    sub_category?: string;
}

export function SearchAutocomplete() {
    const router = useRouter();
    const [query, setQuery] = React.useState('');
    const [results, setResults] = React.useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = React.useState(false);
    const [isOpen, setIsOpen] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);

    const debouncedQuery = useDebounce(query, 300);

    React.useEffect(() => {
        async function fetchResults() {
            if (!debouncedQuery || debouncedQuery.length < 2) {
                setResults([]);
                return;
            }

            setIsLoading(true);
            try {
                const res = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`);
                if (res.ok) {
                    const data = await res.json();
                    setResults(data);
                    setIsOpen(true);
                }
            } catch (error) {
                console.error('Search error:', error);
            } finally {
                setIsLoading(false);
            }
        }

        fetchResults();
    }, [debouncedQuery]);

    // Close dropdown when clicking outside
    React.useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            setIsOpen(false);
            router.push(`/search?q=${encodeURIComponent(query)}`);
        }
    };

    const getIcon = (category: string) => {
        switch (category) {
            case 'סרטונים': return <Video className="w-4 h-4" />;
            case 'מאמרים': return <FileText className="w-4 h-4" />;
            case 'שו"ת הלכה': return <MessageSquare className="w-4 h-4" />;
            default: return <BookOpen className="w-4 h-4" />;
        }
    };

    return (
        <div ref={containerRef} className="relative w-full max-w-md">
            <form onSubmit={handleSearch} className="relative">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        if (!isOpen && e.target.value.length >= 2) setIsOpen(true);
                    }}
                    onFocus={() => {
                        if (results.length > 0) setIsOpen(true);
                    }}
                    placeholder="חיפוש באבינרפדיה..."
                    className="w-full px-4 py-2 pl-10 pr-10 border rounded-full focus:outline-none focus:ring-2 focus:ring-primary bg-secondary/50 focus:bg-white transition-all text-right"
                    dir="rtl"
                />
                <button
                    type="submit"
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-1 hover:bg-secondary rounded-full transition-colors"
                >
                    <Search className="w-5 h-5 text-muted-foreground" />
                </button>
                {isLoading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    </div>
                )}
            </form>

            {/* Dropdown Results */}
            {isOpen && results.length > 0 && (
                <div className="absolute top-full text-right right-0 w-full mt-2 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden z-[100]">
                    <ul className="max-h-[60vh] overflow-y-auto">
                        {results.map((result) => (
                            <li key={result.id} className="border-b last:border-0 border-gray-50">
                                <Link
                                    href={`/content/${result.id}`}
                                    onClick={() => setIsOpen(false)}
                                    className="block px-4 py-3 hover:bg-secondary/50 transition-colors"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="mt-1 text-primary/70">
                                            {getIcon(result.main_category)}
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-gray-900 line-clamp-1">{result.title}</h4>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                {result.main_category}
                                                {result.sub_category && ` • ${result.sub_category}`}
                                            </p>
                                        </div>
                                    </div>
                                </Link>
                            </li>
                        ))}
                    </ul>
                    <div className="p-2 bg-gray-50 border-t border-gray-100 text-center">
                        <button
                            onClick={handleSearch}
                            className="text-sm text-primary hover:underline font-medium"
                        >
                            לכל התוצאות עבור "{query}"
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
