import { useContext, useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ExternalLink, Menu, Star, X } from 'lucide-react';
import { repository, type Language } from '../data/project';
import { ProjectContext } from '../utils/context';
import Brand from './Brand';

export default function Header({
  language,
  setLanguage,
}: {
  language: Language;
  setLanguage: (value: Language) => void;
}) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const info = useContext(ProjectContext);
  useEffect(() => setOpen(false), [location.pathname]);
  const navigation = (
    <>
      <NavLink
        to="/"
        end
        className={({ isActive }) => (isActive ? 'text-white' : 'text-white/55 hover:text-white')}
      >
        {language === 'en' ? 'Overview' : 'ภาพรวม'}
      </NavLink>
      <NavLink
        to="/docs/installation"
        className={({ isActive }) => (isActive ? 'text-white' : 'text-white/55 hover:text-white')}
      >
        {language === 'th' ? 'คู่มือ' : 'Docs'}
      </NavLink>
      <NavLink
        to="/viewer"
        className={({ isActive }) => (isActive ? 'text-white' : 'text-white/55 hover:text-white')}
      >
        {language === 'en' ? 'Viewer demo' : 'ทดลอง Viewer'}
      </NavLink>
      <Link to="/releases" className="text-white/55 hover:text-white">
        {language === 'th' ? 'ดาวน์โหลด / รุ่นล่าสุด' : 'Downloads / releases'}
      </Link>
    </>
  );
  return (
    <header className="sticky top-0 z-40 border-b border-white/8 bg-void/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl sm:h-20 items-center justify-between gap-3 px-4 sm:gap-5 sm:px-6 lg:px-8">
        <Brand />
        <nav
          aria-label="Main navigation"
          className="hidden items-center gap-7 text-xs font-medium lg:flex"
        >
          {navigation}
        </nav>
        <div className="flex items-center gap-3">
          <button
            className="rounded-lg border border-white/10 min-h-11 min-w-11 px-2.5 py-2 text-xs text-white/70 hover:bg-white/10"
            onClick={() => setLanguage(language === 'en' ? 'th' : 'en')}
            aria-label="Switch language"
          >
            {language === 'en' ? 'TH' : 'EN'}
          </button>
          <a
            href={repository}
            target="_blank"
            rel="noreferrer"
            className="hidden items-center gap-2 rounded-lg border border-white/15 bg-white/4 px-3 py-2 text-xs sm:flex"
          >
            <Star size={13} /> Star{' '}
            <span className="border-l border-white/15 pl-2 text-lilac">{info.stars ?? '-'}</span>
          </a>
          <button
            className="grid min-h-11 min-w-11 place-items-center rounded-lg p-2 lg:hidden"
            aria-label="Toggle navigation"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
      {open && (
        <nav
          aria-label="Mobile navigation"
          className="flex flex-col gap-5 border-t border-white/10 px-6 py-6 text-sm lg:hidden"
        >
          {navigation}
        </nav>
      )}
    </header>
  );
}
