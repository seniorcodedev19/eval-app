import Link from "next/link";
import ErrorState from "@/components/ErrorState";

export const metadata = { title: "Page not found · Team Huddle" };

export default function NotFound() {
  return (
    <ErrorState
      code="404"
      title="We can't find that page"
      message="The link may be out of date, or the page may have been moved or renamed."
    >
      <Link className="btn" href="/dashboard">
        Go to dashboard
      </Link>
      <Link className="btn secondary" href="/">
        Back to start
      </Link>
    </ErrorState>
  );
}
