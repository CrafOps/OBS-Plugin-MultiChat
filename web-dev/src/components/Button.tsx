import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export function Button({
  children,
  href,
  secondary = false,
  className = '',
}: {
  children: ReactNode;
  href: string;
  secondary?: boolean;
  className?: string;
}) {
  const classes = `inline-flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-xl px-5 py-3 text-center text-sm leading-6 font-semibold [&>svg]:shrink-0 transition duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-lilac ${secondary ? 'border border-white/15 bg-white/5 text-white hover:bg-white/10' : 'bg-[#bca5ff] text-[#170d2e] shadow-[0_0_30px_#a678ff25] hover:bg-[#d2bfff]'} ${className}`;
  return href.startsWith('/') && !href.startsWith('//') ? (
    <Link className={classes} to={href}>
      {children}
    </Link>
  ) : (
    <a
      className={classes}
      href={href}
      target={href.startsWith('https:') ? '_blank' : undefined}
      rel="noreferrer"
    >
      {children}
    </a>
  );
}
