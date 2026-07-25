"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Mounts its children only once they scroll near the viewport (§3D JS budget).
 * Below-the-fold, interaction-only islands (sticky player, related rail, audio
 * mode, subscribe overlay) are wrapped in this so their JS — and heavy deps like
 * the Motion library — never load on the initial paint, keeping /watch under the
 * 170KB script budget. A `minHeight` placeholder reserves space to avoid CLS.
 */
export function LazyInView({
  children,
  minHeight,
  rootMargin = "400px",
  className,
}: {
  children: ReactNode;
  minHeight?: number;
  rootMargin?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || show) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShow(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin, show]);

  return (
    <div ref={ref} className={className} style={!show && minHeight ? { minHeight } : undefined}>
      {show ? children : null}
    </div>
  );
}
