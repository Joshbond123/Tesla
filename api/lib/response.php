<?php
function cors_headers(): void {
  header('Access-Control-Allow-Origin: *');
  header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
  header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Admin-Token, apikey, x-client-info');
  header('Access-Control-Max-Age: 86400');
}
function json_out($data, int $code = 200): void {
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  cors_headers();
  echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}
function body_json(): array {
  $raw = file_get_contents('php://input');
  if ($raw === false || $raw === '') return [];
  $d = json_decode($raw, true);
  return is_array($d) ? $d : [];
}
function req_method(): string {
  return strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
}
