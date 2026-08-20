<?php
/**
 * InfinityFree DirectoryIndex fallback.
 * Ensures the site loads even when the panel checks for index.php first.
 */
header('Content-Type: text/html; charset=UTF-8');
$index = __DIR__ . '/index.html';
if (is_file($index)) {
  readfile($index);
  exit;
}
http_response_code(500);
echo 'index.html is missing. Upload the contents of the docs folder into htdocs.';
