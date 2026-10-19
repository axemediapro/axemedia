"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App Error:", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center shadow-xl">
        <div className="w-14 h-14 mx-auto mb-4 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          Ndodhi një gabim
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          Ju lutemi rifreskoni faqen ose provoni përsëri.
        </p>
        <button
          onClick={() => reset()}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition shadow-md shadow-indigo-600/20 cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          Rifresko Faqen
        </button>
      </div>
    </div>
  );
}
