# Project Guidelines & Rules

## Database Schema & Migrations
- **Supabase Schema Rule**: The user only runs `supabase_schema.sql` repeatedly in the Supabase SQL Editor. 
- Do NOT place database schema changes, table definitions, or RPC stored procedure updates solely in separate migration files (e.g. `supabase/migrations/*.sql`).
- **ALWAYS** update `supabase_schema.sql` directly for any database changes, new tables, or updated functions (e.g. `apply_page_metadata_approval`, `gen_random_uuid`, etc.).
- Ensure all functions and schemas in `supabase_schema.sql` are idempotent (`CREATE OR REPLACE FUNCTION`, `CREATE TABLE IF NOT EXISTS`, etc.).
