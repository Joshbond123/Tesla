# InfinityFree deployment

## File tree (correct)

After download, use the **`htdocs`** folder only:

```text
htdocs/
├── index.html          ← homepage (must be here)
├── index.php           ← InfinityFree index fallback
├── .htaccess
├── admin.html
├── payment.html
├── order-placed.html
├── payment-confirmation.html
├── api/
│   ├── index.php
│   ├── config.php      ← edit MySQL credentials
│   └── lib/
├── assets/
├── css/
├── js/
├── admin/
├── uploads/
├── vehicles/
└── database.sql
```

## Upload steps

1. Download: https://github.com/Joshbond123/Tesla/archive/refs/heads/main.zip
2. Unzip → open **`htdocs`**
3. Upload **all files inside `htdocs`** into InfinityFree **`htdocs`**
4. Confirm InfinityFree File Manager shows: `htdocs/index.html`

## Wrong

```text
htdocs/Tesla-main/htdocs/index.html   ✗
htdocs/docs/index.html                ✗
```

## Database

Import `htdocs/database.sql` in phpMyAdmin, then edit `htdocs/api/config.php`.
