<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/response.php';
function sha256_hex(string $text): string { return hash('sha256', $text); }
function admin_password_hash(): string {
  $v = setting_get('admin_password_hash', []);
  $h = is_array($v) ? ($v['hash'] ?? '') : '';
  if (is_string($h) && preg_match('/^[0-9a-f]{64}$/', $h)) return $h;
  return '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9';
}
function admin_token_from_request(): string {
  $xtok = trim($_SERVER['HTTP_X_ADMIN_TOKEN'] ?? '');
  if ($xtok !== '') return $xtok;
  $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? ($_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '');
  if (stripos($auth, 'Bearer ') === 0) {
    $bearer = trim(substr($auth, 7));
    if ($bearer !== '' && strpos($bearer, '.') === false) return $bearer;
  }
  return '';
}
function require_admin(): void {
  $token = admin_token_from_request();
  if ($token === '') json_out(['error' => 'Authentication required.'], 401);
  $st = db()->prepare('SELECT `key` FROM admin_settings WHERE `key` = ? LIMIT 1');
  $st->execute(['session_' . $token]);
  if (!$st->fetch()) json_out(['error' => 'Invalid or expired session.'], 401);
}
function hex_token(int $bytes = 32): string { return bin2hex(random_bytes($bytes)); }
