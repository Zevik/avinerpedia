'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2, Save } from 'lucide-react';
import { createContentItem, getSourceOptions, updateContentItem, type EditableContent } from '@/lib/db';
import type { ContentItem } from '@/lib/types';
import { cardThumbnail, isValidVideoId, normalizeVideoInput } from '@/lib/video';

/** The types an editor can pick, with the main_category the public pages filter on. */
const TYPES = [
  { key: 'article', label: 'מאמר', mainCategory: 'מאמרים' },
  { key: 'video', label: 'וידאו', mainCategory: 'סרטונים' },
  { key: 'qa', label: 'שו"ת', mainCategory: 'שו"ת הלכה' },
] as const;
type EditableType = (typeof TYPES)[number]['key'];
const isEditableType = (t: unknown): t is EditableType => TYPES.some((x) => x.key === t);

const input = 'w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none';
const label = 'text-sm font-medium text-gray-700';

/**
 * Add or edit a content item: title, type (article / video / Q&A), source, date, summary,
 * video (any type — a Q&A answered on video counts as both Q&A and video in the library),
 * body, tags, visibility. Saving purges the public cache (lib/revalidate.ts).
 */
export function ContentForm({ item }: { item?: ContentItem }) {
  const router = useRouter();
  const [sources, setSources] = useState<{ id: number; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Series episodes and French lessons keep their type (series order, the /french page).
  const lockedType = item && !isEditableType(item.content_type) ? item.content_type : null;
  const [form, setForm] = useState({
    title: item?.title ?? '',
    content_type: (isEditableType(item?.content_type) ? item.content_type : 'article') as EditableType,
    source_id: item?.source_id ? String(item.source_id) : '',
    publish_date: item?.publish_date ?? '',
    summary: item?.summary ?? '',
    video: item?.video_id ?? '',
    content_md: item?.content_md ?? '',
    original_tags: item?.original_tags ?? '',
    is_active: item?.is_active ?? true,
  });
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));

  useEffect(() => {
    getSourceOptions().then(setSources).catch((e) => console.error('Error loading sources:', e));
  }, []);

  const videoId = normalizeVideoInput(form.video);
  const videoInvalid = !!videoId && !isValidVideoId(videoId);
  const thumbnail = videoId && !videoInvalid ? cardThumbnail(videoId) : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (videoInvalid) return setError('מזהה הסרטון לא תקין: הדביקו קישור יוטיוב, מזהה יוטיוב (11 תווים) או Meir:מספר.');
    if (!lockedType && form.content_type === 'video' && !videoId) return setError('פריט מסוג וידאו צריך סרטון.');

    const type = TYPES.find((t) => t.key === form.content_type)!;
    const fields: EditableContent = {
      title: form.title.trim(),
      summary: form.summary.trim() || null,
      content_md: form.content_md.trim() ? form.content_md : null,
      video_id: videoId,
      publish_date: form.publish_date || null,
      original_tags: form.original_tags.trim() || null,
      is_active: form.is_active,
      source_id: form.source_id ? Number(form.source_id) : null,
      ...(lockedType ? {} : { content_type: type.key, main_category: type.mainCategory as ContentItem['main_category'] }),
    };

    setSaving(true);
    try {
      if (item) {
        await updateContentItem(item.id, fields);
        router.push('/admin/content');
      } else {
        const created = await createContentItem({ ...fields, title: fields.title!, main_category: type.mainCategory });
        router.push(`/admin/content/edit/${created.id}`);
      }
      router.refresh();
    } catch (err) {
      console.error('Error saving item:', err);
      const code = (err as { code?: string })?.code;
      setError(code === '23505' ? 'כבר קיים פריט עם הכותרת הזו. בחרו כותרת אחרת.' : 'שגיאה בשמירה. נסו שוב.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin/content" className="p-2 hover:bg-white rounded-full transition" aria-label="חזרה לרשימה">
            <ArrowRight className="w-6 h-6 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{item ? 'עריכת פריט' : 'הוספת פריט'}</h1>
            {item && (
              <p className="text-gray-500 text-sm">
                מזהה: {item.id} · <Link href={`/content/${item.id}`} target="_blank" className="text-blue-600 hover:underline">צפייה באתר</Link>
              </p>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
          <div className="space-y-2">
            <label htmlFor="f-title" className={label}>כותרת</label>
            <input id="f-title" type="text" required value={form.title} onChange={(e) => set('title', e.target.value)} className={input} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label htmlFor="f-type" className={label}>סוג תוכן</label>
              {lockedType ? (
                <p className="px-3 py-2 text-gray-600 bg-gray-50 rounded-lg">{lockedType === 'series' ? 'שיעור בסדרה' : 'שיעור בצרפתית'} (לא ניתן לשינוי)</p>
              ) : (
                <select id="f-type" value={form.content_type} onChange={(e) => set('content_type', e.target.value as EditableType)} className={input}>
                  {TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
              )}
            </div>
            <div className="space-y-2">
              <label htmlFor="f-source" className={label}>מקור</label>
              <select id="f-source" value={form.source_id} onChange={(e) => set('source_id', e.target.value)} className={input}>
                <option value="">ללא מקור</option>
                {sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="f-date" className={label}>תאריך פרסום</label>
              <input id="f-date" type="date" value={form.publish_date} onChange={(e) => set('publish_date', e.target.value)} className={input} />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="f-video" className={label}>
              סרטון {form.content_type === 'video' && !lockedType ? '' : '(לא חובה)'}
            </label>
            <div className="flex gap-4 items-start">
              <div className="flex-1 space-y-1">
                <input
                  id="f-video"
                  type="text"
                  dir="ltr"
                  value={form.video}
                  onChange={(e) => set('video', e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=...  /  Meir:1234"
                  className={`${input} ${videoInvalid ? 'border-red-400' : ''}`}
                  aria-invalid={videoInvalid}
                  aria-describedby="f-video-help"
                />
                <p id="f-video-help" className={`text-xs ${videoInvalid ? 'text-red-600' : 'text-gray-500'}`}>
                  {videoInvalid
                    ? 'לא מזוהה כסרטון: קישור יוטיוב, מזהה יוטיוב (11 תווים) או Meir:מספר.'
                    : form.content_type === 'qa'
                      ? 'שו"ת שנענה בווידאו: הדביקו כאן את הסרטון. הפריט יופיע גם בשו"ת וגם בסרטונים.'
                      : 'קישור יוטיוב, מזהה יוטיוב, או Meir:מספר לשיעור ממכון מאיר.'}
                  {videoId && !videoInvalid && videoId !== form.video.trim() && <span className="block text-gray-500">יישמר כ: {videoId}</span>}
                </p>
              </div>
              {thumbnail && (
                <div className="relative w-36 aspect-video flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                  <Image src={thumbnail} alt="תצוגה מקדימה של הסרטון" fill className="object-cover" sizes="144px" />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="f-summary" className={label}>תקציר</label>
            <textarea id="f-summary" value={form.summary} onChange={(e) => set('summary', e.target.value)} className={`${input} h-20`} />
          </div>

          <div className="space-y-2">
            <label htmlFor="f-body" className={label}>
              {form.content_type === 'video' && !lockedType ? 'תיאור / תוכן נוסף (לא חובה, Markdown)' : 'תוכן (Markdown)'}
            </label>
            <textarea id="f-body" value={form.content_md} onChange={(e) => set('content_md', e.target.value)} className={`${input} h-80 font-mono text-sm`} />
          </div>

          <div className="space-y-2">
            <label htmlFor="f-tags" className={label}>תגיות (מופרדות ב-" | ")</label>
            <input id="f-tags" type="text" value={form.original_tags} onChange={(e) => set('original_tags', e.target.value)} className={input} />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={form.is_active}
              aria-label="גלוי באתר"
              onClick={() => set('is_active', !form.is_active)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.is_active ? 'bg-green-600' : 'bg-gray-300'}`}
            >
              <span className={`${form.is_active ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
            </button>
            <span className={`text-sm font-medium ${form.is_active ? 'text-green-700' : 'text-gray-500'}`}>
              {form.is_active ? 'פעיל (גלוי באתר)' : 'לא פעיל (מוסתר מהאתר)'}
            </span>
          </div>

          {!item && (
            <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
              פריט חדש מופיע בספריית התכנים ובחיפוש מיד. שיוך לנושאים (סינון לפי נושא) עדיין אינו חלק מהטופס.
            </p>
          )}

          {error && <p role="alert" className="text-sm text-red-700 bg-red-50 rounded-lg p-3">{error}</p>}

          <div className="pt-4 flex justify-end gap-3 border-t">
            <Link href="/admin/content" className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition">ביטול</Link>
            <button type="submit" disabled={saving || videoInvalid} className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {item ? 'שמירת שינויים' : 'הוספת הפריט'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
