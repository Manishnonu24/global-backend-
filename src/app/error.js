"use client";

import { useEffect } from "react";

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error("Global app error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center space-y-4">
      <h2 className="text-2xl font-bold text-slate-800">Something went wrong</h2>
      <p className="text-slate-600 max-w-md">{error.message}</p>
      <button
        onClick={() => reset()}
        className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition"
      >
        Try again
      </button>
    </div>
  );
}