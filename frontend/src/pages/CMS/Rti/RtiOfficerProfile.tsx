import React, { useMemo } from "react";
import CmsTable from "../../../components/common/CmsTable";
import RTILayout from "@pages/RTI/RTILayout";
import { useCmsPage } from "../../../hooks/useCmsPage";
import { useCmsTable } from "../../../hooks/useCmsTable";
import { markdownToHtml } from "../../../utils/markdown";

type RtiOfficerProfileProps = {
  path: string;
  fallbackTitle: string;
};

type ParsedOfficer = {
  name: string;
  designation: string;
  email: string;
  phone: string;
  office: string;
  extraLines: string[];
};

const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

function normalizeKey(raw: string): keyof Omit<ParsedOfficer, "extraLines"> | null {
  const key = raw.toLowerCase().replace(/[^a-z]/g, "");
  if (key.includes("name")) return "name";
  if (key.includes("designation")) return "designation";
  if (key.includes("email")) return "email";
  if (key.includes("phone") || key.includes("mobile") || key.includes("contact")) return "phone";
  if (key.includes("office") || key.includes("address")) return "office";
  return null;
}

function parseOfficerDetails(summary: string | null | undefined, body: string | null | undefined): ParsedOfficer {
  const data: ParsedOfficer = {
    name: "",
    designation: "",
    email: "",
    phone: "",
    office: "",
    extraLines: [],
  };

  const source = `${summary ?? ""}\n${body ?? ""}`
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\r\n/g, "\n");

  const lines = source
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  lines.forEach((line) => {
    const keyValue = line.match(/^[-*]?\s*([A-Za-z][A-Za-z\s()./-]{1,40})\s*[:\-]\s*(.+)$/);
    if (keyValue) {
      const mappedKey = normalizeKey(keyValue[1]);
      if (mappedKey) {
        if (!data[mappedKey]) {
          data[mappedKey] = keyValue[2].trim();
        }
        return;
      }
    }

    if (!data.email) {
      const emailMatch = line.match(EMAIL_REGEX);
      if (emailMatch) {
        data.email = emailMatch[0];
        return;
      }
    }

    data.extraLines.push(line);
  });

  if (!data.email) {
    const sourceEmailMatch = source.match(EMAIL_REGEX);
    if (sourceEmailMatch) {
      data.email = sourceEmailMatch[0];
      data.extraLines = data.extraLines.filter((line) => !line.includes(sourceEmailMatch[0]));
    }
  }

  return data;
}

function renderFieldValue(label: string, value: string) {
  if (!value) return <span className="rti-officer-value rti-officer-value-muted">Not provided</span>;

  if (label === "Email") {
    const emailMatch = value.match(EMAIL_REGEX);
    const email = emailMatch ? emailMatch[0] : value;
    return (
      <a className="rti-officer-value rti-officer-link" href={`mailto:${email}`}>
        {email}
      </a>
    );
  }

  if (label === "Phone" || label === "Contact No") {
    const tel = value.replace(/[^\d+]/g, "");
    const href = tel ? `tel:${tel}` : "";
    if (href) {
      return (
        <a className="rti-officer-value rti-officer-link" href={href}>
          {value}
        </a>
      );
    }
  }

  return <span className="rti-officer-value">{value}</span>;
}

export default function RtiOfficerProfile({ path, fallbackTitle }: RtiOfficerProfileProps) {
  const state = useCmsPage(path);
  const { table, loading: tableLoading, error: tableError } = useCmsTable(state.page?.dynamicTableName);

  const parsed = useMemo(
    () => parseOfficerDetails(state.page?.summary, state.page?.body),
    [state.page?.summary, state.page?.body]
  );

  const extraHtml = useMemo(() => {
    if (!parsed.extraLines.length) {
      return "";
    }
    return markdownToHtml(parsed.extraLines.join("\n\n"));
  }, [parsed.extraLines]);

  if (state.loading) {
    return (
      <RTILayout>
        <p>Loading content...</p>
      </RTILayout>
    );
  }

  if (state.error || !state.page) {
    return (
      <RTILayout>
        <p className="admin-error" role="alert">
          {state.error ?? "Content not found"}
        </p>
      </RTILayout>
    );
  }

  const title = state.page.title || state.page.label || fallbackTitle;
  const detailRows = [
    { label: "Name", value: parsed.name },
    { label: "Designation", value: parsed.designation },
    { label: "Email", value: parsed.email },
    { label: "Contact No", value: parsed.phone },
  ];

  return (
    <RTILayout>
      <section className="rti-officer-page" aria-label={title}>
        <article className="rti-officer-card">
          <p className="rti-officer-kicker">Right to Information</p>
          <h1>{title}</h1>
          <div className="rti-officer-accent" />

          {detailRows.length ? (
            <dl className="rti-officer-grid">
              {detailRows.map((row) => (
                <div className="rti-officer-row" key={row.label}>
                  <dt className="rti-officer-label">{row.label}</dt>
                  <dd>{renderFieldValue(row.label, row.value)}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          {extraHtml ? <div className="rti-officer-extra cms-body" dangerouslySetInnerHTML={{ __html: extraHtml }} /> : null}

          {!detailRows.length && !extraHtml ? (
            <p className="rti-officer-value-muted">Detailed officer information will be published soon.</p>
          ) : null}
        </article>

        {tableLoading ? <p>Loading table...</p> : null}
        {tableError ? (
          <p className="admin-error" role="alert">
            {tableError}
          </p>
        ) : null}
        {!tableLoading && !tableError ? <CmsTable table={table} /> : null}
      </section>
    </RTILayout>
  );
}
