import { GitFork } from 'lucide-react';
import { repository } from '../data/project';
import Brand from './Brand';
import { useLanguage } from '../utils/context';

export default function Footer() {
  const th = useLanguage() === 'th';
  return (
    <footer className="border-t border-white/8 px-6 py-8">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-6">
        <div>
          <Brand />
          <p className="mt-3 text-[10px] text-white/35">
            Multi Live Chat by @CrafOps · GPL-3.0-or-later
          </p>
        </div>
        <div className="flex flex-wrap gap-5 text-xs text-white/45">
          <a href={`${repository}/blob/master/LICENSE`} target="_blank" rel="noreferrer">
            {th ? 'สัญญาอนุญาต' : 'License'}
          </a>
          <a href={`${repository}/blob/master/NOTICE`} target="_blank" rel="noreferrer">
            {th ? 'เครดิต' : 'Credits'}
          </a>
          <a href={`${repository}/issues`} target="_blank" rel="noreferrer">
            {th ? 'แจ้งปัญหา' : 'Report an issue'}
          </a>
          <a href={repository} target="_blank" rel="noreferrer" aria-label="GitHub repository">
            <GitFork size={17} />
          </a>
        </div>
      </div>
    </footer>
  );
}
