'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getContentItemById, updateContentItem } from '@/lib/db';
import { ContentItem } from '@/lib/types';
import { Save, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function EditContentPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [item, setItem] = useState<ContentItem | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        summary: '',
        content_md: '',
        video_id: '',
        publish_date: '',
        original_tags: ''
    });

    useEffect(() => {
        loadItem();
    }, []);

    async function loadItem() {
        if (!params.id) return;
        try {
            const data = await getContentItemById(Number(params.id));
            if (data) {
                setItem(data);
                setFormData({
                    title: data.title || '',
                    summary: data.summary || '',
                    content_md: data.content_md || '',
                    video_id: data.video_id || '',
                    publish_date: data.publish_date || '',
                    original_tags: data.original_tags || ''
                });
            } else {
                alert('Content item not found');
                router.push('/admin/content');
            }
        } catch (error) {
            console.error('Error loading item:', error);
            alert('Failed to load item');
        } finally {
            setLoading(false);
        }
    }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        try {
            if (!item) return;

            await updateContentItem(item.id, {
                title: formData.title,
                summary: formData.summary || null,
                content_md: formData.content_md || null,
                video_id: formData.video_id || null,
                publish_date: formData.publish_date || null,
                original_tags: formData.original_tags || null
            });

            alert('התוכן עודכן בהצלחה!');
            router.push('/admin/content');
        } catch (error) {
            console.error('Error updating item:', error);
            alert('שגיאה בעדכון התוכן');
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600">טוען תוכן לעריכה...</p>
                </div>
            </div>
        );
    }

    if (!item) return null;

    return (
        <div className="min-h-screen bg-gray-50 p-8" dir="rtl">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/admin/content" className="p-2 hover:bg-white rounded-full transition">
                        <ArrowRight className="w-6 h-6 text-gray-600" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">עריכת תוכן</h1>
                        <p className="text-gray-500 text-sm">מזהה: {item.id} | סוג: {item.main_category}</p>
                    </div>
                </div>

                <form onSubmit={handleSave} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">כותרת</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">תאריך פרסום</label>
                            <input
                                type="text"
                                value={formData.publish_date}
                                onChange={e => setFormData({ ...formData, publish_date: e.target.value })}
                                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="YYYY-MM-DD"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">תקציר (Summary)</label>
                        <textarea
                            value={formData.summary}
                            onChange={e => setFormData({ ...formData, summary: e.target.value })}
                            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none h-20"
                        />
                    </div>

                    {/* Content / Video */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">
                            {item.main_category === 'סרטונים' ? 'מזהה וידאו (YouTube ID)' : 'תוכן מלא (Markdown)'}
                        </label>

                        {item.main_category === 'סרטונים' ? (
                            <input
                                type="text"
                                value={formData.video_id}
                                onChange={e => setFormData({ ...formData, video_id: e.target.value })}
                                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none ltr"
                                placeholder="e.g. dQw4w9WgXcQ"
                            />
                        ) : (
                            <textarea
                                value={formData.content_md}
                                onChange={e => setFormData({ ...formData, content_md: e.target.value })}
                                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none h-96 font-mono text-sm"
                            />
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">תגיות מקוריות</label>
                        <input
                            type="text"
                            value={formData.original_tags}
                            onChange={e => setFormData({ ...formData, original_tags: e.target.value })}
                            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-3 border-t">
                        <Link href="/admin/content" className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition">
                            ביטול
                        </Link>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            שמור שינויים
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
