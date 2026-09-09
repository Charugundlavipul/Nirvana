# Employee HR and Payroll Portal Setup

The HR portal is available under the existing `/admin` login:

- Everyone: `My Profile`, `Leave`, staff directory, notifications, and personal paystubs.
- Owners: `People` and `Payroll`.
- Admins retain website-content approval access but have no employee account-management or password-reset access.

## 1. Apply the database schema

Run the complete `supabase_schema.sql` in the Supabase SQL Editor. It is idempotent and performs the live role conversion:

- `superadmin` to `admin`
- `editor`/`viewer` to `employee`

It also creates employee, leave, payroll, notification, audit, and private paystub-storage records and policies.

## 2. Configure bank-data encryption

Set `HR_DATA_ENCRYPTION_KEY` in the app's server environment to a cryptographically random 32-byte value encoded as base64. Never prefix it with `NEXT_PUBLIC_` or expose it to browser code.

PowerShell example for generating a value:

```powershell
$bytes = New-Object byte[] 32
$rng = [Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
[Convert]::ToBase64String($bytes)
$rng.Dispose()
```

Optionally set `PAYSTUB_COMPANY_NAME`; it defaults to `Nirvana Luxury Vacations`.

## 3. Deploy account management

Deploy the updated owner-only Supabase Edge Function:

```bash
supabase functions deploy admin-user-management
```

The function still requires `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` in its Supabase function environment.

## 4. Deploy and verify

Deploy the Next.js application after the schema and function. Sign in as an owner and complete each backfilled profile, salary, leave allowance, and any banking information. Verify an admin account can review website content but cannot open `People`, `Payroll`, another employee's private profile, or reset a password.

Payroll values and taxes are owner-entered records. This version does not calculate statutory taxes, file tax forms, or initiate bank transfers.

Salary records contain annual fixed salary, pay frequency, variable pay, variable-pay frequency, and an employee-visible salary note. Monthly variable pay is added as a separate paystub line for each month-end contained in the payroll period. Yearly variable pay is added only when the payroll period contains December 31.

Each payroll run displays the full active employee roster as collapsible cards. Draft cards show whether an employee is ready, already added, has unsaved changes, or is missing salary configuration. **Save entire draft** writes every active employee in one request, and a run cannot be finalized until every active employee has a saved paystub.
