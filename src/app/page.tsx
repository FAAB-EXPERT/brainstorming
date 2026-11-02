'use client';

import React, { Suspense, useEffect } from 'react';
import { App } from '../App';

export default function NextHomePage() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch(() => {
          // Mode local ou aperçu sans SW
        });
    }
  }, []);

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
          <div className="flex items-center gap-3 text-xs sm:text-sm font-extrabold uppercase tracking-widest text-[#86efac]">
            <div className="w-4 h-4 border-2 border-[#86efac] border-t-transparent rounded-full animate-spin" />
            <span>Initialisation fluide FAAB BRAINSTORMING (Next.js App Router)...</span>
          </div>
        </div>
      }
    >
      <App />
    </Suspense>
  );
}
