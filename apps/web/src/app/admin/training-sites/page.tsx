import TrainingSitesManager from "@/components/TrainingSitesManager";
import { tryFetch } from "@/lib/api";
import type { TrainingSite } from "@/lib/types";

export default async function TrainingSitesPage() {
  // all=1 so hidden sites stay editable here.
  const s = await tryFetch<TrainingSite[]>("/training-sites?all=1");
  if (!s.ok) return <div className="banner error">{s.error}</div>;

  return (
    <>
      <div className="head">
        <div>
          <h1>Training sites</h1>
          <p className="sub" style={{ margin: 0 }}>
            The AI training sites profiles can hold accounts on.
          </p>
        </div>
      </div>

      <TrainingSitesManager sites={s.data} />
    </>
  );
}
