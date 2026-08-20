<?php
/**
 * Copy to config.php and fill in InfinityFree MySQL credentials
 * (from the control panel → MySQL Databases).
 */
return [
  'db_host' => 'sqlXXX.infinityfree.com',
  'db_name' => 'if0_XXXX_tesla',
  'db_user' => 'if0_XXXX',
  'db_pass' => 'YOUR_PASSWORD',
  'db_charset' => 'utf8mb4',
  // Public site URL without trailing slash (used in emails / absolute image URLs)
  'public_base_url' => 'https://your-domain.infinityfreeapp.com',
  // Optional external email API (InfinityFree blocks mail()). Leave empty to skip email.
  'resend_api_key' => '',
  'mail_from' => 'noreply@your-domain.com',
];
