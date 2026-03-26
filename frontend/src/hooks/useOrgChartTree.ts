import { useEffect, useState } from "react";
import { fetchOrgChartTree, OrgUnit } from "../services/cms";

export function useOrgChartTree() {
  const [tree, setTree] = useState<OrgUnit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchOrgChartTree();
        if (!cancelled) {
          setTree(data || []);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || "Unable to load organisation chart");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { tree, loading, error };
}
