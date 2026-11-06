"use client";

import { useState, type ReactNode } from "react";

export default function Accordion({
  title,
  children,
  open = true,
  actions,
}: {
  title: ReactNode;
  children: ReactNode;
  open?: boolean;
  actions?: ReactNode;
}) {
  const [expanded, setExpanded] = useState(open);
  return (
    <div className="panel accordion">
      <div className="accordion-bar">
        <div className="accordion-head">{title}</div>
        {actions}
        <button
          type="button"
          className="accordion-toggle"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          // The chevron carries no text, so name the control for screen readers.
          aria-label={expanded ? "Collapse section" : "Expand section"}
          title={expanded ? "Collapse" : "Expand"}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m6 9.5 6 6 6-6" />
          </svg>
        </button>
      </div>
      {expanded ? <div className="accordion-body">{children}</div> : null}
    </div>
  );
}
