const PALETTE = ["#0b7a6b", "#2f6f9f", "#c27c0e", "#7a5aa6", "#b4492d", "#4d7c0f", "#1d4e89", "#9a3d6a"];

function hueIndex(seed: string) {
  let n = 0;
  for (let i = 0; i < seed.length; i++) n = (n + seed.charCodeAt(i) * (i + 1)) % PALETTE.length;
  return n;
}

export function initialOf(name: string, email: string) {
  const s = (name || email || "?").trim();
  const ch = [...s][0] ?? "?";
  return ch.toUpperCase();
}

export default function Avatar({
  name,
  email,
  src,
  size = 36,
}: {
  name: string;
  email: string;
  src?: string | null;
  size?: number;
}) {
  const label = name || email;
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img className="avatar" src={src} alt="" width={size} height={size} title={label} />
    );
  }
  const letter = initialOf(name, email);
  const bg = PALETTE[hueIndex(email || name)];
  return (
    <span
      className="avatar letter"
      title={label}
      style={{ width: size, height: size, background: bg, fontSize: Math.round(size * 0.42) }}
      aria-hidden="true"
    >
      {letter}
    </span>
  );
}
