import { useEffect, useRef } from 'react';
import { animate, createScope, onScroll, stagger } from 'animejs';

export function usePageMotion(dependency: string) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!root.current || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    const scope = createScope({ root }).add(() => {
      animate('[data-hero]', {
        opacity: [0, 1],
        y: [28, 0],
        delay: stagger(100),
        duration: 900,
        ease: 'out(4)',
      });
      const pipeline = root.current?.querySelector('[data-pipeline]');
      if (pipeline) {
        animate('[data-hub]', {
          scale: [0.75, 1],
          rotate: [-18, 0],
          ease: 'linear',
          autoplay: onScroll({ target: pipeline, sync: 0.5 }),
        });
        animate('[data-trace]', {
          scaleX: [0.12, 1],
          opacity: [0.25, 1],
          ease: 'linear',
          autoplay: onScroll({ target: pipeline, sync: 0.5 }),
        });
      }
    });
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            scope.add(() => {
              animate(entry.target, { opacity: [0, 1], y: [30, 0], duration: 700, ease: 'out(3)' });
            });
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12 },
    );
    for (const element of root.current.querySelectorAll('[data-reveal]')) {
      observer.observe(element);
    }
    return () => {
      observer.disconnect();
      scope.revert();
    };
  }, [dependency]);
  return root;
}
