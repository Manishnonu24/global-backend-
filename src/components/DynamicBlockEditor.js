"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// Dynamically import the TipTap-based BlockEditor with SSR disabled to prevent hydration mismatches
const Editor = dynamic(() => import("./BlockEditor"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center p-12 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-900/50">
      <Loader2 className="animate-spin text-indigo-500" size={24} />
      <span className="ml-3 text-xs font-medium text-slate-500">Loading TipTap editor...</span>
    </div>
  ),
});

export default function DynamicBlockEditor(props) {
  return <Editor {...props} />;
}
