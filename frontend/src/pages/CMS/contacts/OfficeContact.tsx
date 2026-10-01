import React from "react";
import CmsTable from "../../../components/common/CmsTable";
import ContactLayout from "@pages/Contact/ContactLayout";
import { useCmsPage } from "../../../hooks/useCmsPage";
import { useCmsTable } from "../../../hooks/useCmsTable";
import { markdownToHtml } from "../../../utils/markdown";

const ADDRESS = "A1 Block, Ground Floor, Toshali Bhawan, Satyanagar, Bhubaneswar, Odisha, India";

export default function OfficeContact() {
  const state = useCmsPage("/contact/office-contact");
  const { table, loading: tableLoading, error: tableError } = useCmsTable(
    state.page?.dynamicTableName,
  );

  if (state.loading) {
    return (
      <ContactLayout>
        <p>Loading content...</p>
      </ContactLayout>
    );
  }

  if (state.error || !state.page) {
    return (
      <ContactLayout>
        <p className="admin-error" role="alert">
          {state.error ?? "Content not found"}
        </p>
      </ContactLayout>
    );
  }

  const html = markdownToHtml(state.page.body);
  const mapEmbedSrc = `https://www.google.com/maps?q=${encodeURIComponent(ADDRESS)}&output=embed`;

  return (
    <ContactLayout>
      <section className="office-contact-page" aria-label="Office contact">
        <h1>{state.page.title || state.page.label}</h1>
        {state.page.summary ? (
          <p className="office-contact-summary">{state.page.summary}</p>
        ) : null}
        <div
          className="office-contact-body cms-body"
          dangerouslySetInnerHTML={{ __html: html }}
        />
        {tableLoading ? <p>Loading table...</p> : null}
        {tableError ? (
          <p className="admin-error" role="alert">
            {tableError}
          </p>
        ) : null}
        {!tableLoading && !tableError ? <CmsTable table={table} /> : null}

        <div style={{ marginTop: "2rem" }}>
          <iframe
            width="100%"
            height="450"
            style={{ border: 0, borderRadius: "8px" }}
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            src={mapEmbedSrc}
            title="Office Location Map"
          />
        </div>
      </section>
    </ContactLayout>
  );
}
