'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * BlogCategorySlider
 * A horizontally scrollable slider showing blog categories.
 * Used by PageRenderer.js.
 */
export default function BlogCategorySlider({ section = {} }) {
  const {
    heading    = 'Browse by Category',
    categories = [],
  } = section;

  const scrollRef = useRef(null);

  const scroll = (dir) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir * 280, behavior: 'smooth' });
  };

  if (!categories || categories.length === 0) return null;

  return (
    <section className="py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {heading && (
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-extrabold text-[#1e2a35]">{heading}</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => scroll(-1)}
                className="p-2 rounded-full border border-slate-200 hover:bg-slate-50 transition-colors text-slate-500"
                aria-label="Scroll left"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => scroll(1)}
                className="p-2 rounded-full border border-slate-200 hover:bg-slate-50 transition-colors text-slate-500"
                aria-label="Scroll right"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide"
          style={{ scrollbarWidth: 'none' }}
        >
          {categories.map((cat, i) => (
            <Link
              key={cat.id || i}
              href={cat.url || `/blog/category/${cat.slug || i}`}
              className="shrink-0 w-52 rounded-2xl overflow-hidden border border-slate-100 bg-white shadow-sm hover:shadow-md transition-shadow group"
            >
              {cat.imageUrl ? (
                <div className="relative h-32 overflow-hidden">
                  <Image
                    src={cat.imageUrl}
                    alt={cat.name || ''}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <span className="absolute bottom-3 left-3 right-3 text-white font-bold text-sm leading-tight">
                    {cat.name}
                  </span>
                </div>
              ) : (
                <div className="h-24 bg-gradient-to-br from-[#0f7c85]/10 to-teal-50 flex items-end p-3">
                  <span className="font-bold text-[#0f7c85] text-sm">{cat.name}</span>
                </div>
              )}
              {cat.postCount !== undefined && (
                <div className="px-3 py-2 text-xs text-slate-400 font-medium">
                  {cat.postCount} article{cat.postCount !== 1 ? 's' : ''}
                </div>
              )}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
