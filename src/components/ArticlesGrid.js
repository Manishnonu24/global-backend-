import Link from 'next/link';
import Image from 'next/image';

/**
 * ArticlesGrid
 * A CMS section that renders a grid of article/blog post cards.
 * Used by PageRenderer.js.
 */
export default function ArticlesGrid({ section = {} }) {
  const {
    heading  = 'Latest Articles',
    articles = [],
    columns  = 3,
  } = section;

  const colClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  }[columns] || 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';

  return (
    <section className="py-16 px-4">
      <div className="max-w-6xl mx-auto">
        {heading && (
          <h2 className="text-2xl font-extrabold text-[#1e2a35] mb-8">{heading}</h2>
        )}

        {articles.length > 0 ? (
          <div className={`grid ${colClass} gap-6`}>
            {articles.map((article, i) => (
              <Link
                key={article.id || i}
                href={article.url || `/blog/${article.slug || i}`}
                className="group bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                {article.thumbnailUrl && (
                  <div className="relative aspect-video overflow-hidden">
                    <Image
                      src={article.thumbnailUrl}
                      alt={article.title || ''}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                )}
                <div className="p-5">
                  {article.category && (
                    <span className="text-[10px] font-bold text-[#0f7c85] uppercase tracking-wider">
                      {article.category}
                    </span>
                  )}
                  {article.title && (
                    <h3 className="font-bold text-[#1e2a35] text-sm mt-1 mb-2 leading-snug line-clamp-2">
                      {article.title}
                    </h3>
                  )}
                  {article.excerpt && (
                    <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">
                      {article.excerpt}
                    </p>
                  )}
                  {article.publishedAt && (
                    <p className="text-[10px] text-slate-400 mt-3">
                      {new Date(article.publishedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-center text-slate-400 text-sm">No articles to display.</p>
        )}
      </div>
    </section>
  );
}
