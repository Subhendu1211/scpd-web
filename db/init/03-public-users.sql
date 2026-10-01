-- Public user auth
CREATE TABLE IF NOT EXISTS public_users (
  id UUID PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_public_users_email ON public_users (lower(email));
CREATE INDEX IF NOT EXISTS idx_public_users_phone ON public_users (phone);

CREATE OR REPLACE FUNCTION public_users_set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_public_users_updated_at ON public_users;
CREATE TRIGGER trg_public_users_updated_at
BEFORE UPDATE ON public_users
FOR EACH ROW EXECUTE FUNCTION public_users_set_updated_at();
