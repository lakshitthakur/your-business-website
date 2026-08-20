-- Punjab Rentals: D1 Database Schema
-- Run with: wrangler d1 execute punjab-rentals-db --file=./schema.sql

-- ─── Vehicles (extended from existing cars table) ───
CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  vehicle_type TEXT NOT NULL CHECK(vehicle_type IN ('car', 'suv', 'van', 'truck')),
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL,
  registration TEXT UNIQUE,
  image_path TEXT,
  description TEXT,
  weekly_price REAL DEFAULT 0,
  bond REAL DEFAULT 0,
  km_allowance INTEGER DEFAULT 0,
  extra_km_rate REAL DEFAULT 0,
  excess_amount REAL DEFAULT 0,
  clearance TEXT,
  roadside_cover INTEGER DEFAULT 1,
  status TEXT DEFAULT 'Available' CHECK(status IN ('Available', 'Reserved', 'Active', 'Maintenance', 'Unavailable')),
  available INTEGER DEFAULT 1,
  current_renter_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_vehicles_registration ON vehicles(registration);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);

-- ─── Customers ───
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  dob TEXT,
  licence_number TEXT,
  licence_expiry TEXT,
  licence_state TEXT,
  licence_country TEXT DEFAULT 'Australia',
  residential_address TEXT,
  suburb TEXT,
  state TEXT,
  postcode TEXT,
  parking_address TEXT,
  emergency_contact_name TEXT,
  emergency_contact_relationship TEXT,
  emergency_contact_phone TEXT,
  entity_name TEXT,
  entity_abn TEXT,
  entity_type TEXT,
  authorised_person TEXT,
  authorised_position TEXT,
  entity_email TEXT,
  entity_phone TEXT,
  entity_address TEXT,
  entity_licence_number TEXT,
  entity_licence_expiry TEXT,
  entity_licence_state TEXT,
  entity_licence_country TEXT DEFAULT 'Australia',
  is_director INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

-- ─── Rental Agreements ───
CREATE TABLE IF NOT EXISTS rental_agreements (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  agreement_no TEXT UNIQUE NOT NULL,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  vehicle_id TEXT REFERENCES vehicles(id),
  hire_type TEXT NOT NULL DEFAULT 'individual' CHECK(hire_type IN ('individual', 'business')),
  status TEXT NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending', 'Approved', 'Active', 'Return Requested', 'Completed', 'Rejected', 'Cancelled')),
  rental_start TEXT,
  rental_end TEXT,
  return_date TEXT,
  rental_amount REAL NOT NULL DEFAULT 0,
  rental_cycle TEXT NOT NULL DEFAULT 'weekly',
  payment_day INTEGER DEFAULT 1,
  bond REAL DEFAULT 0,
  km_allowance INTEGER DEFAULT 0,
  extra_km_rate REAL DEFAULT 0,
  pickup_odometer INTEGER,
  return_odometer INTEGER,
  return_fuel_level TEXT,
  return_damage TEXT,
  return_cleaning TEXT,
  return_missing_items TEXT,
  return_notes TEXT,
  return_inspection_by TEXT,
  total_paid REAL DEFAULT 0,
  outstanding REAL DEFAULT 0,
  bond_status TEXT DEFAULT 'held' CHECK(bond_status IN ('held', 'refunded', 'partially_refunded', 'forfeited')),
  bond_deductions REAL DEFAULT 0,
  deposit REAL DEFAULT 0,
  amount_due_pickup REAL DEFAULT 0,
  payment_method TEXT,
  payment_notes TEXT,
  insurance_age_category TEXT,
  standard_excess REAL,
  custom_excess REAL,
  total_loss_excess REAL,
  terms_version TEXT DEFAULT 'v1',
  terms_accepted_at TEXT,
  terms_accepted INTEGER DEFAULT 0,
  agreement_version TEXT DEFAULT 'v1',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_agreements_customer ON rental_agreements(customer_id);
CREATE INDEX IF NOT EXISTS idx_agreements_vehicle ON rental_agreements(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_agreements_status ON rental_agreements(status);
CREATE INDEX IF NOT EXISTS idx_agreements_agreement_no ON rental_agreements(agreement_no);

-- ─── Agreement Terms (accepted T&C clauses) ───
CREATE TABLE IF NOT EXISTS agreement_terms (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  agreement_id TEXT NOT NULL REFERENCES rental_agreements(id) ON DELETE CASCADE,
  clause_key TEXT NOT NULL,
  clause_label TEXT,
  accepted INTEGER NOT NULL DEFAULT 0,
  accepted_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_terms_agreement ON agreement_terms(agreement_id);

-- ─── Signatures ───
CREATE TABLE IF NOT EXISTS signatures (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  agreement_id TEXT NOT NULL REFERENCES rental_agreements(id) ON DELETE CASCADE,
  signer_name TEXT NOT NULL,
  signature_data TEXT NOT NULL,
  signed_at TEXT NOT NULL DEFAULT (datetime('now')),
  agreement_version TEXT,
  terms_version TEXT
);

CREATE INDEX IF NOT EXISTS idx_signatures_agreement ON signatures(agreement_id);

-- ─── Payments ───
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  agreement_id TEXT NOT NULL REFERENCES rental_agreements(id) ON DELETE CASCADE,
  period_label TEXT,
  due_date TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  paid_amount REAL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending', 'Paid', 'Partially Paid', 'Overdue', 'Waived')),
  payment_date TEXT,
  payment_method TEXT,
  transaction_ref TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_payments_agreement ON payments(agreement_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_due_date ON payments(due_date);

-- ─── Charges (additional fees) ───
CREATE TABLE IF NOT EXISTS charges (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  agreement_id TEXT NOT NULL REFERENCES rental_agreements(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  charge_type TEXT DEFAULT 'admin',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_charges_agreement ON charges(agreement_id);

-- ─── Inspections ───
CREATE TABLE IF NOT EXISTS inspections (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  agreement_id TEXT NOT NULL REFERENCES rental_agreements(id) ON DELETE CASCADE,
  inspection_type TEXT NOT NULL DEFAULT 'return',
  odometer INTEGER,
  fuel_level TEXT,
  damage TEXT,
  cleaning TEXT,
  missing_items TEXT,
  notes TEXT,
  inspected_by TEXT,
  inspected_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_inspections_agreement ON inspections(agreement_id);

-- ─── Notes ───
CREATE TABLE IF NOT EXISTS agreement_notes (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  agreement_id TEXT NOT NULL REFERENCES rental_agreements(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_by TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_notes_agreement ON agreement_notes(agreement_id);

-- ─── Audit Logs ───
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  details TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

-- ─── Settings (insurance config, etc.) ───
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO settings (key, value) VALUES
  ('insurance', '{"standard_excess": 2000, "custom_excess": 3000, "total_loss_excess": 5000, "age_categories": {"under_25": 3000, "25_to_70": 2000, "over_70": 4000}}'),
  ('terms_version', '"v1"'),
  ('agreement_version', '"v1"');

-- ─── Agreement Counter (for generating PR-YYYY-NNNNNN) ───
CREATE TABLE IF NOT EXISTS agreement_counter (
  year INTEGER PRIMARY KEY,
  seq INTEGER NOT NULL DEFAULT 0
);

-- ─── Admin Users (simple auth for admin portal) ───
CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  last_login TEXT
);

CREATE INDEX IF NOT EXISTS idx_admin_email ON admin_users(email);

-- ─── Triggers for updated_at ───
CREATE TRIGGER IF NOT EXISTS trg_vehicles_updated AFTER UPDATE ON vehicles
BEGIN UPDATE vehicles SET updated_at = datetime('now') WHERE id = NEW.id; END;

CREATE TRIGGER IF NOT EXISTS trg_customers_updated AFTER UPDATE ON customers
BEGIN UPDATE customers SET updated_at = datetime('now') WHERE id = NEW.id; END;

CREATE TRIGGER IF NOT EXISTS trg_agreements_updated AFTER UPDATE ON rental_agreements
BEGIN UPDATE rental_agreements SET updated_at = datetime('now') WHERE id = NEW.id; END;

CREATE TRIGGER IF NOT EXISTS trg_payments_updated AFTER UPDATE ON payments
BEGIN UPDATE payments SET updated_at = datetime('now') WHERE id = NEW.id; END;


