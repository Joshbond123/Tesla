<?php
function db(): PDO {
  static $pdo = null;
  if ($pdo instanceof PDO) return $pdo;
  $cfg = require __DIR__ . '/../config.php';
  $host = trim((string)($cfg['db_host'] ?? ''));
  $name = trim((string)($cfg['db_name'] ?? ''));
  $user = trim((string)($cfg['db_user'] ?? ''));
  $pass = (string)($cfg['db_pass'] ?? '');
  if ($host === '' || $name === '' || $user === '' ||
      strpos($host, 'XXX') !== false || strpos($name, 'XXXX') !== false ||
      strpos($user, 'XXXX') !== false || $pass === 'YOUR_PASSWORD') {
    throw new RuntimeException(
      'Database is not configured. Edit api/config.php with your InfinityFree MySQL host, database name, username, and password.'
    );
  }
  $dsn = sprintf(
    'mysql:host=%s;dbname=%s;charset=%s',
    $host,
    $name,
    $cfg['db_charset'] ?? 'utf8mb4'
  );
  $pdo = new PDO($dsn, $user, $pass, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
    PDO::ATTR_TIMEOUT => 5,
  ]);
  // Fail fast if server is unreachable
  $pdo->query('SELECT 1');
  return $pdo;
}

function uuid(): string {
  $d = random_bytes(16);
  $d[6] = chr((ord($d[6]) & 0x0f) | 0x40);
  $d[8] = chr((ord($d[8]) & 0x3f) | 0x80);
  return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($d), 4));
}

function json_decode_safe($v, $default = null) {
  if ($v === null || $v === '') return $default;
  if (is_array($v)) return $v;
  $d = json_decode((string)$v, true);
  return (json_last_error() === JSON_ERROR_NONE) ? $d : $default;
}

function setting_get(string $key, $default = null) {
  $st = db()->prepare('SELECT value FROM admin_settings WHERE `key` = ? LIMIT 1');
  $st->execute([$key]);
  $row = $st->fetch();
  if (!$row) return $default;
  $v = json_decode_safe($row['value'], $row['value']);
  return $v === null ? $default : $v;
}

function setting_set(string $key, $value): void {
  $json = is_string($value) ? $value : json_encode($value, JSON_UNESCAPED_UNICODE);
  $st = db()->prepare(
    'INSERT INTO admin_settings (`key`, value, updated_at) VALUES (?, ?, NOW())
     ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = NOW()'
  );
  $st->execute([$key, $json]);
}
