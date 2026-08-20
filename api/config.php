<?php
/**
 * Local / InfinityFree database configuration.
 * On InfinityFree: edit these values to match your MySQL panel.
 */
return [
  'db_host' => getenv('TESLA_DB_HOST') ?: '127.0.0.1',
  'db_name' => getenv('TESLA_DB_NAME') ?: 'tesla_award',
  'db_user' => getenv('TESLA_DB_USER') ?: 'root',
  'db_pass' => getenv('TESLA_DB_PASS') ?: '',
  'db_charset' => 'utf8mb4',
  'public_base_url' => getenv('TESLA_PUBLIC_URL') ?: '',
  'resend_api_key' => getenv('TESLA_RESEND_KEY') ?: '',
  'mail_from' => getenv('TESLA_MAIL_FROM') ?: 'noreply@localhost',
];
