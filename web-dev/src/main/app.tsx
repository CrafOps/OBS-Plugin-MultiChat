import { lazy, Suspense, useEffect, useState } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { Language } from '../data/project';
import { useProjectInfo } from '../utils/hooks/useProjectInfo';
import { LanguageContext, ProjectContext } from '../utils/context';
import { Button } from '../components/Button';
import Header from '../components/Header';
import Footer from '../components/Footer';

const Home = lazy(() => import('./pages/Home'));
const Docs = lazy(() => import('./pages/Docs'));
const Viewer = lazy(() => import('./pages/Viewer'));
const Overlay = lazy(() => import('./pages/Overlay'));
const Releases = lazy(() => import('./pages/Releases'));

export default function App() {
  const info = useProjectInfo();
  const [language, setLanguage] = useState<Language>(() => {
    try {
      return localStorage.getItem('multichat.language') === 'th' ? 'th' : 'en';
    } catch {
      return 'en';
    }
  });
  const location = useLocation();
  useEffect(() => {
    document.documentElement.lang = language;
    try {
      localStorage.setItem('multichat.language', language);
    } catch {
      // Language switching does not require storage permission.
    }
  }, [language]);
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = `${location.pathname.startsWith('/docs') ? 'Documentation' : location.pathname === '/viewer' ? 'Chat viewer' : 'YouTube and TikTok chat in OBS'} - Multi Live Chat`;
  }, [location.pathname]);
  return (
    <LanguageContext.Provider value={language}>
      <ProjectContext.Provider value={info}>
        <a
          href="#main"
          className="sr-only z-50 rounded-lg bg-lilac px-4 py-2 text-black focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Skip to content
        </a>
        {location.pathname !== '/overlay' && (
          <Header language={language} setLanguage={setLanguage} />
        )}
        <main id="main">
          <Suspense
            fallback={
              <div className="px-6 py-24 text-center text-white/45" role="status">
                Loading…
              </div>
            }
          >
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/docs" element={<Docs />} />
              <Route path="/docs/:slug" element={<Docs />} />
              <Route path="/viewer" element={<Viewer />} />
              <Route path="/overlay" element={<Overlay />} />
              <Route path="/releases" element={<Releases />} />
              <Route
                path="*"
                element={
                  <div className="mx-auto max-w-3xl px-6 py-32">
                    <h1 className="mb-6 text-4xl">Page not found</h1>
                    <Button href="/">
                      Return home <ArrowRight size={16} />
                    </Button>
                  </div>
                }
              />
            </Routes>
          </Suspense>
        </main>
        {location.pathname !== '/overlay' && <Footer />}
      </ProjectContext.Provider>
    </LanguageContext.Provider>
  );
}
