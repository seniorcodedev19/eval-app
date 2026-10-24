"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Spinner } from "./Icons";

type BusyApi = {
  startNav: () => void;
  startAction: () => void;
  stopAction: () => void;
  busy: boolean;
};

const BusyCtx = createContext<BusyApi>({
  startNav: () => {},
  startAction: () => {},
  stopAction: () => {},
  busy: false,
});

export function useBusy() {
  return useContext(BusyCtx);
}

export default function BusyShell({ children }: { children: ReactNode }) {
  const [nav, setNav] = useState(false);
  const [actions, setActions] = useState(0);
  const last = useRef<HTMLElement | null>(null);
  const marked = useRef<HTMLElement | null>(null);
  const busy = nav || actions > 0;
  const pathname = usePathname();
  const search = useSearchParams();
  const key = `${pathname}?${search.toString()}`;
  const prev = useRef(key);

  const mark = (el: HTMLElement | null) => {
    if (marked.current && marked.current !== el) marked.current.classList.remove("is-busy");
    marked.current = el;
    el?.classList.add("is-busy");
  };

  const startNav = useCallback(() => {
    mark(last.current);
    setNav(true);
  }, []);
  const startAction = useCallback(() => {
    mark(last.current);
    setActions((n) => n + 1);
  }, []);
  const stopAction = useCallback(() => setActions((n) => Math.max(0, n - 1)), []);

  useEffect(() => {
    if (prev.current === key) return;
    prev.current = key;
    setNav(false);
  }, [key]);

  useEffect(() => {
    if (!busy && marked.current) {
      marked.current.classList.remove("is-busy");
      marked.current = null;
    }
  }, [busy]);

  useEffect(() => {
    const remember = (e: Event) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      last.current = t.closest("button, a, select") as HTMLElement | null;
    };
    const onClick = (e: MouseEvent) => {
      remember(e);
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      const a = (e.target as HTMLElement).closest("a");
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#") || a.getAttribute("aria-disabled") === "true") return;
      if (a.target && a.target !== "_self") return;
      try {
        const url = new URL(href, window.location.href);
        if (url.origin !== window.location.origin) return;
        if (url.pathname + url.search === window.location.pathname + window.location.search) return;
        last.current = a;
        startNav();
      } catch {
        /* ignore */
      }
    };
    const onSubmit = () => startNav();
    document.addEventListener("click", onClick, true);
    document.addEventListener("change", remember, true);
    document.addEventListener("submit", onSubmit, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("change", remember, true);
      document.removeEventListener("submit", onSubmit, true);
    };
  }, [startNav]);

  useEffect(() => {
    if (!nav) return;
    const t = window.setTimeout(() => setNav(false), 8000);
    return () => window.clearTimeout(t);
  }, [nav]);

  return (
    <BusyCtx.Provider value={{ startNav, startAction, stopAction, busy }}>
      {children}
      {busy ? (
        <>
          <div className="route-bar" role="progressbar" aria-busy="true" aria-label="Loading" />
          <div className="busy-overlay">
            <Spinner size={28} />
          </div>
        </>
      ) : null}
    </BusyCtx.Provider>
  );
}
