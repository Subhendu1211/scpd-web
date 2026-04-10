-- -----------------------------------------------------------------------------
-- Base tables required by existing services
-- -----------------------------------------------------------------------------

-- Extensions commonly used by app code (UUIDs, crypto)
-- Azure Database for PostgreSQL does not allow uuid-ossp or pgcrypto for this user.
-- UUID values are generated in application code instead of via DB extensions.

CREATE TABLE IF NOT EXISTS grievances (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  details TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS news (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  published_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS whats_new (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  link TEXT,
  published_at TIMESTAMP NOT NULL DEFAULT now(),
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whats_new_published ON whats_new (published_at DESC, id DESC);

-- -----------------------------------------------------------------------------
-- Administrative users and media assets
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'author',
  full_name TEXT,
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS full_name TEXT;

ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS phone TEXT;

ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN;

UPDATE admin_users
  SET is_active = TRUE
  WHERE is_active IS NULL;

ALTER TABLE admin_users
  ALTER COLUMN is_active SET DEFAULT TRUE,
  ALTER COLUMN is_active SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_users_phone
  ON admin_users(phone)
  WHERE phone IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'admin_users_role_check'
  ) THEN
    ALTER TABLE admin_users
      ADD CONSTRAINT admin_users_role_check
      CHECK (
        role IN (
          'author',
          'department_reviewer',
          'editor',
          'publishing_officer',
          'superadmin',
          'admin'
        )
      );
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- Optional: registry for dynamic CMS tables (created at runtime otherwise)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS cms_dynamic_tables (
  table_name TEXT PRIMARY KEY,
  display_name TEXT,
  expose_frontend BOOLEAN DEFAULT FALSE,
  header_bg_color TEXT,
  header_text_color TEXT,
  body_text_color TEXT,
  columns JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- Homepage: Events cards (dynamic CMS table)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS homepage_events (
  id UUID PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  image TEXT,
  caption TEXT,
  date TEXT,
  location TEXT
);

INSERT INTO cms_dynamic_tables (
  table_name,
  display_name,
  expose_frontend,
  columns
)
VALUES (
  'homepage_events',
  'Homepage Events',
  TRUE,
  '[
    {"name":"id","type":"uuid","sqlType":"UUID","isPrimaryKey":true,"nullable":false,"defaultValue":null},
    {"name":"created_at","type":"timestamptz","sqlType":"TIMESTAMPTZ","isPrimaryKey":false,"nullable":false,"defaultValue":"now()"},
    {"name":"sort_order","type":"integer","sqlType":"INTEGER","isPrimaryKey":false,"nullable":false,"defaultValue":"0"},
    {"name":"is_active","type":"boolean","sqlType":"BOOLEAN","isPrimaryKey":false,"nullable":false,"defaultValue":"true"},
    {"name":"image","type":"doc","sqlType":"TEXT","isPrimaryKey":false,"nullable":true,"defaultValue":null},
    {"name":"caption","type":"text","sqlType":"TEXT","isPrimaryKey":false,"nullable":true,"defaultValue":null},
    {"name":"date","type":"text","sqlType":"TEXT","isPrimaryKey":false,"nullable":true,"defaultValue":null},
    {"name":"location","type":"text","sqlType":"TEXT","isPrimaryKey":false,"nullable":true,"defaultValue":null}
  ]'::jsonb
)
ON CONFLICT (table_name)
DO UPDATE SET
  display_name = EXCLUDED.display_name,
  expose_frontend = cms_dynamic_tables.expose_frontend OR EXCLUDED.expose_frontend,
  columns = EXCLUDED.columns;

CREATE TABLE IF NOT EXISTS admin_password_resets (
  id SERIAL PRIMARY KEY,
  admin_user_id INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  otp_hash TEXT NOT NULL,
  delivery_channel TEXT NOT NULL CHECK (delivery_channel IN ('email', 'sms')),
  destination TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMP NOT NULL,
  consumed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_password_resets_user
  ON admin_password_resets(admin_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS cms_media (
  id SERIAL PRIMARY KEY,
  file_name TEXT NOT NULL UNIQUE,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'photo',
  size_bytes BIGINT NOT NULL,
  alt_text TEXT,
  caption_text_color TEXT,
  storage_path TEXT NOT NULL,
  file_bytes BYTEA,
  uploaded_by INTEGER REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT cms_media_category_check CHECK (category IN ('photo', 'video', 'newspaper', 'audio', 'carousel'))
);

-- For existing databases created before file_bytes existed.
ALTER TABLE cms_media
  ADD COLUMN IF NOT EXISTS file_bytes BYTEA;

ALTER TABLE cms_media
  ADD COLUMN IF NOT EXISTS caption_text_color TEXT;

CREATE INDEX IF NOT EXISTS idx_cms_media_uploaded_at
  ON cms_media(created_at DESC);

CREATE TABLE IF NOT EXISTS cms_media_albums (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cms_media_albums_sort
  ON cms_media_albums(sort_order, id);

ALTER TABLE cms_media
  ADD COLUMN IF NOT EXISTS album_id INTEGER REFERENCES cms_media_albums(id) ON DELETE SET NULL;

-- Ensure existing databases accept all supported media categories.
DO $$
DECLARE
  r RECORD;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'cms_media'
      AND c.conname = 'cms_media_category_check'
  ) THEN
    ALTER TABLE cms_media DROP CONSTRAINT cms_media_category_check;
  END IF;

  -- Drop any other legacy CHECK constraints on cms_media.category (if present).
  -- This prevents multiple conflicting checks from blocking inserts.
  FOR r IN (
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'cms_media'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%category%'
  ) LOOP
    EXECUTE format('ALTER TABLE cms_media DROP CONSTRAINT %I', r.conname);
  END LOOP;

  ALTER TABLE cms_media
    ADD CONSTRAINT cms_media_category_check
    CHECK (category IN ('photo', 'video', 'newspaper', 'audio', 'carousel'));
END $$;

CREATE INDEX IF NOT EXISTS idx_cms_media_album
  ON cms_media(album_id);

ALTER TABLE cms_media_albums
  ADD COLUMN IF NOT EXISTS cover_media_id INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_cms_media_albums_cover'
  ) THEN
    ALTER TABLE cms_media_albums
      ADD CONSTRAINT fk_cms_media_albums_cover
      FOREIGN KEY (cover_media_id)
      REFERENCES cms_media(id)
      ON DELETE SET NULL
      DEFERRABLE INITIALLY DEFERRED;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- CMS core schema
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS cms_menu_items (
  id SERIAL PRIMARY KEY,
  parent_id INTEGER REFERENCES cms_menu_items(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  path TEXT NOT NULL UNIQUE,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Optional image for menu items (used by homepage cards, etc.)
ALTER TABLE cms_menu_items
  ADD COLUMN IF NOT EXISTS image_path TEXT;

CREATE INDEX IF NOT EXISTS idx_cms_menu_items_parent_id
  ON cms_menu_items(parent_id);

-- -----------------------------------------------------------------------------
-- CMS organisation chart (hierarchical units for org chart pages)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS cms_org_units (
  id SERIAL PRIMARY KEY,
  parent_id INTEGER REFERENCES cms_org_units(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT,
  department TEXT,
  email TEXT,
  phone TEXT,
  photo_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cms_org_units_parent
  ON cms_org_units(parent_id, sort_order, id);

CREATE OR REPLACE FUNCTION set_updated_at_cms_org_units()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cms_org_units_updated_at ON cms_org_units;
CREATE TRIGGER trg_cms_org_units_updated_at
BEFORE UPDATE ON cms_org_units
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_cms_org_units();

CREATE TABLE IF NOT EXISTS cms_pages (
  id SERIAL PRIMARY KEY,
  menu_item_id INTEGER NOT NULL UNIQUE REFERENCES cms_menu_items(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT,
  body TEXT,
  title_or TEXT,
  summary_or TEXT,
  body_or TEXT,
  hero_image_path TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  published_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

ALTER TABLE cms_pages
  ADD COLUMN IF NOT EXISTS title_or TEXT;

ALTER TABLE cms_pages
  ADD COLUMN IF NOT EXISTS summary_or TEXT;

ALTER TABLE cms_pages
  ADD COLUMN IF NOT EXISTS body_or TEXT;

ALTER TABLE cms_pages
  ADD COLUMN IF NOT EXISTS attachments_paths JSONB DEFAULT '[]'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'cms_pages_status_check'
  ) THEN
    ALTER TABLE cms_pages
      ADD CONSTRAINT cms_pages_status_check
      CHECK (
        status IN (
          'draft',
          'department_review',
          'editor_review',
          'publishing_review',
          'published'
        )
      );
  END IF;
END $$;

-- Per-page style settings (font/color/layout)
CREATE TABLE IF NOT EXISTS cms_page_styles (
  menu_item_id INTEGER PRIMARY KEY REFERENCES cms_menu_items(id) ON DELETE CASCADE,
  font_family TEXT,
  font_color TEXT,
  background_color TEXT,
  page_layout TEXT
);

CREATE INDEX IF NOT EXISTS idx_cms_pages_status ON cms_pages(status);

CREATE TABLE IF NOT EXISTS cms_page_versions (
  id SERIAL PRIMARY KEY,
  page_id INTEGER NOT NULL REFERENCES cms_pages(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT,
  body TEXT,
  title_or TEXT,
  summary_or TEXT,
  body_or TEXT,
  status TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  created_by INTEGER REFERENCES admin_users(id) ON DELETE SET NULL
);

ALTER TABLE cms_page_versions
  ADD COLUMN IF NOT EXISTS title_or TEXT;

ALTER TABLE cms_page_versions
  ADD COLUMN IF NOT EXISTS summary_or TEXT;

ALTER TABLE cms_page_versions
  ADD COLUMN IF NOT EXISTS attachments_paths JSONB DEFAULT '[]'::jsonb;

ALTER TABLE cms_page_versions
  ADD COLUMN IF NOT EXISTS body_or TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'cms_page_versions_status_check'
  ) THEN
    ALTER TABLE cms_page_versions
      ADD CONSTRAINT cms_page_versions_status_check
      CHECK (
        status IN (
          'draft',
          'department_review',
          'editor_review',
          'publishing_review',
          'published'
        )
      );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS admin_user_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES admin_users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id INTEGER,
  details JSONB,
  ip_address INET,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_user_logs_user
  ON admin_user_logs(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS cms_page_workflow_logs (
  id SERIAL PRIMARY KEY,
  page_id INTEGER NOT NULL REFERENCES cms_pages(id) ON DELETE CASCADE,
  menu_item_id INTEGER NOT NULL REFERENCES cms_menu_items(id) ON DELETE CASCADE,
  actor_id INTEGER REFERENCES admin_users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  comment TEXT,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cms_page_workflow_logs_page
  ON cms_page_workflow_logs(page_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- Seed navigation menu (top level first, then children) to mirror the frontend
-- -----------------------------------------------------------------------------

INSERT INTO cms_menu_items (label, slug, path, sort_order)
VALUES
  ('Home', 'home', '/', 0),
  ('About Us', 'about-us', '/about', 1),
  ('Acts/Policies/Rules', 'acts-policies-rules', '/acts', 2),
  ('Publications', 'publications', '/publications', 3),
  ('Resources', 'resources', '/resources', 4),
  ('Grievances/Cases', 'grievances-cases', '/grievances', 5),
  ('RTI', 'rti', '/rti', 6),
  ('Media', 'media', '/media', 7),
  ('Awards', 'awards', '/awards', 8),
  ('Events/Programmes', 'events-programmes', '/events', 9),
  ('Contact Us', 'contact-us', '/contact', 10),
  ('Register an Online Complaint', 'register-complaint', '/register-complaint', 11),
  ('Notice Board', 'notice-board', '/notice-board', 12),
  ('E-Library', 'e-library', '/e-library', 13)
ON CONFLICT (slug) DO NOTHING;

WITH parent AS (
  SELECT id FROM cms_menu_items WHERE slug = 'about-us'
)
INSERT INTO cms_menu_items (label, slug, path, parent_id, sort_order)
SELECT rows.label,
       rows.slug,
       rows.path,
       parent.id,
       rows.sort_order
FROM (
  VALUES
    ('About Commission', 'about-commission', '/about/about-commission', 0),
    ('Vision/Mission', 'vision-mission', '/about/vision-mission', 1),
    ('The Departments', 'departments', '/about/departments', 2),
    ('Function', 'function', '/about/function', 99),
    ('Organisation Chart', 'organisation-chart', '/about/organisation-chart', 3),
    ('Former State Commissioners', 'former-state-commissioners', '/about/former-state-commissioners', 4),
    ('Telephone Directory', 'telephone-directory', '/about/telephone-directory', 5),
    ('Our Main Activities', 'main-activities', '/about/main-activities', 6)
) AS rows(label, slug, path, sort_order)
JOIN parent ON true
ON CONFLICT (slug) DO NOTHING;

WITH parent AS (
  SELECT id FROM cms_menu_items WHERE slug = 'acts-policies-rules'
)
INSERT INTO cms_menu_items (label, slug, path, parent_id, sort_order)
SELECT rows.label,
       rows.slug,
       rows.path,
       parent.id,
       rows.sort_order
FROM (
  VALUES
    ('Disability Acts', 'disability-acts', '/acts/disability-acts', 0),
    ('Disability Policies', 'disability-policies', '/acts/disability-policies', 1),
    ('Disability Rules & Regulations', 'disability-rules-regulations', '/acts/disability-rules-regulations', 2),
    ('Disability Guidelines', 'disability-guidelines', '/acts/disability-guidelines', 3),
    ('Handbook concerning Persons with Disabilities (Supreme Court of India)', 'handbook-supreme-court', '/acts/handbook-supreme-court', 4),
    ('Equal Opportunity Policy', 'equal-opportunity-policy', '/acts/equal-opportunity-policy', 5)
) AS rows(label, slug, path, sort_order)
JOIN parent ON true
ON CONFLICT (slug) DO NOTHING;

WITH parent AS (
  SELECT id FROM cms_menu_items WHERE slug = 'publications'
)
INSERT INTO cms_menu_items (label, slug, path, parent_id, sort_order)
SELECT rows.label,
       rows.slug,
       rows.path,
       parent.id,
       rows.sort_order
FROM (
  VALUES
    ('Monthly Magazines', 'monthly-magazines', '/publications/monthly-magazines', 0),
    ('Annual Reports', 'annual-reports', '/publications/annual-reports', 1),
    ('Success Stories', 'success-stories', '/publications/success-stories', 2),
    ('Achievements', 'achievements', '/publications/achievements', 3),
    ('Advertisement', 'advertisement', '/publications/advertisement', 4)
) AS rows(label, slug, path, sort_order)
JOIN parent ON true
ON CONFLICT (slug) DO NOTHING;

WITH parent AS (
  SELECT id FROM cms_menu_items WHERE slug = 'resources'
)
INSERT INTO cms_menu_items (label, slug, path, parent_id, sort_order)
SELECT rows.label,
       rows.slug,
       rows.path,
       parent.id,
       rows.sort_order
FROM (
  VALUES
    ('Notifications / Resolutions / Circulars / O.M.', 'notifications-resolutions-circulars-om', '/resources/notifications-resolutions-circulars-om', 0),
    ('Tenders', 'tenders', '/resources/tenders', 1),
    ('Related Websites', 'related-websites', '/resources/related-websites', 2),
    ('State Advisory Board on Disability', 'state-advisory-board', '/resources/state-advisory-board', 3),
    ('Internal Complain Committee (ICC)', 'icc', '/resources/icc', 4),
    ('Schemes & Programmes', 'schemes-programmes', '/resources/schemes-programmes', 5)
) AS rows(label, slug, path, sort_order)
JOIN parent ON true
ON CONFLICT (slug) DO NOTHING;

WITH parent AS (
  SELECT id FROM cms_menu_items WHERE slug = 'grievances-cases'
)
INSERT INTO cms_menu_items (label, slug, path, parent_id, sort_order)
SELECT rows.label,
       rows.slug,
       rows.path,
       parent.id,
       rows.sort_order
FROM (
  VALUES
    ('Register a complaint', 'grievances-register', '/grievances/register', 0),
    ('How to register a complaint', 'how-to-register', '/grievances/how-to-register', 1),
    ('Final orders of SCPD', 'final-orders', '/grievances/final-orders', 2),
    ('Interim orders of SCPD', 'interim-orders', '/grievances/interim-orders', 3),
    ('Cause list', 'cause-list', '/grievances/cause-list', 4),
    ('Pendency status', 'pendency-status', '/grievances/pendency-status', 5),
    ('Suo-moto cases', 'suo-moto-cases', '/grievances/suo-moto-cases', 6),
    ('Landmark Court Judgments', 'landmark-court-judgments', '/grievances/landmark-court-judgments', 7),
    ('Leading orders of SCPD', 'leading-orders', '/grievances/leading-orders', 8),
    ('FAQs', 'grievances-faqs', '/grievances/faqs', 9)
) AS rows(label, slug, path, sort_order)
JOIN parent ON true
ON CONFLICT (slug) DO NOTHING;

WITH parent AS (
  SELECT id FROM cms_menu_items WHERE slug = 'rti'
)
INSERT INTO cms_menu_items (label, slug, path, parent_id, sort_order)
SELECT rows.label,
       rows.slug,
       rows.path,
       parent.id,
       rows.sort_order
FROM (
  VALUES
    ('RTI Acts/Rules', 'rti-acts-rules', '/rti/acts-rules', 0),
    ('Public Information Officer', 'public-information-officer', '/rti/public-information-officer', 1),
    ('First Appellate Authority', 'first-appellate-authority', '/rti/first-appellate-authority', 2)
) AS rows(label, slug, path, sort_order)
JOIN parent ON true
ON CONFLICT (slug) DO NOTHING;

WITH parent AS (
  SELECT id FROM cms_menu_items WHERE slug = 'media'
)
INSERT INTO cms_menu_items (label, slug, path, parent_id, sort_order)
SELECT rows.label,
       rows.slug,
       rows.path,
       parent.id,
       rows.sort_order
FROM (
  VALUES
    ('Photo Gallery', 'photo-gallery', '/media/photo-gallery', 0),
    ('Video Gallery', 'video-gallery', '/media/video-gallery', 1),
    ('Newspaper Clipping', 'newspaper-clipping', '/media/newspaper-clipping', 2),
    ('Audio Clipping', 'audio-clipping', '/media/audio-clipping', 3)
) AS rows(label, slug, path, sort_order)
JOIN parent ON true
ON CONFLICT (slug) DO NOTHING;

WITH parent AS (
  SELECT id FROM cms_menu_items WHERE slug = 'awards'
)
INSERT INTO cms_menu_items (label, slug, path, parent_id, sort_order)
SELECT rows.label,
       rows.slug,
       rows.path,
       parent.id,
       rows.sort_order
FROM (
  VALUES
    ('National Awards', 'national-awards', '/awards/national-awards', 0),
    ('State Awards', 'state-awards', '/awards/state-awards', 1)
) AS rows(label, slug, path, sort_order)
JOIN parent ON true
ON CONFLICT (slug) DO NOTHING;

WITH parent AS (
  SELECT id FROM cms_menu_items WHERE slug = 'events-programmes'
)
INSERT INTO cms_menu_items (label, slug, path, parent_id, sort_order)
SELECT rows.label,
       rows.slug,
       rows.path,
       parent.id,
       rows.sort_order
FROM (
  VALUES
    ('Workshops / Awareness programmes', 'workshops-awareness', '/events/workshops-awareness', 0),
    ('Camp Courts', 'camp-courts', '/events/camp-courts', 1),
    ('Quiz Competitions', 'quiz-competitions', '/events/quiz-competitions', 2),
    ('Sakhyama - An Ability Talk', 'sakhyama-ability-talk', '/events/sakhyama-ability-talk', 3),
    ('Disability Friendly Campaign', 'disability-friendly-campaign', '/events/disability-friendly-campaign', 4)
) AS rows(label, slug, path, sort_order)
JOIN parent ON true
ON CONFLICT (slug) DO NOTHING;

WITH parent AS (
  SELECT id FROM cms_menu_items WHERE slug = 'contact-us'
)
INSERT INTO cms_menu_items (label, slug, path, parent_id, sort_order)
SELECT rows.label,
       rows.slug,
       rows.path,
       parent.id,
       rows.sort_order
FROM (
  VALUES
    ('Office Contact', 'office-contact', '/contact/office-contact', 0),
    ('List of District Social Security Officers (DSSOs)', 'dsso-list', '/contact/dsso-list', 1),
    ('List of Grievance Redressal Officers (GROs)', 'gro-list', '/contact/gro-list', 2)
) AS rows(label, slug, path, sort_order)
JOIN parent ON true
ON CONFLICT (slug) DO NOTHING;

WITH parent AS (
  SELECT id FROM cms_menu_items WHERE slug = 'e-library'
)
INSERT INTO cms_menu_items (label, slug, path, parent_id, sort_order)
SELECT rows.label,
       rows.slug,
       rows.path,
       parent.id,
       rows.sort_order
FROM (
  VALUES
    ('Audio Library', 'audio-library', '/e-library/audio', 0),
    ('Video Library', 'video-library', '/e-library/video', 1),
    ('E-Book Library', 'ebook-library', '/e-library/ebook', 2)
) AS rows(label, slug, path, sort_order)
JOIN parent ON true
ON CONFLICT (slug) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Seed placeholder published pages so the frontend can load content immediately
-- -----------------------------------------------------------------------------

INSERT INTO cms_pages (menu_item_id, title, summary, body, status, published_at)
SELECT id,
       label,
       CONCAT('Placeholder content for ', label),
       CONCAT('## ', label, E'\n\nContent for this section will be managed through the SCPD CMS. Replace this text using the admin dashboard.'),
       'published',
       now()
FROM cms_menu_items
ON CONFLICT (menu_item_id) DO NOTHING;

-- Ensure Equal Opportunity Policy CMS page exists for existing DBs (idempotent)
INSERT INTO cms_pages (menu_item_id, title, summary, body, status, published_at)
SELECT id,
       'Equal Opportunity Policy',
       'Placeholder content for Equal Opportunity Policy',
       CONCAT('## Equal Opportunity Policy', E'\n\nThis page is managed via the SCPD CMS. Replace this placeholder content using the admin dashboard.'),
       'published',
       now()
FROM cms_menu_items
WHERE slug = 'equal-opportunity-policy'
ON CONFLICT (menu_item_id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Success stories (year-wise image uploads)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS success_stories (
  id SERIAL PRIMARY KEY,
  year INTEGER NOT NULL,
  image_url TEXT NOT NULL,
  alt_text TEXT,
  uploaded_by INTEGER REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_success_stories_year
  ON success_stories(year DESC, id DESC);

-- -----------------------------------------------------------------------------
-- Seed initial administrative user
-- -----------------------------------------------------------------------------

INSERT INTO admin_users (email, password_hash, role)
VALUES
  ('admin@example.com', '$2b$10$Jy.UKhPxdfWIkEcwZvG72.Jijn7rrOBefuumllr7/VRoh2OoZPxKC','superadmin')
ON CONFLICT (email) DO NOTHING;

