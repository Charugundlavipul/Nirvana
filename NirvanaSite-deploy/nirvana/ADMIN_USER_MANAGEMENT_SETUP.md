# Employee Account Management Setup (Owner)

This project now includes:
- Owner-only People UI: `/admin/people`
- Edge Function: `supabase/functions/admin-user-management`

## Important security note
Existing passwords cannot be viewed in Supabase (by design).  
You can create users with a password and reset/update passwords, but not read current passwords.

## 1) Run SQL first
In Supabase SQL Editor, run:
- `supabase_schema.sql` (latest in repo)

This creates/updates:
- `admin_users` with role support: `owner`, `admin`, `employee`
- role policies and helper functions
- approval workflow tables/functions

## 2) Deploy the edge function
From project root:

```bash
supabase functions deploy admin-user-management
```

Ensure function environment has:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## 3) Seed your owner role
Use your auth user ID:

```sql
insert into public.admin_users (user_id, role)
values ('<YOUR_USER_ID>', 'owner')
on conflict (user_id) do update
set role = excluded.role;
```

## 4) Use Admin panel
- Go to `/admin/people`.
- Owners can create/deactivate accounts, change email/role, and reset passwords.
- Admins cannot manage accounts or reset another employee's password.
- Accounts with HR history are deactivated rather than deleted.
