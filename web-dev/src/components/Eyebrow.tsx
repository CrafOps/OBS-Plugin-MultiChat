import type { ReactNode } from 'react';

export default function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="mb-5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.22em] text-lilac">
      <span className="h-px w-6 bg-lilac/50" />
      {children}
    </p>
  );
}
