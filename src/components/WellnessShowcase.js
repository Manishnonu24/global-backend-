import Image from 'next/image';
import Link from 'next/link';

/**
 * WellnessShowcase
 * A CMS section that highlights wellness features/services in a grid layout.
 * Used by PageRenderer.js.
 */
export default function WellnessShowcase({ section = {} }) {
  const {
    heading  = 'Wellness Solutions',
    items    = [],
  } = section;

  return (
    <section className="py-16 px-4">
      <div className="max-w-6xl mx-auto">
        {heading && (
          <h2 className="text-2xl font-extrabold text-[#1e2a35] text-center mb-10">{heading}</h2>
        )}

        {items.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item, i) => (
              <div
                key={item.id || i}
                className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow group"
              >
                {item.imageUrl && (
                  <div className="relative aspect-video overflow-hidden">
                    <Image
                      src={item.imageUrl}
                      alt={item.title || ''}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                )}
                <div className="p-5">
                  {item.title && (
                    <h3 className="font-bold text-[#1e2a35] text-base mb-1.5">{item.title}</h3>
                  )}
                  {item.description && (
                    <p className="text-sm text-slate-500 leading-relaxed">{item.description}</p>
                  )}
                  {item.linkUrl && (
                    <Link
                      href={item.linkUrl}
                      className="inline-block mt-3 text-xs font-bold text-[#0f7c85] hover:text-[#0c6b73] transition-colors"
                    >
                      {item.linkText || 'Learn more'} →
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-slate-400 text-sm">No wellness items configured.</p>
        )}
      </div>
    </section>
  );
}
