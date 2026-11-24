-- Fixture E2E (HP-QA-03): tenant 9001 con un EMPLOYEE, una tienda y un
-- producto conocidos. Idempotente — corre cada vez antes de playwright.
-- Uso: psql -h localhost -p 5433 -U store -d storedb -f e2e/seed.sql
--   o:  docker exec -i store-be-postgres-1 psql -U store -d storedb < e2e/seed.sql
--
-- Password bcrypt de "e2e-super-secret" (coste 10).
BEGIN;

INSERT INTO clients (id, name, max_stores, max_pos_per_store,
    max_kiosks_per_store, currency, tax_rate, token_price, timezone,
    active, created_at)
VALUES (9001, 'E2E Café', 5, 5, 5, 'MXN', 16.00, 10.00,
    'America/Mexico_City', true, now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO client_modules (client_id, module) VALUES
    (9001, 'CATALOG'), (9001, 'POS'), (9001, 'KDS'),
    (9001, 'TICKETS'), (9001, 'TOKENS'), (9001, 'REPORTS')
ON CONFLICT DO NOTHING;

INSERT INTO stores (id, client_id, name, business_type, active, created_at)
VALUES (9001, 9001, 'E2E Store', 'RESTAURANT', true, now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, client_id, name, email, password, role, active,
    token_version, created_at)
VALUES (9001, 9001, 'E2E Caja', 'e2e@sac.test',
    '$2b$10$Iq8vInsVV5rZrO/NQgH.AugxSTs8/qX5WVGKufxvQaZsoq6nAYTka',
    'EMPLOYEE', true, 0, now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_stores (user_id, store_id) VALUES (9001, 9001)
ON CONFLICT DO NOTHING;

INSERT INTO categories (id, name, active) VALUES (9001, 'E2E Comida', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO category_stores (category_id, store_id) VALUES (9001, 9001)
ON CONFLICT DO NOTHING;

INSERT INTO products (id, category_id, name, price, active, sold_out,
    token_cost)
VALUES (9001, 9001, 'E2E Tacos', 50.00, true, false, 0)
ON CONFLICT (id) DO NOTHING;

COMMIT;
