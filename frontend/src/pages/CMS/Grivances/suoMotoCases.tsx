import React from "react";
import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import CmsContent from "../../../components/common/CmsContent";
import CmsTable from "../../../components/common/CmsTable";
import { useCmsPage } from "../../../hooks/useCmsPage";
import { useCmsTable } from "../../../hooks/useCmsTable";
import GrievanceLayout from "@pages/Grievances/GrivanceLayout";
import { buildOrdersArchive, filterRowsByYear, filterRowsByYearMonth } from "../../../utils/ordersArchive";

export default function SuoMotoCases() {
  const [searchParams, setSearchParams] = useSearchParams();
  const state = useCmsPage("/grievances/suo-moto-cases");
  const { table, loading, error } = useCmsTable(state.page?.dynamicTableName);

  const selectedYear = Number(searchParams.get("year"));
  const selectedMonth = Number(searchParams.get("month"));

  const archive = useMemo(() => {
    if (!table) {
      return [];
    }
    return buildOrdersArchive(table.rows, table.columns);
  }, [table]);

  const selectedYearNode = useMemo(() => {
    return archive.find((yearNode) => yearNode.year === selectedYear) ?? null;
  }, [archive, selectedYear]);

  const filteredTable = useMemo(() => {
    if (!table) {
      return table;
    }

    const hasValidYear = Number.isInteger(selectedYear) && selectedYear >= 1900 && selectedYear <= 3000;
    const hasValidMonth = Number.isInteger(selectedMonth) && selectedMonth >= 1 && selectedMonth <= 12;

    if (!hasValidYear) {
      return table;
    }

    const rows = hasValidMonth
      ? filterRowsByYearMonth(table.rows, selectedYear, selectedMonth, table.columns)
      : filterRowsByYear(table.rows, selectedYear, table.columns);

    return {
      ...table,
      rows,
    };
  }, [table, selectedYear, selectedMonth]);

  const tableTitle = useMemo(() => {
    if (!table) {
      return undefined;
    }

    const hasValidYear = Number.isInteger(selectedYear) && selectedYear >= 1900 && selectedYear <= 3000;
    const hasValidMonth = Number.isInteger(selectedMonth) && selectedMonth >= 1 && selectedMonth <= 12;

    if (!hasValidYear) {
      return undefined;
    }

    if (!hasValidMonth) {
      return `Suo-Moto Cases ${selectedYear}`;
    }

    const monthLabel = archive
      .find((yearNode) => yearNode.year === selectedYear)
      ?.months.find((monthNode) => monthNode.month === selectedMonth)?.label;

    return monthLabel ? monthLabel.replace(/Orders$/i, "Suo-Moto Cases") : `Suo-Moto Cases ${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;
  }, [table, archive, selectedYear, selectedMonth]);

  const yearValue = selectedYearNode ? String(selectedYearNode.year) : "";
  const monthValue =
    selectedYearNode && Number.isInteger(selectedMonth) && selectedMonth >= 1 && selectedMonth <= 12
      ? String(selectedMonth)
      : "";

  const handleYearChange = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (!value) {
      next.delete("year");
      next.delete("month");
    } else {
      next.set("year", value);
      next.delete("month");
    }
    setSearchParams(next);
  };

  const handleMonthChange = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (!value) {
      next.delete("month");
    } else {
      next.set("month", value);
    }
    setSearchParams(next);
  };

  return (
    <GrievanceLayout>
      <CmsContent {...state}>
        {loading ? <p>Loading table…</p> : null}
        {error ? (
          <p className="admin-error" role="alert">
            {error}
          </p>
        ) : null}
        {!loading && !error ? (
          <>
            {archive.length ? (
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontWeight: 600 }}>Year</span>
                  <select
                    value={yearValue}
                    onChange={(event) => handleYearChange(event.target.value)}
                    style={{ minWidth: 160, padding: "8px 10px" }}
                  >
                    <option value="">All Years</option>
                    {archive.map((yearNode) => (
                      <option key={yearNode.year} value={String(yearNode.year)}>
                        {yearNode.year}
                      </option>
                    ))}
                  </select>
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontWeight: 600 }}>Month</span>
                  <select
                    value={monthValue}
                    onChange={(event) => handleMonthChange(event.target.value)}
                    disabled={!selectedYearNode}
                    style={{ minWidth: 220, padding: "8px 10px" }}
                  >
                    <option value="">All Months</option>
                    {(selectedYearNode?.months ?? []).map((monthNode) => (
                      <option key={monthNode.month} value={String(monthNode.month)}>
                        {monthNode.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : null}

            <CmsTable table={filteredTable} title={tableTitle} />
          </>
        ) : null}
      </CmsContent>
    </GrievanceLayout>
  );
}
