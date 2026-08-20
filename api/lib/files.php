<?php
function save_data_url_image(?string $dataUrl, string $subdir = 'proofs'): ?string {
  if (!$dataUrl || !is_string($dataUrl)) return null;
  $dataUrl = trim($dataUrl);
  if ($dataUrl === '') return null;
  if (stripos($dataUrl, 'data:') !== 0) {
    if (preg_match('#^https?://#i', $dataUrl) || strpos($dataUrl, 'uploads/') === 0 || strpos($dataUrl, '/') === 0) return $dataUrl;
  }
  if (!preg_match('#^data:image/([a-zA-Z0-9+.-]+);base64,(.+)$#s', $dataUrl, $m)) {
    $bin = base64_decode($dataUrl, true);
    if ($bin === false) return null;
    $ext = 'png';
  } else {
    $ext = strtolower($m[1]);
    if ($ext === 'jpeg') $ext = 'jpg';
    if (!in_array($ext, ['png','jpg','gif','webp','svg+xml'], true)) $ext = 'png';
    if ($ext === 'svg+xml') $ext = 'svg';
    $bin = base64_decode($m[2], true);
    if ($bin === false) return null;
  }
  if (strlen($bin) > 8 * 1024 * 1024) return null;
  $dir = dirname(__DIR__, 2) . '/uploads/' . $subdir;
  if (!is_dir($dir)) @mkdir($dir, 0755, true);
  $name = date('Ymd_His') . '_' . bin2hex(random_bytes(6)) . '.' . $ext;
  $full = $dir . '/' . $name;
  if (file_put_contents($full, $bin) === false) return null;
  return 'uploads/' . $subdir . '/' . $name;
}
function public_url(string $relative): string {
  $cfg = require __DIR__ . '/../config.php';
  $base = rtrim($cfg['public_base_url'] ?? '', '/');
  if ($base === '') return $relative;
  return $base . '/' . ltrim($relative, '/');
}
