'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * A home page row: a title, "הציגו הכל", and cards that scroll sideways (swipe on mobile,
 * arrow buttons on desktop). RTL: the next cards are to the left.
 */
export function ContentRow({ title, subtitle, allHref, children }: {
  title: string;
  subtitle?: string;
  allHref: string;
  children: React.ReactNode;
}) {
  const track = useRef<HTMLDivElement>(null);
  // In RTL, scrolling toward the next cards means a negative scrollBy.
  const scroll = (direction: 'next' | 'prev') => {
    const el = track.current;
    if (!el) return;
    el.scrollBy({ left: (direction === 'next' ? -1 : 1) * el.clientWidth * 0.85, behavior: 'smooth' });
  };

  return (
    <section aria-label={title} className="mb-10">
      <div className="flex items-end justify-between gap-4 mb-3">
        <div>
          <h2 className="text-xl md:text-2xl font-bold">{title}</h2>
          {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button type="button" onClick={() => scroll('prev')} className="hidden md:flex w-9 h-9 items-center justify-center rounded-full border bg-white hover:bg-secondary" aria-label="הקודמים">
            <ChevronRight className="w-5 h-5" />
          </button>
          <button type="button" onClick={() => scroll('next')} className="hidden md:flex w-9 h-9 items-center justify-center rounded-full border bg-white hover:bg-secondary" aria-label="הבאים">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <Link prefetch={false} href={allHref} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline underline-offset-4">
            הציגו הכל
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </div>
      </div>
      <div
        ref={track}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4 md:mx-0 md:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
    </section>
  );
}
