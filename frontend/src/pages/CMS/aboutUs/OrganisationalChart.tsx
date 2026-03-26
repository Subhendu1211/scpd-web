import React, { useEffect, useRef, useState } from "react";
import AboutLayout from "@pages/About/AboutLayout";
import CmsContent from "../../../components/common/CmsContent";
import CmsTable from "../../../components/common/CmsTable";
import { useCmsPage } from "../../../hooks/useCmsPage";
import { useCmsTable } from "../../../hooks/useCmsTable";
import { useOrgChartTree } from "../../../hooks/useOrgChartTree";
import { OrgUnit } from "../../../services/cms";
import { ORG_CHART_DYNAMIC_SOURCE } from "../../../constants/cms";

type OrgNodeProps = {
  node: OrgUnit;
  depth: number;
};

function OrgNode({ node, depth }: OrgNodeProps) {
  const children = node.children ?? [];
  const levelClass = `org-node-level-${Math.min(depth, 3)}`;

  return (
    <li className="org-branch">
      <article className={`org-node-card ${levelClass}`}>
        {node.photoUrl && (
          <img
            src={node.photoUrl}
            alt={node.name}
            style={{
              width: "100px",
              height: "100px",
              borderRadius: "50%",
              objectFit: "cover",
              marginBottom: "8px",
              border: "3px solid rgba(255,255,255,0.3)",
              display: "block",
              margin: "0 auto 8px",
            }}
          />
        )}
        <h3 className="org-node-name">{node.name}</h3>
        {node.title && (
          <p
            className="org-node-title"
            style={{ margin: "4px 0", fontSize: "0.9em", fontWeight: 600 }}
          >
            {node.title}
          </p>
        )}
        {node.department && (
          <p
            className="org-node-department"
            style={{ margin: "4px 0", fontSize: "0.85em", opacity: 0.9 }}
          >
            {node.department}
          </p>
        )}

        {node.email && (
          <div
            style={{
              marginTop: "8px",
              fontSize: "0.8em",
              opacity: 0.85,
              wordBreak: "break-all",
            }}
          >
            ✉️{" "}
            <a
              href={`mailto:${node.email}`}
              style={{ color: "inherit", textDecoration: "none" }}
            >
              {node.email}
            </a>
          </div>
        )}
        {node.phone && (
          <div style={{ marginTop: "4px", fontSize: "0.8em", opacity: 0.85 }}>
            📞{" "}
            <a
              href={`tel:${node.phone}`}
              style={{ color: "inherit", textDecoration: "none" }}
            >
              {node.phone}
            </a>
          </div>
        )}
      </article>

      {children.length ? (
        <ul className="org-level-list">
          {children.map((child) => (
            <OrgNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function OrgTree({ tree }: { tree: OrgUnit[] }) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const targetRef = useRef<HTMLDivElement | null>(null);
  const [fitScale, setFitScale] = useState(1);
  const [fitHeight, setFitHeight] = useState<number | null>(null);

  useEffect(() => {
    const updateFit = () => {
      const viewport = viewportRef.current;
      const target = targetRef.current;

      if (!viewport || !target) {
        return;
      }

      if (window.matchMedia("(max-width: 900px)").matches) {
        setFitScale(1);
        setFitHeight(null);
        return;
      }

      const naturalWidth = target.scrollWidth;
      const naturalHeight = target.scrollHeight;
      const availableWidth = Math.max(0, viewport.clientWidth);

      if (!naturalWidth || !naturalHeight || !availableWidth) {
        setFitScale(1);
        setFitHeight(null);
        return;
      }

      const nextScale = Math.min(1, availableWidth / naturalWidth);
      setFitScale(nextScale);
      setFitHeight(Math.ceil(naturalHeight * nextScale) + 2);
    };

    updateFit();

    const observer = new ResizeObserver(() => updateFit());
    if (viewportRef.current) observer.observe(viewportRef.current);
    if (targetRef.current) observer.observe(targetRef.current);

    window.addEventListener("resize", updateFit);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateFit);
    };
  }, [tree]);

  return (
    <div className="orgchart-hierarchy-wrap" ref={viewportRef}>
      <div
        className="orgchart-fit-stage"
        style={fitHeight ? { height: `${fitHeight}px` } : undefined}
      >
        <div
          className="orgchart-hierarchy orgchart-fit-target"
          ref={targetRef}
          style={{ transform: `scale(${fitScale})` }}
        >
          <ul className="org-level-list org-root-list">
            {tree.map((node) => (
              <OrgNode key={node.id} node={node} depth={0} />
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function OrganisationalChart() {
  const pageState = useCmsPage("/about/organisation-chart");
  const showOrgChart =
    pageState.page?.dynamicTableName === ORG_CHART_DYNAMIC_SOURCE;
  const tableState = useCmsTable(
    showOrgChart ? null : pageState.page?.dynamicTableName,
  );
  const orgChartState = useOrgChartTree();

  return (
    <AboutLayout>
      <CmsContent {...pageState}>
        {showOrgChart ? (
          <>
            {orgChartState.loading ? (
              <p>Loading organisation chart...</p>
            ) : null}
            {orgChartState.error ? (
              <p className="admin-error" role="alert">
                {orgChartState.error}
              </p>
            ) : null}
            {!orgChartState.loading &&
            !orgChartState.error &&
            orgChartState.tree.length === 0 ? (
              <p>No organisation chart entries are available.</p>
            ) : null}
            {!orgChartState.loading &&
            !orgChartState.error &&
            orgChartState.tree.length > 0 ? (
              <OrgTree tree={orgChartState.tree} />
            ) : null}
          </>
        ) : (
          <>
            {tableState.loading ? <p>Loading table...</p> : null}
            {tableState.error ? (
              <p className="admin-error" role="alert">
                {tableState.error}
              </p>
            ) : null}
            {!tableState.loading && !tableState.error ? (
              <CmsTable table={tableState.table} />
            ) : null}
          </>
        )}
      </CmsContent>
    </AboutLayout>
  );
}
