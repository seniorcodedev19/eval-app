import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import ColumnChart from "@/components/ColumnChart";

const sample = [
  { label: "Sun", value: 0 },
  { label: "Mon", value: 14 },
  { label: "Tue", value: 21 },
  { label: "Wed", value: 11 },
  { label: "Thu", value: 24, highlight: true },
  { label: "Fri", value: 18 },
  { label: "Sat", value: 0 },
];

export default async function Landing() {
  if ((await auth())?.user) redirect("/dashboard");

  return (
    <>
      <header className="row" style={{ justifyContent: "flex-end", alignItems: "center" }}>
        <Link className="btn secondary" href="/login">
          Sign in
        </Link>
        <Link className="btn" href="/signup">
          Sign up
        </Link>
      </header>

      <section className="hero">
        <p className="eyebrow">Weekly team reviews</p>
        <h1 className="display">
          Log the day.
          <br />
          Review the week.
        </h1>
        <p className="lead">
          Everyone enters a few numbers each day. Totals build up on their own, and at the weekend your manager reviews and approves the week.
        </p>
        <div className="row">
          <Link className="btn big" href="/signup">
            Create an account
          </Link>
          <Link className="btn secondary" href="/login">
            Sign in
          </Link>
        </div>
      </section>

      <section className="panel" aria-label="Example week">
        <div className="head" style={{ marginBottom: 8 }}>
          <div>
            <strong>Example week</strong>
            <div className="muted">Points earned each day</div>
          </div>
          <div className="score">
            <span className="num" style={{ fontSize: 36 }}>
              88
            </span>
            <span className="unit">points so far</span>
          </div>
        </div>
        <ColumnChart items={sample} unit="" label="Example of points earned per day" />
      </section>

      <section className="steps">
        <div>
          <div className="n">1</div>
          <h3>Log time and weekly results</h3>
          <p>Hours come from Time tracking. Other metrics are one total for the week.</p>
        </div>
        <div>
          <div className="n">2</div>
          <h3>Submit at the weekend</h3>
          <p>Your total is already worked out. Add a note and send the week for review.</p>
        </div>
        <div>
          <div className="n">3</div>
          <h3>Your manager approves</h3>
          <p>They approve it or send it back with a comment, and the final score is locked in.</p>
        </div>
      </section>
    </>
  );
}
