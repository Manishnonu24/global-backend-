"use client";

import { useState } from "react";
import MediaPickerModal from "@/components/media/MediaPickerModal";
import Image from "next/image";
import { Image as ImageIcon } from "lucide-react";

export default function ImageField({ label, value, onChange, siteId, error }) {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <div className="flex flex-col gap-1.5 relative">
      <label className="dash-caption font-bold uppercase tracking-wider">
        {label}
      </label>

      <div className="flex items-center gap-3">
        {value && (
          <div className="w-16 h-16 shrink-0 relative rounded-[var(--radius-input)] border border-[var(--color-border)] dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-800">
            <Image
              src={value}
              alt={label || "Image preview"}
              fill
              className="object-cover"
            />
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowPicker(true)}
          className="flex items-center gap-2 px-3.5 py-2 border border-[var(--color-border)] dark:border-slate-700 hover:border-[var(--color-accent)] bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-[var(--radius-input)] text-xs font-semibold transition-colors cursor-pointer"
        >
          <ImageIcon size={14} className="text-[var(--color-muted)]" />
          {value ? "Choose from Library" : "Select Image from Library"}
        </button>
      </div>

      {error && <p className="text-[10px] text-red-500 font-medium">{error}</p>}

      {showPicker && (
        <MediaPickerModal
          siteId={siteId}
          filter="images"
          onSelect={(media) => {
            onChange(media.secureUrl || media.url);
            setShowPicker(false);
          }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}
