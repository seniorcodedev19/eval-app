import type { Status } from "@/lib/types";

const label: Record<Status, string> = {
  draft: "In progress",
  submitted: "Waiting for review",
  approved: "Approved",
  returned: "Returned",
};

export default function StatusPill({ status }: { status: Status }) {
  return <span className={`pill status-${status}`}>{label[status]}</span>;
}
