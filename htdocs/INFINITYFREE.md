# InfinityFree upload guide (fix the "No index file" error)

## Correct htdocs layout

Your **htdocs** folder must look like this (index at the **top level**):

```text
htdocs/
  index.html          ← required
  index.php           ← required (this repo includes it)
  admin.html
  payment.html
  api/
  assets/
  css/
  js/
  uploads/
  ...
```

## Wrong layout (causes the error)

```text
htdocs/
  Tesla-main/           ← DO NOT leave this extra folder
    docs/
      index.html        ← too deep — server never finds it
```

or:

```text
htdocs/
  docs/
    index.html          ← still wrong — one folder too deep
```

## How to upload correctly

1. Download: https://github.com/Joshbond123/Tesla/archive/refs/heads/main.zip
2. Unzip on your computer.
3. Open the folder **`Tesla-main/docs`** (not `Tesla-main` itself).
4. Select **all files and folders inside `docs`** (index.html, index.php, api, assets, …).
5. Upload them **directly into** InfinityFree **htdocs** (use FileZilla FTP if the online manager fails).
6. Confirm in File Manager that you see `htdocs/index.html` and `htdocs/index.php`.

## Database

1. Create a MySQL database in the InfinityFree panel.
2. phpMyAdmin → Import → `database.sql` (from `docs/database.sql` or repo root).
3. Edit `htdocs/api/config.php` with your MySQL host, name, user, password.

## Test

- Home: `https://your-site.infinityfreeapp.com/`
- API: `https://your-site.infinityfreeapp.com/api/health`

## Notes

- Filenames are **case-sensitive** (`index.html` not `Index.HTML`).
- HTML/PHP files over **1 MB** are rejected — our `index.html` is under that limit.
- Prefer **FileZilla** over the browser file manager for large uploads.
