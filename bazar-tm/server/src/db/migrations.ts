/**
 * Database migrations, applied in order and recorded in schema_migrations.
 * Never edit a migration that has been released: add a new one instead.
 */
export interface Migration {
  id: string;
  sql: string;
}

export const migrations: Migration[] = [
  {
    id: '0001_users_shops_invites_sessions',
    sql: `
CREATE TYPE user_role AS ENUM ('owner', 'seller', 'buyer');
CREATE TYPE shop_status AS ENUM ('pending', 'active', 'blocked');

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role user_role NOT NULL DEFAULT 'buyer',
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  phone text UNIQUE CHECK (phone ~ '^\\+993[1-9][0-9]{7}$'),
  email text CHECK (char_length(email) <= 254),
  google_id text UNIQUE,
  password_hash text,
  must_change_password boolean NOT NULL DEFAULT false,
  locale text NOT NULL DEFAULT 'ru' CHECK (locale IN ('ru', 'tk')),
  is_blocked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_can_sign_in CHECK (phone IS NOT NULL OR google_id IS NOT NULL)
);

CREATE TABLE shops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  logo text,
  description text,
  address text,
  phone text,
  status shop_status NOT NULL DEFAULT 'pending',
  subscription_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_hash text NOT NULL UNIQUE,
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  seller_name text NOT NULL CHECK (char_length(seller_name) BETWEEN 1 AND 80),
  seller_phone text,
  created_by uuid NOT NULL REFERENCES users(id),
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  used_by uuid REFERENCES users(id),
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_hash text NOT NULL,
  prev_refresh_hash text,
  rotated_at timestamptz,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz
);
CREATE INDEX sessions_active_by_user ON sessions (user_id) WHERE revoked_at IS NULL;

CREATE TABLE audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text,
  target_id text,
  meta jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_log_by_time ON audit_log (created_at DESC);
`,
  },
];
