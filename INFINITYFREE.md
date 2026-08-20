# Deploying Tesla Award on InfinityFree (PHP + MySQL)

## 1. Create MySQL database
1. InfinityFree control panel → **MySQL Databases** → create a database.
2. Note: host, database name, username, password.

## 2. Import schema
1. Open **phpMyAdmin**.
2. Select your database.
3. **Import** the file `database.sql` from this repository.

## 3. Upload website files
Upload the contents of the `docs/` folder to `htdocs/` (or your domain root), including:
- All HTML/CSS/JS/assets
- `api/` (PHP backend)
- `uploads/` (empty folders for proofs/logos)
- `.htaccess`

## 4. Configure database
Edit `api/config.php` (or copy from `api/config.sample.php`):

```php
return [
  'db_host' => 'sqlXXX.infinityfree.com',
  'db_name' => 'if0_XXXX_tesla',
  'db_user' => 'if0_XXXX',
  'db_pass' => 'YOUR_PASSWORD',
  'db_charset' => 'utf8mb4',
  'public_base_url' => 'https://your-subdomain.infinityfreeapp.com',
  'resend_api_key' => '', // optional external email API
  'mail_from' => 'noreply@your-domain.com',
];
```

## 5. Permissions
Ensure `uploads/proofs` and `uploads/logos` are writable (755 or 775).

## 6. Test
- Visit `https://your-site/api/health` → `{"ok":true,"db":"mysql"}`
- Admin panel → login with password `admin123` (change immediately)
- Place a test order and upload a payment proof (images save under `uploads/proofs/`)

## Notes
- InfinityFree does **not** run Node/Deno — this PHP API replaces Supabase Edge Functions.
- Outbound email is often blocked; use Resend/SendGrid API keys in config if needed.
- Default admin password hash is SHA-256 of `admin123`.
