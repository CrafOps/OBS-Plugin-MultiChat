import { createContext, useContext } from 'react';
import type { Language } from '../data/project';
import type { useProjectInfo } from './hooks/useProjectInfo';

export const LanguageContext = createContext<Language>('en');
export const ProjectContext = createContext<ReturnType<typeof useProjectInfo>>({ checked: 0 });

export function useLanguage() {
  return useContext(LanguageContext);
}
