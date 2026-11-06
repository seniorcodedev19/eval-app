import TrainingMatrix from "@/components/TrainingMatrix";
import { tryFetch } from "@/lib/api";
import type { TrainingMatrix as Matrix } from "@/lib/types";

export default async function AiTrainingPage() {
  const m = await tryFetch<Matrix>("/training-matrix");
  if (!m.ok) return <div className="banner error">{m.error}</div>;

  return (
    <>
      <div className="head">
        <div>
          <h1>AI Training</h1>
          <p className="sub" style={{ margin: 0 }}>
            Account status for each profile, by training site.
          </p>
        </div>
      </div>

      <TrainingMatrix matrix={m.data} />
    </>
  );
}
