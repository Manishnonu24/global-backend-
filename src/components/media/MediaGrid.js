"use client";
import Image from "next/image";

function getThumbnailUrl(url) {
  if (!url) return url;
  if (url.includes("res.cloudinary.com")) {
    return url.replace("/upload/", "/upload/c_fill,w_300,h_300,g_auto,q_auto,f_auto/");
  }
  if (url.startsWith("/") || url.startsWith("http://") || url.startsWith("https://")) {
    return url; // Direct S3/HTTPS URL or local path, no need to proxy
  }
  return `/api/media/proxy?url=${encodeURIComponent(url)}`;
}

export default function MediaGrid({ media, onDelete, onCopyUrl, onSelectMedia }) {
  if (!media.length) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed bg-white">
        <p className="text-sm text-gray-500">No media uploaded yet</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7">
      {media.map((item) => {
        const isImage = item.mimeType?.startsWith("image/");

        return (
          <div
            key={item.id}
            className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md flex flex-col justify-between"
          >
            <div 
              onClick={() => onSelectMedia && onSelectMedia(item.id)}
              className="relative aspect-square overflow-hidden bg-slate-50 cursor-pointer"
            >
              {isImage ? (
                <Image
                  src={getThumbnailUrl(item.url)}
                  alt={item.altText || item.fileName}
                  fill
                  sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 15vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <div className="rounded-md bg-slate-200 px-2 py-1 text-[11px] font-bold text-slate-700">
                    {item.extension?.toUpperCase() || "FILE"}
                  </div>
                </div>
              )}
            </div>

            <div className="p-2 flex-1 flex flex-col justify-between">
              <div>
                <p
                  onClick={() => onSelectMedia && onSelectMedia(item.id)}
                  className="truncate text-[11px] leading-tight font-semibold text-slate-800 cursor-pointer hover:text-blue-600"
                  title={item.fileName}
                >
                  {item.fileName}
                </p>

                <p className="mt-0.5 text-[9px] leading-tight text-slate-500 truncate">
                  {item.altText ? `Alt: "${item.altText}"` : (item.mimeType || "Unknown Type")}
                </p>
              </div>

              <div className="mt-1 flex items-center justify-between">
                {item.size && (
                  <div className="text-[9px] font-medium text-slate-400">
                    {(item.size / 1024).toFixed(1)} KB
                  </div>
                )}
                {item.width && item.height && (
                  <div className="text-[9px] text-slate-400">
                    {item.width}×{item.height}
                  </div>
                )}
              </div>

              <div className="flex gap-1 pt-1.5 border-t border-slate-100 mt-1.5">
                <button
                  onClick={() => onCopyUrl(item)}
                  className="flex-1 rounded border border-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Copy URL
                </button>

                <button
                  onClick={() => onDelete(item.id)}
                  className="rounded border border-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-600 transition hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
