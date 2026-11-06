"use client";

import Link from "next/link";
import { useEffect } from "react";
import ErrorState from "@/components/ErrorState";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorState
      code="500"
      title="Something went wrong"
      message="That page didn't load. This is usually temporary, so trying again often works."
    >
      <button className="btn" type="button" onClick={reset}>
        Try again
      </button>
      <Link className="btn secondary" href="/dashboard">
        Go to dashboard
      </Link>
      {error.digest ? <p className="errorpage-digest">Reference: {error.digest}</p> : null}
    </ErrorState>
  );
}
