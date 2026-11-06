"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export type DropdownOption<T extends string | number> = {
  value: T;
  /** The row's main text. */
  label: string;
  /** Second line, e.g. an email. */
  hint?: string;
  /** Leading visual: an avatar, a site logo, a status dot. */
  media?: ReactNode;
  disabled?: boolean;
};

/* A select-shaped dropdown that matches the sidebar account menu: the trigger
   looks like a field, the sheet is a floating panel of rows. Replaces native
   <select> where the options need an avatar or a colour next to them, which a
   native option element can't hold.

   Keyboard behaviour follows the native control: Up/Down move a highlight,
   Enter or Space picks, Escape closes and returns focus to the trigger. */
export default function Dropdown<T extends string | number>({
  value,
  options,
  onChange,
  placeholder = "Select…",
  ariaLabel,
  id,
  disabled,
  tone,
  className,
}: {
  value: T | "" | null | undefined;
  options: DropdownOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  ariaLabel?: string;
  id?: string;
  disabled?: boolean;
  /** Adds a status-* class to the trigger, matching the chip tones. */
  tone?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  // The sheet is portalled to <body>, so it needs viewport coordinates.
  const [pos, setPos] = useState<{ left: number; top: number; width: number } | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const [flipped, setFlipped] = useState(false);
  const listId = useId();

  const selected = options.find((o) => o.value === value) ?? null;

  // Close on an outside click or Escape; hand focus back to the trigger.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      // The sheet lives in a portal, so it isn't inside `wrap`.
      if (!wrap.current?.contains(t) && !sheet.current?.contains(t)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  /* Measure where the sheet should sit. It renders in a portal at <body> so
     that a scrolling table or a panel with overflow can't clip it, which
     means it needs explicit viewport coordinates. Flips above the trigger
     when there isn't room below. */
  const place = useCallback(() => {
    const r = trigger.current?.getBoundingClientRect();
    if (!r) return;
    const SHEET_MAX = 272;
    const below = window.innerHeight - r.bottom;
    const flip = below < Math.min(SHEET_MAX, 180) && r.top > below;
    setPos({
      left: r.left,
      top: flip ? r.top - 5 : r.bottom + 5,
      width: r.width,
    });
    setFlipped(flip);
  }, []);

  // Once open, scroll the highlighted row into view, and keep the sheet with
  // its trigger if anything scrolls or the window resizes.
  useEffect(() => {
    if (!open) return;
    sheet.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
    const onMove = () => place();
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [open, place]);

  // Opening always starts from the current choice.
  const show = () => {
    setActive(options.findIndex((o) => o.value === value));
    place();
    setOpen(true);
  };
  const toggle = () => (open ? setOpen(false) : show());

  const pick = (o: DropdownOption<T>) => {
    if (o.disabled) return;
    onChange(o.value);
    setOpen(false);
    trigger.current?.focus();
  };

  const step = (dir: 1 | -1) => {
    const usable = options.filter((o) => !o.disabled);
    if (usable.length === 0) return;
    let i = active;
    for (let n = 0; n < options.length; n++) {
      i = (i + dir + options.length) % options.length;
      if (!options[i].disabled) break;
    }
    setActive(i);
    // Follow the highlight when the list is taller than the sheet.
    requestAnimationFrame(() =>
      sheet.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: "nearest" }),
    );
  };

  const onTriggerKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) show();
      else step(e.key === "ArrowDown" ? 1 : -1);
      return;
    }
    if (!open) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (active >= 0 && options[active]) pick(options[active]);
    }
    if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      setActive(e.key === "Home" ? 0 : options.length - 1);
    }
  };

  return (
    <div className={`dd${className ? ` ${className}` : ""}`} ref={wrap}>
      <button
        type="button"
        id={id}
        ref={trigger}
        className={`dd-trigger${tone ? ` status-${tone}` : ""}${open ? " open" : ""}`}
        onClick={toggle}
        onKeyDown={onTriggerKey}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={ariaLabel}
      >
        {selected?.media ? <span className="dd-media">{selected.media}</span> : null}
        <span className={`dd-value${selected ? "" : " placeholder"}`}>
          {selected ? selected.label : placeholder}
        </span>
        <span className="dd-caret" aria-hidden="true">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 9.5 6 6 6-6" />
          </svg>
        </span>
      </button>

      {open && pos
        ? createPortal(
        <div
          className={`dd-sheet${flipped ? " flipped" : ""}`}
          role="listbox"
          id={listId}
          aria-label={ariaLabel}
          ref={sheet}
          style={{ left: pos.left, top: pos.top, minWidth: pos.width }}
        >
          {options.length === 0 ? (
            <p className="dd-empty">Nothing to choose from</p>
          ) : (
            options.map((o, i) => (
              <button
                key={String(o.value)}
                type="button"
                role="option"
                aria-selected={o.value === value}
                data-active={i === active ? "true" : undefined}
                className={`dd-option${i === active ? " active" : ""}${o.value === value ? " on" : ""}`}
                disabled={o.disabled}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(o)}
              >
                {o.media ? <span className="dd-media">{o.media}</span> : null}
                <span className="dd-option-text">
                  <span className="dd-option-label">{o.label}</span>
                  {o.hint ? <span className="dd-option-hint">{o.hint}</span> : null}
                </span>
                {o.value === value ? (
                  <svg className="dd-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="m5 12.5 5 5 9-11" />
                  </svg>
                ) : null}
              </button>
            ))
          )}
        </div>,
            document.body,
          )
        : null}
    </div>
  );
}
