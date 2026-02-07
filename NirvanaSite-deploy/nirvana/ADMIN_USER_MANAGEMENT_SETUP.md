# Admin User Management Setup (Superadmin)

This project now includes:
- Superadmin UI: `/admin/admins`
- Edge Function: `supabase/functions/admin-user-management`

## Important security note
Existing passwords cannot be viewed in Supabase (by design).  
You can create users with a password and reset/update passwords, but not read current passwords.

## 1) Run SQL first
In Supabase SQL Editor, run:
- `supabase_schema.sql` (latest in repo)

This creates/updates:
- `admin_users` with role support: `owner`, `superadmin`, `editor`
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

## 3) Seed your superadmin role
Use your auth user ID:

```sql
insert into public.admin_users (user_id, role)
values ('<YOUR_USER_ID>', 'superadmin')
on conflict (user_id) do update
set role = excluded.role;
```

## 4) Use Admin panel
- Go to `/admin/admins`
- Create admins, change email/role, reset password, delete admins.
