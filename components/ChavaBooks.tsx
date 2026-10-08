import { ArrowLeft, BookOpenText, ExternalLink } from 'lucide-react';

/** ספריית חוה: the bookshop with Rav Aviner's books (an external site, opened in a new tab). */
export const CHAVA_BOOKS_URL = 'https://www.chavabooks.co.il/';

const newTab = { target: '_blank', rel: 'noopener' } as const;

/** Home page banner: the whole card is the link. */
export function ChavaBooksBanner() {
  return (
    <a
      href={CHAVA_BOOKS_URL}
      {...newTab}
      className="group flex flex-col sm:flex-row items-center gap-4 rounded-2xl border border-amber-200 bg-gradient-to-l from-amber-50 via-orange-50 to-amber-100 p-5 md:px-8 mb-8 md:mb-10 shadow-sm hover:shadow-md transition-shadow text-center sm:text-right"
    >
      <span className="w-14 h-14 flex-shrink-0 rounded-full bg-amber-700 text-white flex items-center justify-center shadow">
        <BookOpenText className="w-7 h-7" aria-hidden />
      </span>
      <span className="flex-1">
        <span className="block text-lg md:text-xl font-bold text-amber-950">ספריית חוה</span>
        <span className="block text-sm md:text-base text-amber-900">כל ספרי הרב שלמה אבינר ועוד, לרכישה בחנות הספרים</span>
      </span>
      <span className="inline-flex items-center gap-2 rounded-full bg-amber-700 group-hover:bg-amber-800 text-white font-semibold px-5 py-2.5 transition-colors">
        לחנות הספרים
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" aria-hidden />
      </span>
      <span className="sr-only">(נפתח בחלון חדש)</span>
    </a>
  );
}

/** Footer link. */
export function ChavaBooksFooterLink() {
  return (
    <a href={CHAVA_BOOKS_URL} {...newTab} className="inline-flex items-center gap-1 underline underline-offset-4 hover:text-primary">
      ספריית חוה – ספרי הרב
      <ExternalLink className="w-3.5 h-3.5" aria-hidden />
      <span className="sr-only">(נפתח בחלון חדש)</span>
    </a>
  );
}
