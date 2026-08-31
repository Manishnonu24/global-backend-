import { useState } from "react";
import { Image as ImageIcon } from "lucide-react";
import MediaPickerModal from "@/components/media/MediaPickerModal";

export default function ImageUploadField({ 
  label, 
  value, 
  onChange, 
  siteId, 
  placeholder = "https://..." 
}) {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <div>
      {label && (
        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
          {label}
        </label>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 min-w-0 rounded-lg border border-gray-200 p-2.5 text-xs font-mono outline-none focus:border-indigo-600"
          placeholder={placeholder}
        />

        <button
          type="button"
          onClick={() => setShowPicker(true)}
          className="px-3.5 py-2 border border-gray-200 hover:border-gray-300 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50 transition flex items-center gap-1.5 shrink-0 bg-gray-100 cursor-pointer"
        >
          <ImageIcon size={14} className="text-gray-500" />
          Library
        </button>
      </div>

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
