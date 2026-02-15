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
