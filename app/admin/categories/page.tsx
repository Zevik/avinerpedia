'use client';

import { useState, useEffect } from 'react';
import { getCategories, createCategory, updateCategory, deleteCategory } from '@/lib/db';
import { Category } from '@/lib/types';
import { Plus, Trash2, Edit2, Save, X, ChevronRight, ChevronDown } from 'lucide-react';

export default function CategoriesAdminPage() {
    const [categories, setCategories] = useState<{ main: Category[], sub: Category[] }>({ main: [], sub: [] });
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editName, setEditName] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [newCatName, setNewCatName] = useState('');
    const [newCatType, setNewCatType] = useState<'main' | 'sub'>('sub');
    const [newCatParent, setNewCatParent] = useState<number | null>(null);

    // Expanded main categories state
    const [expanded, setExpanded] = useState<Record<number, boolean>>({});

    const [activeTab, setActiveTab] = useState<'hierarchy' | 'flat'>('hierarchy');

    useEffect(() => {
        loadCategories();
    }, []);

    async function loadCategories() {
        setLoading(true);
        const data = await getCategories();
        // Verify structure
        if (data && data.main && data.sub) {
            setCategories(data);
        } else {
            console.error('Invalid category structure returned:', data);
            setCategories({ main: [], sub: [] });
        }
        setLoading(false);
    }

    async function handleCreate() {
        try {
            if (!newCatName.trim()) return;
            await createCategory({
                name: newCatName,
                type: newCatType,
                parent_id: newCatType === 'sub' ? newCatParent : null
            });
            setNewCatName('');
            setShowAddModal(false);
            loadCategories();
        } catch (err) {
            alert('Failed to create category');
            console.error(err);
        }
    }

    async function handleUpdate(id: number) {
        try {
            await updateCategory(id, { name: editName });
            setEditingId(null);
            loadCategories();
        } catch (err) {
            alert('Failed to update category');
        }
    }

    async function handleDelete(id: number) {
        if (!confirm('האם אתה בטוח? מחיקת קטגוריה תסיר את השיוך של כל התוכן הקשור אליה (יהפוך ל"ללא קטגוריה"). אם יש כפילויות, עדיף להשתמש במיזוג.')) return;
        try {
            await deleteCategory(id);
            loadCategories();
        } catch (err) {
            alert('Failed to delete category');
        }
    }

    // Merge state
    const [showMergeModal, setShowMergeModal] = useState(false);
    const [mergeSource, setMergeSource] = useState<Category | null>(null);
    const [mergeTargetId, setMergeTargetId] = useState<number | null>(null);

    async function handleMerge() {
        if (!mergeSource || !mergeTargetId) return;
        if (mergeSource.id === mergeTargetId) {
            alert('לא ניתן למזג קטגוריה לעצמה');
            return;
        }

        if (!confirm(`האם אתה בטוח שברצונך למזג את "${mergeSource.name}" לתוך הקטגוריה הנבחרת? פעולה זו תעביר את כל התוכן ותמחק את "${mergeSource.name}".`)) return;

        try {
            const { mergeCategories } = await import('@/lib/db');
            await mergeCategories(mergeSource.id, mergeTargetId);
            setShowMergeModal(false);
            setMergeSource(null);
            setMergeTargetId(null);
            loadCategories();
            alert('המיזוג בוצע בהצלחה!');
        } catch (err) {
            console.error(err);
            alert('שגיאה בביצוע המיזוג');
        }
    }

    const openMergeModal = (category: Category) => {
        setMergeSource(category);
        setMergeTargetId(null);
        setShowMergeModal(true);
    };


    const toggleExpand = (id: number) => {
        setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const flatSubCategories = categories.sub;

    if (loading) return <div className="p-8 text-center">Loading categories...</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-8" dir="rtl">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-gray-900">ניהול קטגוריות</h1>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                    >
                        <Plus className="w-5 h-5" />
                        הוסף קטגוריה
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex bg-gray-200 p-1 rounded-lg mb-6 inline-flex">
                    <button
                        onClick={() => setActiveTab('hierarchy')}
                        className={`px-4 py-2 rounded-md transition ${activeTab === 'hierarchy' ? 'bg-white shadow text-blue-600 font-bold' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                        תצוגת עץ (לפי סוג)
                    </button>
                    <button
                        onClick={() => setActiveTab('flat')}
                        className={`px-4 py-2 rounded-md transition ${activeTab === 'flat' ? 'bg-white shadow text-blue-600 font-bold' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                        רשימת נושאים מלאה ({flatSubCategories.length})
                    </button>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

                    {/* HIERARCHY VIEW */}
                    {activeTab === 'hierarchy' && categories.main.map(mainCat => (
                        <div key={mainCat.id} className="border-b border-gray-100 last:border-0">
                            {/* Main Category Row */}
                            <div className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition">
                                <div className="flex items-center gap-3 flex-1">
                                    <button onClick={() => toggleExpand(mainCat.id)} className="text-gray-500 hover:text-blue-600">
                                        {expanded[mainCat.id] ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                                    </button>

                                    {editingId === mainCat.id ? (
                                        <input
                                            type="text"
                                            value={editName}
                                            onChange={e => setEditName(e.target.value)}
                                            className="border rounded px-2 py-1 w-full max-w-xs"
                                            autoFocus
                                        />
                                    ) : (
                                        <span className="font-bold text-lg text-gray-800">{mainCat.name}</span>
                                    )}
                                </div>

                                <div className="flex items-center gap-2">
                                    {editingId === mainCat.id ? (
                                        <>
                                            <button onClick={() => handleUpdate(mainCat.id)} className="p-2 text-green-600 hover:bg-green-50 rounded" title="שמור"><Save className="w-4 h-4" /></button>
                                            <button onClick={() => setEditingId(null)} className="p-2 text-gray-500 hover:bg-gray-50 rounded" title="ביטול"><X className="w-4 h-4" /></button>
                                        </>
                                    ) : (
                                        <>
                                            <button onClick={() => openMergeModal(mainCat)} className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded hover:bg-purple-200 ml-2">מזג</button>
                                            <button onClick={() => { setEditingId(mainCat.id); setEditName(mainCat.name); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded" title="ערוך"><Edit2 className="w-4 h-4" /></button>
                                            <button onClick={() => handleDelete(mainCat.id)} className="p-2 text-red-600 hover:bg-red-50 rounded" title="מחק"><Trash2 className="w-4 h-4" /></button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Sub Categories List */}
                            {expanded[mainCat.id] && (
                                <div className="bg-white border-t border-gray-100">
                                    {categories.sub.filter(sub => sub.parent_id === mainCat.id).length === 0 ? (
                                        <div className="p-4 text-gray-400 text-sm pr-12">אין תת-קטגוריות</div>
                                    ) : (
                                        categories.sub
                                            .filter(sub => sub.parent_id === mainCat.id)
                                            .map(subCat => (
                                                <div key={subCat.id} className="flex items-center justify-between p-3 pr-12 hover:bg-gray-50 transition border-b border-gray-50 last:border-0">
                                                    <div className="flex items-center gap-3">
                                                        {editingId === subCat.id ? (
                                                            <input
                                                                type="text"
                                                                value={editName}
                                                                onChange={e => setEditName(e.target.value)}
                                                                className="border rounded px-2 py-1"
                                                                autoFocus
                                                            />
                                                        ) : (
                                                            <span className="text-gray-700">{subCat.name}</span>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        {editingId === subCat.id ? (
                                                            <>
                                                                <button onClick={() => handleUpdate(subCat.id)} className="p-1 text-green-600" title="שמור"><Save className="w-4 h-4" /></button>
                                                                <button onClick={() => setEditingId(null)} className="p-1 text-gray-500" title="ביטול"><X className="w-4 h-4" /></button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <button onClick={() => openMergeModal(subCat)} className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded hover:bg-purple-200 ml-2">מזג</button>
                                                                <button onClick={() => { setEditingId(subCat.id); setEditName(subCat.name); }} className="p-1 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" title="ערוך"><Edit2 className="w-4 h-4" /></button>
                                                                <button onClick={() => handleDelete(subCat.id)} className="p-1 text-red-600 opacity-0 group-hover:opacity-100 transition-opacity" title="מחק"><Trash2 className="w-4 h-4" /></button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                    )}
                                </div>
                            )}
                        </div>
                    ))}

                    {/* FLAT VIEW */}
                    {activeTab === 'flat' && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-right">
                                <thead className="bg-gray-50 text-gray-500 text-sm">
                                    <tr>
                                        <th className="p-4 font-medium">שם הנושא</th>
                                        <th className="p-4 font-medium">שייך ל...</th>
                                        <th className="p-4 font-medium w-40">פעולות</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {flatSubCategories.map(cat => {
                                        const parent = categories.main.find(p => p.id === cat.parent_id);
                                        return (
                                            <tr key={cat.id} className="hover:bg-gray-50 transition group">
                                                <td className="p-4">
                                                    {editingId === cat.id ? (
                                                        <input
                                                            type="text"
                                                            value={editName}
                                                            onChange={e => setEditName(e.target.value)}
                                                            className="border rounded px-2 py-1 w-full"
                                                            autoFocus
                                                        />
                                                    ) : (
                                                        <span className="font-medium text-gray-800">{cat.name}</span>
                                                    )}
                                                </td>
                                                <td className="p-4 text-gray-500">
                                                    {parent?.name || '-'}
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        {editingId === cat.id ? (
                                                            <>
                                                                <button onClick={() => handleUpdate(cat.id)} className="p-1 text-green-600" title="שמור"><Save className="w-4 h-4" /></button>
                                                                <button onClick={() => setEditingId(null)} className="p-1 text-gray-500" title="ביטול"><X className="w-4 h-4" /></button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <button onClick={() => openMergeModal(cat)} className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded hover:bg-purple-200">מזג</button>
                                                                <button onClick={() => { setEditingId(cat.id); setEditName(cat.name); }} className="p-1 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" title="ערוך"><Edit2 className="w-4 h-4" /></button>
                                                                <button onClick={() => handleDelete(cat.id)} className="p-1 text-red-600 opacity-0 group-hover:opacity-100 transition-opacity" title="מחק"><Trash2 className="w-4 h-4" /></button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {flatSubCategories.length === 0 && (
                                        <tr>
                                            <td colSpan={3} className="p-8 text-center text-gray-500">לא נמצאו נושאים</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Add Category Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
                        <h2 className="text-2xl font-bold mb-4">הוסף קטגוריה חדשה</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">שם הקטגוריה</label>
                                <input
                                    type="text"
                                    value={newCatName}
                                    onChange={e => setNewCatName(e.target.value)}
                                    className="w-full border rounded-lg px-3 py-2"
                                    placeholder="הזן שם..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">סוג</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="radio"
                                            checked={newCatType === 'main'}
                                            onChange={() => { setNewCatType('main'); setNewCatParent(null); }}
                                        />
                                        <span>קטגוריה ראשית</span>
                                    </label>
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="radio"
                                            checked={newCatType === 'sub'}
                                            onChange={() => { setNewCatType('sub'); setNewCatParent(categories.main[0]?.id || null); }}
                                        />
                                        <span>תת-קטגוריה</span>
                                    </label>
                                </div>
                            </div>

                            {newCatType === 'sub' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">קטגוריית אב</label>
                                    <select
                                        value={newCatParent || ''}
                                        onChange={e => setNewCatParent(Number(e.target.value))}
                                        className="w-full border rounded-lg px-3 py-2"
                                    >
                                        {categories.main.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={handleCreate}
                                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium"
                                >
                                    צור
                                </button>
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 font-medium"
                                >
                                    ביטול
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Merge Modal */}
            {showMergeModal && mergeSource && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
                        <h2 className="text-2xl font-bold mb-4 text-purple-700">מיזוג קטגוריות</h2>

                        <p className="mb-4 text-gray-600">
                            אתה עומד למזג את הקטגוריה <strong>"{mergeSource.name}"</strong>.
                            <br />
                            נא לבחור לאיזו קטגוריה להעביר את כל התוכן שלה:
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">קטגוריית יעד</label>
                                <select
                                    value={mergeTargetId || ''}
                                    onChange={e => setMergeTargetId(Number(e.target.value))}
                                    className="w-full border rounded-lg px-3 py-2"
                                >
                                    <option value="">-- בחר קטגוריה --</option>
                                    {(mergeSource.type === 'main' ? categories.main : categories.sub)
                                        .filter(c => c.id !== mergeSource.id)
                                        .map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))
                                    }
                                </select>
                            </div>

                            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded text-sm text-yellow-800">
                                ⚠️ פעולה זו תעביר את כל התוכן לתוך קטגוריית היעד ותמחק את "{mergeSource.name}" לצמיתות.
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={handleMerge}
                                    disabled={!mergeTargetId}
                                    className="flex-1 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    מזג ומחק
                                </button>
                                <button
                                    onClick={() => { setShowMergeModal(false); setMergeSource(null); }}
                                    className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 font-medium"
                                >
                                    ביטול
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
