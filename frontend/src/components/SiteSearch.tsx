import React, { useEffect, useState, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import { fetchCmsNavigation, fetchCmsPageByPath } from "../services/cms";
import { buildOrdersArchive } from "../utils/ordersArchive";
import {
  STATIC_NAV_ITEMS,
  injectGrievanceArchives,
  buildNavFromCms,
  NavItem,
} from "./MainNav/Navbar";

export default function SiteSearch() {
  const [query, setQuery] = useState("");
  const [navItems, setNavItems] = useState<NavItem[]>(STATIC_NAV_ITEMS);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadData() {
      try {
        // 1. Fetch CMS Navigation
        const cmsNodes = await fetchCmsNavigation();
        const cmsItems = buildNavFromCms(cmsNodes);
        
        // 2. Fetch Grievance Archives
        const [finalPage, interimPage, suoMotoPage] = await Promise.all([
          fetchCmsPageByPath("/grievances/final-orders"),
          fetchCmsPageByPath("/grievances/interim-orders"),
          fetchCmsPageByPath("/grievances/suo-moto-cases"),
        ]);

        const readArchive = async (tableName?: string | null) => {
          if (!tableName) return [] as ReturnType<typeof buildOrdersArchive>;
          const response = await api.get<{ data: { rows: any[]; columns: any[] } }>(
            `/cms/tables/${tableName}`,
            { params: { limit: 500 } }
          );
          return buildOrdersArchive(response.data.data.rows || [], response.data.data.columns || []);
        };

        const [orders, interim, suoMoto] = await Promise.all([
          readArchive(finalPage?.dynamicTableName),
          readArchive(interimPage?.dynamicTableName),
          readArchive(suoMotoPage?.dynamicTableName),
        ]);

        // 3. Merge
        let combined = [...STATIC_NAV_ITEMS];
        // Include CMS items in the search data
        if (cmsItems.length) combined = [...combined, ...cmsItems];

        // Inject archives
        combined = injectGrievanceArchives(combined, { orders, interim, suoMoto });
        setNavItems(combined);

      } catch (err) {
        console.error("Search data load failed", err);
      }
    }
    loadData();
  }, []);

  // Flatten items for search
  const flatItems = useMemo(() => {
    const flat: { label: string; to: string }[] = [];
    const traverse = (items: NavItem[]) => {
      for (const item of items) {
        if (item.to && !item.to.startsWith("#")) {
          flat.push({ label: item.label, to: item.to });
        }
        if (item.children) traverse(item.children);
      }
    };
    traverse(navItems);
    return flat;
  }, [navItems]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const lower = query.toLowerCase();
    return flatItems.filter(item => item.label.toLowerCase().includes(lower));
  }, [query, flatItems]);

  // Click outside to close
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="util-search-row" ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      <input
        type="text"
        placeholder="Search..."
        value={query}
        onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
      />
      {isOpen && results.length > 0 && (
        <ul style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: '#fff',
            border: '1px solid #ccc',
            borderRadius: '6px',
            maxHeight: '300px',
            overflowY: 'auto',
            zIndex: 1400,
            listStyle: 'none',
            padding: 0,
            margin: '4px 0 0 0',
            boxShadow: '0 10px 28px rgba(0,0,0,0.18)'
        }}>
          {results.map((item, i) => {
            const isExternal = /^https?:\/\//i.test(item.to);
            const linkStyle = { display: 'block', padding: '10px 14px', textDecoration: 'none', color: '#0f172a', fontSize: '0.95rem' };
            return (
              <li key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                {isExternal ? (
                  <a
                    href={item.to}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setIsOpen(false)}
                    style={linkStyle}
                  >
                    {item.label}
                  </a>
                ) : (
                  <Link to={item.to} onClick={() => setIsOpen(false)} style={linkStyle}>
                    {item.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {isOpen && query && results.length === 0 && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: '#fff',
            border: '1px solid #ccc',
            borderRadius: '6px',
            padding: '12px',
            zIndex: 1400,
            marginTop: '4px',
            color: '#64748b',
            boxShadow: '0 10px 28px rgba(0,0,0,0.18)'
          }}>
              No results found.
          </div>
      )}
    </div>
  );
}