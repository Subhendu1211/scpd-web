import { useEffect, useState } from "react";
import { api } from "../services/api";

export type TableColumn = {
  name: string;
  sqlType: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  defaultValue: string | null;
};

export type TableResponse = {
  tableName: string;
  headerBgColor?: string | null;
  headerTextColor?: string | null;
  bodyTextColor?: string | null;
  columns: TableColumn[];
  rows: Record<string, unknown>[];
};

export function useCmsTable(dynamicTableName?: string | null, limit = 500) {
  const [table, setTable] = useState<TableResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!dynamicTableName) {
        setTable(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const response = await api.get<{ data: TableResponse }>(
          `/cms/tables/${dynamicTableName}`,
          { params: { limit } }
        );
        if (!cancelled) {
          setTable(response.data.data);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || "Unable to load table");
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
  }, [dynamicTableName, limit]);

  return { table, loading, error };
}
