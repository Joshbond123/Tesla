<?php
$uri = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '/');
if (strpos($uri, '/api') === 0) {
  require __DIR__ . '/api/index.php';
  return true;
}
$file = __DIR__ . $uri;
if ($uri !== '/' && is_file($file)) return false;
if ($uri === '/' || $uri === '') { readfile(__DIR__ . '/index.html'); return true; }
if (is_file($file . '.html')) { readfile($file . '.html'); return true; }
http_response_code(404); echo 'Not found'; return true;
