export function Icon({
  name,
  size = 18,
}: {
  name: "dashboard" | "team" | "time" | "interviews" | "profile" | "admin" | "logout";
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };
  switch (name) {
    case "dashboard":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="9" rx="1.5" />
          <rect x="14" y="3" width="7" height="5" rx="1.5" />
          <rect x="14" y="12" width="7" height="9" rx="1.5" />
          <rect x="3" y="16" width="7" height="5" rx="1.5" />
        </svg>
      );
    case "team":
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3" />
          <circle cx="17" cy="9" r="2.5" />
          <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
          <path d="M14 19a4.5 4.5 0 0 1 6.5-4" />
        </svg>
      );
    case "time":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5V12l3 2" />
        </svg>
      );
    case "interviews":
      return (
        <svg {...common}>
          <path d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v7A2.5 2.5 0 0 1 16.5 16H11l-4 3.5V16H7.5A2.5 2.5 0 0 1 5 13.5z" />
        </svg>
      );
    case "profile":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.25" />
          <path d="M5 19.5a7 7 0 0 1 14 0" />
        </svg>
      );
    case "admin":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 3.5v2.2M12 18.3v2.2M4.9 6.5l1.9 1.1M17.2 16.4l1.9 1.1M3.5 12h2.2M18.3 12h2.2M4.9 17.5l1.9-1.1M17.2 7.6l1.9-1.1" />
        </svg>
      );
    case "logout":
      return (
        <svg {...common}>
          <path d="M10 5H7.5A2.5 2.5 0 0 0 5 7.5v9A2.5 2.5 0 0 0 7.5 19H10" />
          <path d="M10 12h9" />
          <path d="M16 8.5 19.5 12 16 15.5" />
        </svg>
      );
  }
}

export function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg className="spinner" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="42 24" />
    </svg>
  );
}
