'use client';

import { useState, useEffect } from 'react';
import { getContentItems, getCategories, updateContentCategory } from '@/lib/db';
import { Category, ContentItem, MainCategory } from '@/lib/types';
import { Search, Filter, Save, Check } from 'lucide-react';
import Link from 'next/link';

export default function ContentAdminPage() {
    const [items, setItems] = useState<ContentItem[]>([]);
    const [categories, setCategories] = useState<{ main: Category[], sub: Category[] }>({ main: [], sub: [] });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterMain, setFilterMain] = useState<string>('');

    // Edit state
    const [editingId, setEditingId] = useState<number | null>(null);
    const [tempMainId, setTempMainId] = useState<number | null>(null);
    const [tempSubId, setTempSubId] = useState<number | null>(null);

    useEffect(() => {
        loadData();
    }, [search, filterMain]);

    async function loadData() {
        setLoading(true);
        const [cats, content] = await Promise.all([
            getCategories(),
            getContentItems({
                search: search.length > 2 ? search : undefined,
                limit: 50,
                main_category: filterMain ? (filterMain as MainCategory) : undefined
            })
        ]);

        if (cats && cats.main) setCategories(cats);
        setItems(content);
        setLoading(false);
    }

    async function handleSave(id: number) {
        if (!tempMainId) return;
        try {
            await updateContentCategory(id, tempMainId, tempSubId || undefined);
            setEditingId(null);
            // Refresh list to show updates
            loadData();
        } catch (err) {
            alert('Failed to update content');
            console.error(err);
        }
    }

    function startEditing(item: ContentItem) {
        setEditingId(item.id);
        setTempMainId(item.main_category_id);
        setTempSubId(item.sub_category_id);
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8" dir="rtl">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">ניהול תוכן</h1>
                    <Link href="/admin/categories" className="text-blue-600 hover:underline">
                        ניהול קטגוריות ←
                    </Link>
                </div>

                {/* Filters */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute right-3 top-2.5 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="חפש לפי כותרת..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pr-10 pl-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="w-64">
                        <select
                            value={filterMain}
                            onChange={e => setFilterMain(e.target.value)}
                            className="w-full border rounded-lg px-3 py-2"
                        >
                            <option value="">כל הקטגוריות</option>
                            {categories.main.map(c => (
                                <option key={c.id} value={c.name}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Content Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="w-full text-right">
                        <thead className="bg-gray-50 text-gray-700 font-medium">
                            <tr>
                                <th className="p-4">כותרת</th>
                                <th className="p-4">קטגוריה ראשית</th>
                                <th className="p-4">תת-קטגוריה</th>
                                <th className="p-4">פעולות</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan={4} className="p-8 text-center">טוען נתונים...</td></tr>
                            ) : items.length === 0 ? (
                                <tr><td colSpan={4} className="p-8 text-center text-gray-500">לא נמצאו תוצאות</td></tr>
                            ) : (
                                items.map(item => (
                                    <tr key={item.id} className="hover:bg-gray-50">
                                        <td className="p-4 font-medium max-w-md truncate">
                                            <a href={`/content/${item.id}`} target="_blank" className="hover:text-blue-600">
                                                {item.title}
                                            </a>
                                        </td>

                                        {editingId === item.id ? (
                                            <>
                                                <td className="p-4">
                                                    <select
                                                        value={tempMainId || ''}
                                                        onChange={e => {
                                                            const val = Number(e.target.value);
                                                            setTempMainId(val);
                                                            // Reset sub cat if main changes
                                                            setTempSubId(null);
                                                        }}
                                                        className="border rounded px-2 py-1 w-full"
                                                    >
                                                        {categories.main.map(c => (
                                                            <option key={c.id} value={c.id}>{c.name}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="p-4">
                                                    <select
                                                        value={tempSubId || ''}
                                                        onChange={e => setTempSubId(Number(e.target.value))}
                                                        className="border rounded px-2 py-1 w-full"
                                                    >
                                                        <option value="">-- ללא --</option>
                                                        {categories.sub
                                                            .filter(sub => sub.parent_id === tempMainId)
                                                            .map(sub => (
                                                                <option key={sub.id} value={sub.id}>{sub.name}</option>
                                                            ))}
                                                    </select>
                                                </td>
                                                <td className="p-4">
                                                    <button onClick={() => handleSave(item.id)} className="text-green-600 hover:bg-green-50 p-2 rounded"><Check className="w-5 h-5" /></button>
                                                    <button onClick={() => setEditingId(null)} className="text-gray-400 hover:bg-gray-100 p-2 rounded">ביטול</button>
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="p-4 text-gray-600">{item.main_category}</td>
                                                <td className="p-4 text-gray-500">{item.sub_category || '-'}</td>
                                                <td className="p-4">
                                                    <button
                                                        onClick={() => startEditing(item)}
                                                        className="text-blue-600 hover:bg-blue-50 px-3 py-1 rounded text-sm font-medium"
                                                    >
                                                        ערוך
                                                    </button>
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
