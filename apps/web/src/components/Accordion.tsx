"use client";

import { useState, type ReactNode } from "react";

export default function Accordion({
  title,
  children,
  open = true,
}: {
  title: ReactNode;
  children: ReactNode;
  open?: boolean;
}) {
  const [expanded, setExpanded] = useState(open);
  return (
    <div className="panel accordion">
      <div className="accordion-bar">
        <div className="accordion-head">{title}</div>
        <button type="button" className="accordion-toggle" onClick={() => setExpanded((v) => !v)}>
          {expanded ? "Hide" : "Show"}
        </button>
      </div>
      {expanded ? <div className="accordion-body">{children}</div> : null}
    </div>
  );
}
