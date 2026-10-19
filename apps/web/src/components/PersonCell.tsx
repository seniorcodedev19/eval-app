import Link from "next/link";
import Avatar from "./Avatar";

export default function PersonCell({
  name,
  email,
  avatar,
  href,
  size = 32,
  sub,
}: {
  name: string;
  email: string;
  avatar?: string | null;
  href?: string;
  size?: number;
  sub?: string;
}) {
  const body = (
    <span className="person">
      <Avatar name={name} email={email} src={avatar} size={size} />
      <span className="person-text">
        <span className="person-name">{name || email}</span>
        {sub ? <span className="muted person-sub">{sub}</span> : null}
      </span>
    </span>
  );
  if (!href) return body;
  return (
    <Link href={href} className="person-link">
      {body}
    </Link>
  );
}
