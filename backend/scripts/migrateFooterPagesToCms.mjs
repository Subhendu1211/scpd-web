import { pool } from "../src/models/db.js";

const nowYear = new Date().getFullYear();

const footerPages = [
  {
    path: "/copyright",
    label: "Copyright",
    section: "policies",
    order: 10,
    title: "Copyright Information",
    summary: "Copyright and permitted reuse information for SCPD Odisha website content.",
    body: `
<p>Copyright &copy; ${nowYear} SCPD Odisha. All rights reserved. The content on this website, including text, images, graphics and code, is protected under copyright law unless otherwise stated.</p>
<p>Permitted use: You may view, download, and print pages from this site for your personal, non-commercial use, provided you retain all copyright and other proprietary notices. Reuse or republication of material from this site requires prior written permission.</p>
<p>To request permission for reuse or to report copyright concerns, please use the <a href="/feedback">Feedback</a> form or contact us via the <a href="/contact/office-contact">Contact</a> page.</p>
`.trim(),
  },
  {
    path: "/disclaimer",
    label: "Disclaimer",
    section: "policies",
    order: 20,
    title: "Disclaimer",
    summary: "General disclaimer for website information and external links.",
    body: `
<p>The information provided on this website is intended for general information only. While we strive to keep the content accurate and up to date, we do not warrant or guarantee the completeness, accuracy, or suitability of the information for any purpose.</p>
<p>The website and its owners shall not be liable for any loss or damage arising from reliance on the information published here. External links are provided for convenience and do not imply endorsement.</p>
`.trim(),
  },
  {
    path: "/hyperlinking",
    label: "Hyperlinking",
    section: "policies",
    order: 30,
    title: "Hyperlinking Policy",
    summary: "Policy on external links and linking to SCPD Odisha website.",
    body: `
<p>Links to external websites are provided for convenience and information only. SCPD Odisha is not responsible for the content of external sites and does not necessarily endorse their content.</p>
<p>When linking to this site, please ensure that the content is not taken out of context and that the source is properly attributed. For permissions to republish content, contact us via the <a href="/contact/office-contact">Contact</a> page.</p>
`.trim(),
  },
  {
    path: "/privacy",
    label: "Privacy",
    section: "policies",
    order: 40,
    title: "Privacy Policy",
    summary: "How personal and technical information is handled on this website.",
    body: `
<p>We are committed to protecting your privacy. This policy explains how we collect and process personal data when you use this website.</p>
<h2>What we collect</h2>
<p>We may collect information you provide directly (for example, when you submit the Feedback form) and non-identifying technical information (such as browser and device data) to help improve the site.</p>
<h2>How we use data</h2>
<p>Personal data is used only for the purpose it was provided, such as to respond to enquiries. We do not sell personal data to third parties.</p>
<h2>Cookies</h2>
<p>We may use cookies and similar technologies to improve site functionality. You can control cookie settings in your browser.</p>
<h2>Contact</h2>
<p>For privacy concerns or to request access or deletion of your data, contact us via the <a href="/contact/office-contact">Contact</a> page.</p>
`.trim(),
  },
  {
    path: "/terms",
    label: "Terms",
    section: "policies",
    order: 50,
    title: "Terms and Conditions",
    summary: "Terms governing use of this website.",
    body: `
<p>These terms govern the use of this website. By accessing and using the site you agree to comply with these terms. Please read them carefully.</p>
<h2>Acceptable use</h2>
<p>Users must not use the site for unlawful activities or to post defamatory, obscene or abusive material.</p>
<h2>Intellectual property</h2>
<p>All site content is the property of the website unless stated otherwise. Reuse requires permission as described on the Copyright page.</p>
<h2>Changes to terms</h2>
<p>We may update these terms from time to time; changes will be posted on this page with the date of the latest revision.</p>
`.trim(),
  },
  {
    path: "/website-policies",
    label: "Website Policies",
    section: "policies",
    order: 60,
    title: "Website Policies",
    summary: "Central index of website policy documents.",
    body: `
<p>This page brings together key policies that govern the use of this website.</p>
<ul>
  <li><a href="/privacy">Privacy Policy</a></li>
  <li><a href="/terms">Terms and Conditions</a></li>
  <li><a href="/copyright">Copyright</a></li>
  <li><a href="/disclaimer">Disclaimer</a></li>
  <li><a href="/accessibility">Accessibility Statement</a></li>
</ul>
`.trim(),
  },
  {
    path: "/accessibility",
    label: "Accessibility Statement",
    section: "policies",
    order: 70,
    title: "Accessibility Statement",
    summary: "SCPD accessibility commitment and standards compliance.",
    body: `
<p>SCPD is committed to making its website accessible, in accordance with the Rights of Persons with Disabilities (RPwD) Act and WCAG 2.1 Level AA guidelines.</p>
<h2>Measures to support accessibility</h2>
<ul>
  <li>Semantic HTML with ARIA where appropriate</li>
  <li>Keyboard-accessible navigation and dropdowns</li>
  <li>Visible focus styles and skip-to-content link</li>
  <li>Resizable text and high-contrast mode</li>
</ul>
<h2>Conformance status</h2>
<p>The site aims for WCAG 2.1 AA. Some documents and legacy content may not yet fully conform.</p>
<h2>Feedback</h2>
<p>We welcome your feedback on accessibility. Please contact:<br />Email: <a href="mailto:accessibility@example.gov.in">accessibility@example.gov.in</a><br />Phone: <a href="tel:+910000000000">+91 00000 00000</a></p>
<h2>Compatibility</h2>
<p>This site works with modern browsers and assistive technologies.</p>
<h2>Keyboard shortcuts</h2>
<ul>
  <li>Use Tab/Shift+Tab to move between links and controls</li>
  <li>In menus: Arrow keys navigate items, Esc closes menus</li>
</ul>
<h2>Customizations</h2>
<p>Use the Accessibility controls (A-/A/A+, High Contrast) above the main content to adjust text size and contrast to your preference.</p>
`.trim(),
  },
  {
    path: "/web-information-manager",
    label: "Web Information Manager",
    section: "governance",
    order: 10,
    title: "Web Information Manager",
    summary: "Role and responsibilities of the Web Information Manager.",
    body: `
<p>The Web Information Manager (WIM) is responsible for maintaining the website content, ensuring accessibility compliance and acting as the primary point of contact for website-related queries.</p>
<h2>Responsibilities</h2>
<ul>
  <li>Maintain and publish official content.</li>
  <li>Coordinate with departments to update pages.</li>
  <li>Ensure accessibility and usability of the website.</li>
</ul>
<p>For matters related to content updates or technical issues, please use the <a href="/feedback">Feedback</a> page or contact the office via the Contact page.</p>
`.trim(),
  },
  {
    path: "/visitor-reports",
    label: "Visitor Reports",
    section: "governance",
    order: 20,
    title: "Visitor Reports",
    summary: "Periodic website visitor reports for transparency.",
    body: `
<p>We publish periodic visitor reports summarising traffic to the website to improve transparency and inform service improvements.</p>
<h2>What these reports include</h2>
<ul>
  <li>Number of visitors and sessions</li>
  <li>Most viewed pages and resources</li>
  <li>Geographic and device breakdown (aggregated)</li>
</ul>
<p>Reports are published on a monthly or quarterly basis. To request a specific report or for enquiries about the data, please contact the Web Information Manager or use the <a href="/feedback">Feedback</a> page.</p>
`.trim(),
  },
];

function slugFromPath(path) {
  return String(path || "")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9/\-_]+/g, "-")
    .replace(/\//g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "footer-page";
}

async function ensureFooterLinksTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS cms_footer_links (
      menu_item_id INTEGER PRIMARY KEY REFERENCES cms_menu_items(id) ON DELETE CASCADE,
      section TEXT NOT NULL,
      link_label TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT cms_footer_links_section_check CHECK (section IN ('contact', 'policies', 'governance'))
    );
  `);
}

async function upsertMenuItem(client, { path, label }) {
  const slug = slugFromPath(path);
  await client.query(
    `
      INSERT INTO cms_menu_items (parent_id, label, slug, path, description, sort_order, is_active, created_at, updated_at)
      VALUES (NULL, $1, $2, $3, $4, 9999, FALSE, now(), now())
      ON CONFLICT (path)
      DO UPDATE SET
        label = EXCLUDED.label,
        description = EXCLUDED.description,
        updated_at = now()
    `,
    [label, slug, path, "Migrated from legacy hardcoded footer page"]
  );

  const { rows } = await client.query(
    `SELECT id FROM cms_menu_items WHERE path = $1 LIMIT 1`,
    [path]
  );
  return rows[0]?.id;
}

async function upsertCmsPage(client, menuItemId, page) {
  const existing = await client.query(
    `SELECT id FROM cms_pages WHERE menu_item_id = $1 LIMIT 1`,
    [menuItemId]
  );

  if (existing.rows.length) {
    await client.query(
      `
        UPDATE cms_pages
        SET title = $1,
            summary = $2,
            body = $3,
            status = 'published',
            published_at = COALESCE(published_at, now()),
            updated_at = now()
        WHERE menu_item_id = $4
      `,
      [page.title, page.summary, page.body, menuItemId]
    );
    return;
  }

  await client.query(
    `
      INSERT INTO cms_pages (menu_item_id, title, summary, body, status, published_at, created_at, updated_at)
      VALUES ($1, $2, $3, $4, 'published', now(), now(), now())
    `,
    [menuItemId, page.title, page.summary, page.body]
  );
}

async function upsertFooterLink(client, menuItemId, page) {
  await client.query(
    `
      INSERT INTO cms_footer_links (menu_item_id, section, link_label, sort_order, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, TRUE, now(), now())
      ON CONFLICT (menu_item_id)
      DO UPDATE SET
        section = EXCLUDED.section,
        link_label = EXCLUDED.link_label,
        sort_order = EXCLUDED.sort_order,
        is_active = TRUE,
        updated_at = now()
    `,
    [menuItemId, page.section, page.label, page.order]
  );
}

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await ensureFooterLinksTable(client);

    for (const page of footerPages) {
      const menuItemId = await upsertMenuItem(client, page);
      if (!menuItemId) {
        throw new Error(`Unable to resolve menu item for path ${page.path}`);
      }
      await upsertCmsPage(client, menuItemId, page);
      await upsertFooterLink(client, menuItemId, page);
      console.log(`Migrated: ${page.path}`);
    }

    await client.query("COMMIT");
    console.log("Footer page migration completed successfully.");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Footer page migration failed:", error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
