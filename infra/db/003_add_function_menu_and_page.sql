-- Add "Function" submenu under About and ensure a placeholder page exists
-- This script is idempotent: it will not duplicate existing rows.

WITH about_parent AS (
  SELECT id FROM cms_menu_items WHERE slug = 'about-us'
)
INSERT INTO cms_menu_items (label, slug, path, parent_id, sort_order, is_active)
SELECT 'Function', 'function', '/about/function', about_parent.id, 99, true
FROM about_parent
ON CONFLICT (slug) DO NOTHING;

-- Ensure a placeholder cms_pages row exists for the Function page
INSERT INTO cms_pages (menu_item_id, title, summary, body, status, published_at)
SELECT id,
       'Function',
       CONCAT('Placeholder content for ', 'Function'),
       CONCAT('## ', 'Function', E'\n\nContent for this section will be managed through the SCPD CMS. Replace this text using the admin dashboard.'),
       'published',
       now()
FROM cms_menu_items
WHERE slug = 'function'
ON CONFLICT (menu_item_id) DO NOTHING;
