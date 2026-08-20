<?php
/**
 * Tesla Award API — PHP/MySQL (InfinityFree compatible)
 * Routes mirror the former Supabase Edge Function /api/*
 */
declare(strict_types=1);

require_once __DIR__ . '/lib/response.php';
require_once __DIR__ . '/lib/db.php';
require_once __DIR__ . '/lib/auth.php';
require_once __DIR__ . '/lib/files.php';

cors_headers();
if (req_method() === 'OPTIONS') {
  http_response_code(204);
  exit;
}

// Resolve path: /api/xxx or /api/index.php/xxx
$uri = $_SERVER['REQUEST_URI'] ?? '/';
$path = parse_url($uri, PHP_URL_PATH) ?: '/';
// Strip base directories
$path = preg_replace('#^.*/api(?:/index\.php)?#', '', $path) ?: '/';
if ($path === '' || $path[0] !== '/') $path = '/' . $path;
$method = req_method();

try {
  route($method, $path);
} catch (Throwable $e) {
  error_log('API error: ' . $e->getMessage());
  json_out(['error' => 'Server error', 'detail' => $e->getMessage()], 500);
}

function route(string $method, string $path) {
  // Health
  if ($path === '/health' && $method === 'GET') {
    try { db()->query('SELECT 1'); json_out(['ok' => true, 'db' => 'mysql']); }
    catch (Throwable $e) { json_out(['ok' => false, 'error' => $e->getMessage()], 500); }
    return;
  }

  // Public settings
  if ($path === '/delivery-fees' && $method === 'GET') { handle_delivery_fees(); return; }
  if ($path === '/floating-contact-settings' && $method === 'GET') { handle_floating_contact_public(); return; }
  if ($path === '/whatsapp-settings' && $method === 'GET') { handle_whatsapp_public(); return; }
  if ($path === '/payment-methods' && $method === 'GET') { handle_payment_methods_public(); return; }

  // Auth / entry
  if ($path === '/entry' && $method === 'POST') { handle_entry(); return; }
  if ($path === '/login' && $method === 'POST') { handle_login(); return; }
  if ($path === '/verify' && $method === 'GET') { handle_verify(); return; }
  if ($path === '/session' && $method === 'GET') { handle_session(); return; }
  if ($path === '/order' && $method === 'POST') { handle_order(); return; }
  if ($path === '/payment/submit' && $method === 'POST') { handle_payment_submit(); return; }
  if ($path === '/payment-proof' && $method === 'POST') { handle_payment_submit(); return; }
  if ($path === '/payment/status' && $method === 'GET') { handle_payment_status(); return; }
  if ($path === '/resend' && $method === 'POST') { handle_resend(); return; }

  // Admin auth
  if ($path === '/admin/auth' && $method === 'POST') { handle_admin_auth(); return; }
  if ($path === '/admin/change-password' && $method === 'POST') { require_admin(); handle_admin_change_password(); return; }

  // Admin data
  if ($path === '/admin/stats' && $method === 'GET') { require_admin(); handle_admin_stats(); return; }
  if ($path === '/admin/users' && $method === 'GET') { require_admin(); handle_admin_users(); return; }
  if ($path === '/admin/users/delete' && $method === 'POST') { require_admin(); handle_admin_delete_user(); return; }
  if ($path === '/admin/orders' && $method === 'GET') { require_admin(); handle_admin_orders(); return; }
  if (preg_match('#^/admin/orders/([^/]+)$#', $path, $m) && $method === 'GET') { require_admin(); handle_admin_order_detail(urldecode($m[1])); return; }
  if (preg_match('#^/admin/orders/([^/]+)/status$#', $path, $m) && $method === 'PUT') { require_admin(); handle_admin_order_status(urldecode($m[1])); }
  if ($path === '/admin/payment-methods' && $method === 'GET') { require_admin(); handle_admin_payment_methods(); return; }
  if ($path === '/admin/payment-methods' && $method === 'POST') { require_admin(); handle_admin_save_payment_methods(); return; }
  if ($path === '/admin/payment-methods/upsert' && $method === 'POST') { require_admin(); handle_admin_upsert_payment_method(); return; }
  if (preg_match('#^/admin/payment-methods/([^/]+)$#', $path, $m) && $method === 'DELETE') { require_admin(); handle_admin_delete_payment_method(urldecode($m[1])); }
  if ($path === '/admin/payment-proofs' && $method === 'GET') { require_admin(); handle_admin_proofs_list(); return; }
  if (preg_match('#^/admin/payment-proofs/([^/]+)$#', $path, $m) && $method === 'GET') { require_admin(); handle_admin_proof_detail(urldecode($m[1])); }
  if (preg_match('#^/admin/payment-proofs/([^/]+)/thumb$#', $path, $m) && $method === 'GET') { require_admin(); handle_admin_proof_thumb(urldecode($m[1])); }
  if ($path === '/admin/payment-proofs/approve' && $method === 'POST') { require_admin(); handle_admin_proof_review('approved'); return; }
  if ($path === '/admin/payment-proofs/reject' && $method === 'POST') { require_admin(); handle_admin_proof_review('rejected'); return; }
  if ($path === '/admin/settings' && $method === 'GET') { require_admin(); handle_admin_get_settings(); return; }
  if ($path === '/admin/settings' && $method === 'POST') { require_admin(); handle_admin_save_settings(); return; }
  if ($path === '/admin/settings/floating-contact' && $method === 'GET') { require_admin(); handle_admin_fc_get(); return; }
  if ($path === '/admin/settings/floating-contact' && $method === 'POST') { require_admin(); handle_admin_fc_save(); return; }
  if ($path === '/admin/settings/whatsapp' && $method === 'GET') { require_admin(); handle_admin_fc_get(); return; }
  if ($path === '/admin/settings/whatsapp' && $method === 'POST') { require_admin(); handle_admin_fc_save(); return; }

  // Push
  if ($path === '/admin/push/vapid-public-key' && $method === 'GET') { require_admin(); json_out(['publicKey' => '']); return; }
  if ($path === '/admin/push/status' && $method === 'GET') { require_admin(); handle_push_status(); return; }
  if ($path === '/admin/push/subscribe' && $method === 'POST') { require_admin(); handle_push_subscribe(); return; }
  if ($path === '/admin/push/unsubscribe' && $method === 'POST') { require_admin(); handle_push_unsubscribe(); return; }
  if ($path === '/admin/push/prefs' && $method === 'POST') { require_admin(); handle_push_prefs(); return; }
  if ($path === '/admin/push/test' && $method === 'POST') { require_admin(); json_out(['ok' => false, 'error' => 'Configure web-push on server to enable test']); return; }

  json_out(['error' => 'Not found', 'path' => $path], 404);
}

/* ─────────────── Helpers ─────────────── */

function normalize_pm_row(array $r): array {
  $config = json_decode_safe($r['config'] ?? null, []);
  if (!is_array($config)) $config = [];
  if (empty($config) && !empty($r['account_details'])) {
    $ad = json_decode_safe($r['account_details'], null);
    if (is_array($ad)) $config = $ad;
  }
  $slug = $r['slug'] ?: $r['id'];
  return [
    'id' => $slug,
    'dbId' => $r['id'],
    'name' => $r['display_name'] ?: $r['name'],
    'description' => $r['description'] ?? '',
    'type' => $r['type'] ?? 'wallet',
    'logo' => $r['logo_url'] ?? '',
    'enabled' => (bool)(int)$r['enabled'],
    'displayOrder' => (int)$r['sort_order'],
    'config' => $config,
    'lastUpdated' => $r['updated_at'] ?? $r['created_at'] ?? null,
  ];
}

/* ─────────────── Public ─────────────── */

function handle_delivery_fees(): void {
  $v = setting_get('delivery_fees', ['standard' => 299, 'express' => 399, 'currency' => 'USD']);
  json_out([
    'standard' => $v['standard'] ?? $v['standard_fee'] ?? 299,
    'express' => $v['express'] ?? $v['express_fee'] ?? 399,
    'currency' => $v['currency'] ?? 'USD',
    'standard_fee' => $v['standard'] ?? 299,
    'express_fee' => $v['express'] ?? 399,
  ]);
}

function handle_floating_contact_public(): void {
  $v = setting_get('floating_contact', ['enabled' => false]);
  json_out(['settings' => $v]);
}

function handle_whatsapp_public(): void {
  $v = setting_get('floating_contact', []);
  json_out(['settings' => $v]);
}

function handle_payment_methods_public(): void {
  $st = db()->query('SELECT * FROM payment_methods WHERE enabled = 1 ORDER BY sort_order ASC');
  $rows = $st->fetchAll();
  $methods = array_map('normalize_pm_row', $rows);
  json_out(['methods' => $methods]);
}

function handle_entry(): void {
  $b = body_json();
  $email = strtolower(trim((string)($b['email'] ?? '')));
  $first = trim((string)($b['firstName'] ?? $b['first_name'] ?? ''));
  $last = trim((string)($b['lastName'] ?? $b['last_name'] ?? ''));
  $phone = trim((string)($b['phone'] ?? ''));
  if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    json_out(['error' => 'Valid email required'], 400);
  }

  $st = db()->prepare('SELECT * FROM giveaway_users WHERE email = ? LIMIT 1');
  $st->execute([$email]);
  $existing = $st->fetch();

  if ($existing) {
    // Already registered — issue a session so the user can continue (login-equivalent)
    $sess = hex_token(32);
    db()->prepare('INSERT INTO user_sessions (token, user_id, created_at, expires_at) VALUES (?,?,NOW(),DATE_ADD(NOW(), INTERVAL 30 DAY))')
      ->execute([$sess, $existing['id']]);
    json_out([
      'success' => true,
      'message' => 'Already registered',
      'alreadyRegistered' => true,
      'userId' => $existing['id'],
      'sessionToken' => $sess,
      'token' => $sess,
    ]);
  }

  $id = uuid();
  // Auto-verify on InfinityFree (email delivery is often blocked)
  $ins = db()->prepare(
    'INSERT INTO giveaway_users (id, email, phone, first_name, last_name, verification_token, verification_status, entry_count, created_at, verified_at)
     VALUES (?,?,?,?,?,?,?,?,NOW(),NOW())'
  );
  $ins->execute([$id, $email, $phone ?: null, $first ?: null, $last ?: null, null, 'verified', 1]);

  $sess = hex_token(32);
  db()->prepare('INSERT INTO user_sessions (token, user_id, created_at, expires_at) VALUES (?,?,NOW(),DATE_ADD(NOW(), INTERVAL 30 DAY))')
    ->execute([$sess, $id]);

  json_out([
    'success' => true,
    'userId' => $id,
    'sessionToken' => $sess,
    'token' => $sess,
  ]);
}

function handle_login(): void {
  $b = body_json();
  $email = strtolower(trim((string)($b['email'] ?? '')));
  if ($email === '') json_out(['error' => 'Email required'], 400);
  $st = db()->prepare('SELECT * FROM giveaway_users WHERE email = ? LIMIT 1');
  $st->execute([$email]);
  $user = $st->fetch();
  if (!$user) json_out(['error' => 'User not found'], 404);
  $tok = hex_token(32);
  $ins = db()->prepare('INSERT INTO user_sessions (token, user_id, created_at, expires_at) VALUES (?,?,NOW(),DATE_ADD(NOW(), INTERVAL 30 DAY))');
  $ins->execute([$tok, $user['id']]);
  json_out([
    'success' => true,
    'token' => $tok,
    'sessionToken' => $tok,
    'user' => [
      'id' => $user['id'],
      'email' => $user['email'],
      'firstName' => $user['first_name'],
      'lastName' => $user['last_name'],
      'phone' => $user['phone'],
      'status' => $user['verification_status'],
    ],
  ]);
}

function handle_verify(): void {
  $token = $_GET['token'] ?? '';
  if ($token === '') json_out(['error' => 'Token required'], 400);
  $st = db()->prepare('SELECT * FROM giveaway_users WHERE verification_token = ? LIMIT 1');
  $st->execute([$token]);
  $user = $st->fetch();
  if (!$user) json_out(['error' => 'Invalid token'], 400);
  db()->prepare('UPDATE giveaway_users SET verification_status = ?, verified_at = NOW(), verification_token = NULL WHERE id = ?')
    ->execute(['verified', $user['id']]);
  $sess = hex_token(32);
  db()->prepare('INSERT INTO user_sessions (token, user_id, created_at, expires_at) VALUES (?,?,NOW(),DATE_ADD(NOW(), INTERVAL 30 DAY))')
    ->execute([$sess, $user['id']]);
  json_out(['success' => true, 'token' => $sess]);
}

function session_user(): ?array {
  $token = $_GET['token'] ?? '';
  if ($token === '') {
    $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (stripos($auth, 'Bearer ') === 0) $token = trim(substr($auth, 7));
  }
  if ($token === '') return null;
  $st = db()->prepare('SELECT u.* FROM user_sessions s JOIN giveaway_users u ON u.id = s.user_id WHERE s.token = ? LIMIT 1');
  $st->execute([$token]);
  $u = $st->fetch();
  return $u ?: null;
}

function handle_session(): void {
  $user = session_user();
  if (!$user) json_out(['authenticated' => false, 'valid' => false]);

  // Latest order
  $st = db()->prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 1');
  $st->execute([$user['id']]);
  $order = $st->fetch();

  $hasOrder = (bool)$order;
  $hasPaymentProof = false;
  $paymentStatus = null;
  $proof = null;
  if ($order) {
    $pst = db()->prepare('SELECT * FROM payment_proofs WHERE order_id = ? OR user_id = ? ORDER BY created_at DESC LIMIT 1');
    $pst->execute([$order['order_id'], $user['id']]);
    $proof = $pst->fetch();
    if ($proof) {
      $hasPaymentProof = true;
      $paymentStatus = $proof['status'];
    }
  }

  $tracking = [];
  if ($order) {
    $tst = db()->prepare('SELECT stage, stage_order, timestamp, completed FROM tracking_data WHERE order_id = ? ORDER BY stage_order ASC');
    $tst->execute([$order['order_id']]);
    $tracking = $tst->fetchAll();
  }

  $car = null;
  $delivery = null;
  if ($order && $order['selected_car_id']) {
    $c = db()->prepare('SELECT data FROM selected_cars WHERE id = ?');
    $c->execute([$order['selected_car_id']]);
    $crow = $c->fetch();
    $car = $crow ? json_decode_safe($crow['data']) : null;
  }
  if ($order && $order['delivery_details_id']) {
    $d = db()->prepare('SELECT data FROM delivery_details WHERE id = ?');
    $d->execute([$order['delivery_details_id']]);
    $drow = $d->fetch();
    $delivery = $drow ? json_decode_safe($drow['data']) : null;
  }

  json_out([
    'authenticated' => true,
    'valid' => true,
    'user' => [
      'id' => $user['id'],
      'email' => $user['email'],
      'firstName' => $user['first_name'],
      'lastName' => $user['last_name'],
      'phone' => $user['phone'],
      'status' => $user['verification_status'],
    ],
    'hasOrder' => $hasOrder,
    'hasPaymentProof' => $hasPaymentProof,
    'paymentStatus' => $paymentStatus,
    'order' => $order ? [
      'orderId' => $order['order_id'],
      'trackingNumber' => $order['tracking_number'],
      'status' => $order['status'],
      'deliveryMethod' => json_decode_safe($order['delivery_method']),
      'paymentMethod' => json_decode_safe($order['payment_method']),
      'estimatedDelivery' => $order['estimated_delivery'],
      'orderDate' => $order['order_date'] ?: $order['created_at'],
      'selectedCar' => $car,
      'deliveryDetails' => $delivery,
      'tracking' => $tracking,
    ] : null,
    'paymentProof' => $proof ? [
      'id' => $proof['id'],
      'status' => $proof['status'],
      'paymentMethod' => $proof['payment_method'],
      'createdAt' => $proof['created_at'],
    ] : null,
  ]);
}

function handle_order(): void {
  $b = body_json();
  $user = session_user();
  $email = strtolower(trim((string)($b['email'] ?? ($user['email'] ?? ''))));
  if (!$user && $email) {
    $st = db()->prepare('SELECT * FROM giveaway_users WHERE email = ? LIMIT 1');
    $st->execute([$email]);
    $user = $st->fetch() ?: null;
  }
  if (!$user) json_out(['error' => 'User required'], 401);

  $carData = $b['selectedCar'] ?? $b['car'] ?? [];
  $delData = $b['deliveryDetails'] ?? $b['delivery'] ?? [];
  $method = $b['deliveryMethod'] ?? $b['method'] ?? [];
  $payMethod = $b['paymentMethod'] ?? null;

  $carId = uuid();
  db()->prepare('INSERT INTO selected_cars (id, user_id, data, created_at) VALUES (?,?,?,NOW())')
    ->execute([$carId, $user['id'], json_encode($carData)]);

  $delId = uuid();
  db()->prepare('INSERT INTO delivery_details (id, user_id, data, created_at) VALUES (?,?,?,NOW())')
    ->execute([$delId, $user['id'], json_encode($delData)]);

  $orderId = 'TSL-' . strtoupper(bin2hex(random_bytes(4)));
  $tracking = 'TRK-' . strtoupper(bin2hex(random_bytes(5)));
  $id = uuid();
  db()->prepare('INSERT INTO orders (id, order_id, tracking_number, user_id, selected_car_id, delivery_details_id, delivery_method, payment_method, status, order_date, estimated_delivery, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,NOW())')
    ->execute([
      $id, $orderId, $tracking, $user['id'], $carId, $delId,
      json_encode($method),
      json_encode($payMethod ?: ['id' => 'unknown', 'name' => 'Not specified']),
      'processing',
      date('Y-m-d H:i:s'),
      $b['estimatedDelivery'] ?? null,
    ]);

  // Timeline: Order Confirmed + Processing
  $stages = [
    ['Order Confirmed', 1, 1],
    ['Processing', 2, 1],
    ['Shipped', 3, 0],
    ['In Transit', 4, 0],
    ['Out for Delivery', 5, 0],
    ['Delivered', 6, 0],
  ];
  foreach ($stages as $s) {
    db()->prepare('INSERT INTO tracking_data (id, order_id, stage, stage_order, timestamp, completed, created_at) VALUES (?,?,?,?,?,?,NOW())')
      ->execute([uuid(), $orderId, $s[0], $s[1], $s[2] ? date('Y-m-d H:i:s') : null, $s[2]]);
  }

  json_out(['success' => true, 'orderId' => $orderId, 'trackingNumber' => $tracking, 'status' => 'processing']);
}

function handle_payment_submit(): void {
  $b = body_json();
  $user = session_user();
  $orderId = (string)($b['orderId'] ?? $b['order_id'] ?? '');
  $method = (string)($b['paymentMethod'] ?? $b['payment_method'] ?? $b['method'] ?? 'Payment');
  $amount = (string)($b['amount'] ?? '');

  $proofUrl = save_data_url_image($b['proofImage'] ?? $b['proof_url'] ?? $b['image'] ?? null, 'proofs');
  $proofBack = save_data_url_image($b['giftCardBack'] ?? $b['proof_back_url'] ?? $b['backImage'] ?? null, 'proofs');
  $urls = [];
  if ($proofUrl) $urls[] = $proofUrl;
  if ($proofBack) $urls[] = $proofBack;
  // Extra images
  if (!empty($b['proofImages']) && is_array($b['proofImages'])) {
    foreach ($b['proofImages'] as $img) {
      $p = save_data_url_image(is_string($img) ? $img : null, 'proofs');
      if ($p) $urls[] = $p;
    }
  }

  $cardDetails = $b['cardDetails'] ?? null;
  $adminNotes = null;
  if (is_array($cardDetails) && $cardDetails) {
    $adminNotes = json_encode(['_payment_details' => array_merge(['type' => 'card'], $cardDetails)]);
  }

  $id = uuid();
  $email = $user['email'] ?? ($b['email'] ?? null);
  $name = trim(($user['first_name'] ?? '') . ' ' . ($user['last_name'] ?? ''));

  db()->prepare('INSERT INTO payment_proofs (
    id, user_id, order_id, order_ref, payment_method, proof_url, proof_back_url, proof_urls, proof_type,
    image_count, amount, status, admin_notes, car_model, customer_name, customer_email, customer_phone,
    user_email, delivery_method, created_at
  ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW())')->execute([
    $id,
    $user['id'] ?? null,
    $orderId ?: null,
    $orderId ?: null,
    $method,
    $proofUrl,
    $proofBack,
    $urls ? json_encode($urls) : null,
    $proofUrl ? 'image' : ($cardDetails ? 'card' : 'image'),
    count($urls),
    $amount ?: null,
    'pending',
    $adminNotes,
    $b['carModel'] ?? $b['car_model'] ?? null,
    $name ?: ($b['customerName'] ?? null),
    $email,
    $user['phone'] ?? ($b['phone'] ?? null),
    $email,
    is_string($b['deliveryMethod'] ?? null) ? $b['deliveryMethod'] : json_encode($b['deliveryMethod'] ?? null),
  ]);

  // Update order payment method label if provided
  if ($orderId && $method) {
    db()->prepare('UPDATE orders SET payment_method = ?, updated_at = NOW() WHERE order_id = ?')
      ->execute([json_encode(['name' => $method, 'id' => $b['paymentMethodId'] ?? '']), $orderId]);
  }

  json_out(['success' => true, 'id' => $id, 'status' => 'pending']);
}

function handle_payment_status(): void {
  $orderId = $_GET['orderId'] ?? $_GET['order_id'] ?? '';
  $user = session_user();
  if ($orderId) {
    $st = db()->prepare('SELECT status, created_at, payment_method FROM payment_proofs WHERE order_id = ? ORDER BY created_at DESC LIMIT 1');
    $st->execute([$orderId]);
  } elseif ($user) {
    $st = db()->prepare('SELECT status, created_at, payment_method FROM payment_proofs WHERE user_id = ? ORDER BY created_at DESC LIMIT 1');
    $st->execute([$user['id']]);
  } else {
    json_out(['error' => 'orderId or session required'], 400);
  }
  $row = $st->fetch();
  if (!$row) json_out(['status' => null]);
  json_out(['status' => $row['status'], 'createdAt' => $row['created_at'], 'paymentMethod' => $row['payment_method']]);
}

function handle_resend(): void {
  json_out(['success' => true, 'message' => 'If email is configured, a message was sent.']);
}

/* ─────────────── Admin ─────────────── */

function handle_admin_auth(): void {
  $b = body_json();
  $pwd = (string)($b['password'] ?? '');
  if ($pwd === '') json_out(['error' => 'Password required'], 400);
  if (sha256_hex($pwd) !== admin_password_hash()) json_out(['error' => 'Invalid password'], 401);
  $token = hex_token(32);
  setting_set('session_' . $token, ['created' => date('c')]);
  json_out(['success' => true, 'token' => $token]);
}

function handle_admin_change_password(): void {
  $b = body_json();
  $current = (string)($b['current'] ?? $b['currentPassword'] ?? '');
  $neu = (string)($b['new'] ?? $b['newPassword'] ?? '');
  if (strlen($neu) < 8) json_out(['error' => 'New password must be at least 8 characters.'], 400);
  if (sha256_hex($current) !== admin_password_hash()) json_out(['error' => 'Current password is incorrect.'], 401);
  setting_set('admin_password_hash', ['hash' => sha256_hex($neu)]);
  $token = hex_token(32);
  setting_set('session_' . $token, ['created' => date('c'), 'afterPasswordChange' => true]);
  json_out(['success' => true, 'token' => $token]);
}

function handle_admin_stats(): void {
  $total = (int)db()->query('SELECT COUNT(*) FROM giveaway_users')->fetchColumn();
  $verified = (int)db()->query("SELECT COUNT(*) FROM giveaway_users WHERE verification_status = 'verified'")->fetchColumn();
  $pending = (int)db()->query("SELECT COUNT(*) FROM giveaway_users WHERE verification_status = 'pending'")->fetchColumn();
  $fees = setting_get('delivery_fees', ['standard' => 299]);
  json_out(['total' => $total, 'verified' => $verified, 'pending' => $pending, 'deliveryFee' => $fees['standard'] ?? 299]);
}

function handle_admin_users(): void {
  $rows = db()->query('SELECT id, auth_user_id, email, phone, first_name, last_name, verification_status, entry_count, created_at, verified_at FROM giveaway_users ORDER BY created_at DESC LIMIT 500')->fetchAll();
  json_out(['users' => $rows]);
}

function handle_admin_delete_user(): void {
  $b = body_json();
  $id = $b['id'] ?? null;
  $email = $b['email'] ?? null;
  if (!$id && $email) {
    $st = db()->prepare('SELECT id FROM giveaway_users WHERE email = ?');
    $st->execute([$email]);
    $id = ($st->fetch()['id'] ?? null);
  }
  if (!$id) json_out(['error' => 'User ID or email required'], 400);
  // Cascade cleanup
  $orders = db()->prepare('SELECT order_id FROM orders WHERE user_id = ?');
  $orders->execute([$id]);
  foreach ($orders->fetchAll() as $o) {
    db()->prepare('DELETE FROM tracking_data WHERE order_id = ?')->execute([$o['order_id']]);
  }
  db()->prepare('DELETE FROM payment_proofs WHERE user_id = ?')->execute([$id]);
  db()->prepare('DELETE FROM orders WHERE user_id = ?')->execute([$id]);
  db()->prepare('DELETE FROM selected_cars WHERE user_id = ?')->execute([$id]);
  db()->prepare('DELETE FROM delivery_details WHERE user_id = ?')->execute([$id]);
  db()->prepare('DELETE FROM user_sessions WHERE user_id = ?')->execute([$id]);
  db()->prepare('DELETE FROM giveaway_users WHERE id = ?')->execute([$id]);
  json_out(['success' => true]);
}

function handle_admin_orders(): void {
  $sql = 'SELECT o.*, u.email AS user_email, u.first_name, u.last_name, u.phone AS user_phone
          FROM orders o
          LEFT JOIN giveaway_users u ON u.id = o.user_id
          ORDER BY o.created_at DESC LIMIT 200';
  $rows = db()->query($sql)->fetchAll();
  $out = [];
  foreach ($rows as $o) {
    $out[] = [
      'id' => $o['id'],
      'order_id' => $o['order_id'],
      'tracking_number' => $o['tracking_number'],
      'status' => $o['status'],
      'user_id' => $o['user_id'],
      'user_email' => $o['user_email'],
      'user_name' => trim(($o['first_name'] ?? '') . ' ' . ($o['last_name'] ?? '')),
      'user_phone' => $o['user_phone'],
      'delivery_method' => json_decode_safe($o['delivery_method']),
      'payment_method' => json_decode_safe($o['payment_method']),
      'order_date' => $o['order_date'] ?: $o['created_at'],
      'created_at' => $o['created_at'],
      'estimated_delivery' => $o['estimated_delivery'],
    ];
  }
  json_out(['orders' => $out]);
}

function handle_admin_order_detail(string $orderId): void {
  $st = db()->prepare('SELECT o.*, u.email AS user_email, u.first_name, u.last_name, u.phone AS user_phone FROM orders o LEFT JOIN giveaway_users u ON u.id = o.user_id WHERE o.order_id = ? OR o.id = ? LIMIT 1');
  $st->execute([$orderId, $orderId]);
  $o = $st->fetch();
  if (!$o) json_out(['error' => 'Order not found'], 404);
  $track = db()->prepare('SELECT stage, stage_order, timestamp, completed FROM tracking_data WHERE order_id = ? ORDER BY stage_order');
  $track->execute([$o['order_id']]);
  $car = null;
  if ($o['selected_car_id']) {
    $c = db()->prepare('SELECT data FROM selected_cars WHERE id = ?');
    $c->execute([$o['selected_car_id']]);
    $crow = $c->fetch();
    $car = $crow ? json_decode_safe($crow['data']) : null;
  }
  $del = null;
  if ($o['delivery_details_id']) {
    $d = db()->prepare('SELECT data FROM delivery_details WHERE id = ?');
    $d->execute([$o['delivery_details_id']]);
    $drow = $d->fetch();
    $del = $drow ? json_decode_safe($drow['data']) : null;
  }
  json_out(['order' => array_merge($o, [
    'delivery_method' => json_decode_safe($o['delivery_method']),
    'payment_method' => json_decode_safe($o['payment_method']),
    'tracking' => $track->fetchAll(),
    'selected_car' => $car,
    'delivery_details' => $del,
    'user_name' => trim(($o['first_name'] ?? '') . ' ' . ($o['last_name'] ?? '')),
  ])]);
}

function handle_admin_order_status(string $orderId): void {
  $b = body_json();
  $stage = (string)($b['status'] ?? $b['stage'] ?? $b['delivery_stage'] ?? '');
  if ($stage === '') json_out(['error' => 'status required'], 400);
  $map = [
    'order confirmed' => 'processing',
    'processing' => 'processing',
    'shipped' => 'shipped',
    'in transit' => 'in_transit',
    'out for delivery' => 'out_for_delivery',
    'delivered' => 'delivered',
  ];
  $status = $map[strtolower($stage)] ?? strtolower(str_replace(' ', '_', $stage));
  db()->prepare('UPDATE orders SET status = ?, updated_at = NOW() WHERE order_id = ? OR id = ?')
    ->execute([$status, $orderId, $orderId]);

  // Update tracking timeline
  $stages = ['Order Confirmed','Processing','Shipped','In Transit','Out for Delivery','Delivered'];
  $idx = -1;
  foreach ($stages as $i => $s) {
    if (strcasecmp($s, $stage) === 0) { $idx = $i; break; }
  }
  if ($idx >= 0) {
    $ost = db()->prepare('SELECT order_id FROM orders WHERE order_id = ? OR id = ?');
    $ost->execute([$orderId, $orderId]);
    $oid = $ost->fetch()['order_id'] ?? $orderId;
    foreach ($stages as $i => $s) {
      $done = $i <= $idx ? 1 : 0;
      $ts = $done ? date('Y-m-d H:i:s') : null;
      $up = db()->prepare('UPDATE tracking_data SET completed = ?, timestamp = COALESCE(timestamp, ?) WHERE order_id = ? AND stage = ?');
      $up->execute([$done, $ts, $oid, $s]);
    }
  }
  json_out(['success' => true, 'status' => $status]);
}

function handle_admin_payment_methods(): void {
  $rows = db()->query('SELECT * FROM payment_methods ORDER BY sort_order ASC')->fetchAll();
  json_out(['methods' => array_map('normalize_pm_row', $rows)]);
}

function handle_admin_save_payment_methods(): void {
  $b = body_json();
  $methods = $b['methods'] ?? [];
  if (!is_array($methods)) json_out(['error' => 'methods array required'], 400);
  foreach ($methods as $m) {
    upsert_pm($m);
  }
  json_out(['success' => true]);
}

function handle_admin_upsert_payment_method(): void {
  $b = body_json();
  upsert_pm($b['method'] ?? $b);
  json_out(['success' => true]);
}

function upsert_pm(array $m): void {
  $slug = (string)($m['id'] ?? $m['slug'] ?? '');
  if ($slug === '') $slug = strtolower(preg_replace('/[^a-z0-9]+/i', '-', (string)($m['name'] ?? 'method')));
  $id = (string)($m['dbId'] ?? $m['uuid'] ?? '');
  // find existing by slug
  $st = db()->prepare('SELECT id FROM payment_methods WHERE slug = ? LIMIT 1');
  $st->execute([$slug]);
  $ex = $st->fetch();
  if ($ex) $id = $ex['id'];
  if ($id === '') $id = uuid();

  $config = $m['config'] ?? [];
  if (is_string($config)) $config = json_decode_safe($config, []);
  // Save QR/logo data URLs to files
  if (!empty($config['qrCode']) && is_string($config['qrCode']) && stripos($config['qrCode'], 'data:') === 0) {
    $p = save_data_url_image($config['qrCode'], 'logos');
    if ($p) $config['qrCode'] = $p;
  }
  $logo = $m['logo'] ?? $m['logo_url'] ?? '';
  if (is_string($logo) && stripos($logo, 'data:') === 0) {
    $p = save_data_url_image($logo, 'logos');
    if ($p) $logo = $p;
  }

  $sql = 'INSERT INTO payment_methods (id, slug, name, display_name, type, description, logo_url, sort_order, enabled, config, account_details, qr_code_url, payment_instructions, wallet_address, created_at, updated_at)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW(),NOW())
          ON DUPLICATE KEY UPDATE name=VALUES(name), display_name=VALUES(display_name), type=VALUES(type), description=VALUES(description),
          logo_url=VALUES(logo_url), sort_order=VALUES(sort_order), enabled=VALUES(enabled), config=VALUES(config), account_details=VALUES(account_details),
          qr_code_url=VALUES(qr_code_url), payment_instructions=VALUES(payment_instructions), wallet_address=VALUES(wallet_address), updated_at=NOW()';
  db()->prepare($sql)->execute([
    $id, $slug,
    $m['name'] ?? $slug,
    $m['name'] ?? $m['display_name'] ?? $slug,
    $m['type'] ?? 'wallet',
    $m['description'] ?? '',
    $logo,
    (int)($m['displayOrder'] ?? $m['sort_order'] ?? 99),
    !empty($m['enabled']) || ($m['enabled'] ?? true) === true ? 1 : 0,
    json_encode($config),
    json_encode($config),
    $config['qrCode'] ?? null,
    $config['instructions'] ?? null,
    $config['walletAddress'] ?? $config['cashtag'] ?? $config['email'] ?? null,
  ]);
}

function handle_admin_delete_payment_method(string $idOrSlug): void {
  db()->prepare('DELETE FROM payment_methods WHERE slug = ? OR id = ?')->execute([$idOrSlug, $idOrSlug]);
  json_out(['success' => true]);
}

function handle_admin_proofs_list(): void {
  $rows = db()->query('SELECT id, user_id, order_id, payment_method, proof_type, amount, status, admin_notes, reviewed_at, reviewed_by, car_model, customer_name, customer_email, customer_phone, delivery_method, created_at, user_email, order_ref, image_count FROM payment_proofs ORDER BY created_at DESC LIMIT 200')->fetchAll();
  $proofs = [];
  foreach ($rows as $p) {
    $proofs[] = [
      'id' => $p['id'],
      'order_id' => $p['order_id'],
      'user_id' => $p['user_id'],
      'user_name' => $p['customer_name'],
      'user_email' => $p['customer_email'] ?: $p['user_email'],
      'user_phone' => $p['customer_phone'],
      'payment_method' => $p['payment_method'],
      'amount' => $p['amount'],
      'status' => $p['status'],
      'admin_notes' => $p['admin_notes'],
      'car_model' => $p['car_model'],
      'delivery_method' => $p['delivery_method'],
      'created_at' => $p['created_at'],
      'reviewed_at' => $p['reviewed_at'],
      'reviewed_by' => $p['reviewed_by'],
      'proof_type' => $p['proof_type'],
      'has_image' => ((int)$p['image_count']) > 0,
    ];
  }
  json_out(['proofs' => $proofs]);
}

function handle_admin_proof_detail(string $id): void {
  $st = db()->prepare('SELECT * FROM payment_proofs WHERE id = ? LIMIT 1');
  $st->execute([$id]);
  $p = $st->fetch();
  if (!$p) json_out(['error' => 'Not found'], 404);
  $paymentDetails = null;
  if ($p['admin_notes']) {
    $notes = json_decode_safe($p['admin_notes']);
    if (is_array($notes) && isset($notes['_payment_details'])) {
      $paymentDetails = $notes['_payment_details'];
    }
  }
  json_out(['proof' => [
    'id' => $p['id'],
    'order_id' => $p['order_id'],
    'user_id' => $p['user_id'],
    'user_name' => $p['customer_name'],
    'user_email' => $p['customer_email'] ?: $p['user_email'],
    'user_phone' => $p['customer_phone'],
    'payment_method' => $p['payment_method'],
    'amount' => $p['amount'],
    'status' => $p['status'],
    'admin_notes' => $p['admin_notes'],
    'payment_details' => $paymentDetails,
    'proof_url' => $p['proof_url'],
    'proof_back_url' => $p['proof_back_url'],
    'proof_urls' => json_decode_safe($p['proof_urls'], []),
    'car_model' => $p['car_model'],
    'delivery_method' => $p['delivery_method'],
    'created_at' => $p['created_at'],
    'reviewed_at' => $p['reviewed_at'],
    'reviewed_by' => $p['reviewed_by'],
    'proof_type' => $p['proof_type'],
  ]]);
}

function handle_admin_proof_thumb(string $id): void {
  $st = db()->prepare('SELECT proof_url, proof_back_url, proof_urls FROM payment_proofs WHERE id = ? LIMIT 1');
  $st->execute([$id]);
  $p = $st->fetch();
  $url = $p['proof_url'] ?? '';
  if (!$url) $url = $p['proof_back_url'] ?? '';
  if (!$url && $p) {
    $urls = json_decode_safe($p['proof_urls'], []);
    if (is_array($urls) && $urls) $url = $urls[0];
  }
  json_out(['url' => $url ?: '', 'hasImage' => (bool)$url]);
}

function handle_admin_proof_review(string $status): void {
  $b = body_json();
  $id = (string)($b['id'] ?? $b['proofId'] ?? '');
  if ($id === '') json_out(['error' => 'id required'], 400);
  $notes = $b['notes'] ?? $b['admin_notes'] ?? null;
  db()->prepare('UPDATE payment_proofs SET status = ?, reviewed_at = NOW(), reviewed_by = ?, admin_notes = COALESCE(?, admin_notes) WHERE id = ?')
    ->execute([$status, 'admin', $notes, $id]);
  json_out(['success' => true, 'status' => $status]);
}

function handle_admin_get_settings(): void {
  $fees = setting_get('delivery_fees', ['standard' => 299, 'express' => 399, 'currency' => 'USD']);
  json_out([
    'standard_fee' => $fees['standard'] ?? 299,
    'express_fee' => $fees['express'] ?? 399,
    'currency' => $fees['currency'] ?? 'USD',
  ]);
}

function handle_admin_save_settings(): void {
  $b = body_json();
  $fees = setting_get('delivery_fees', ['standard' => 299, 'express' => 399, 'currency' => 'USD']);
  if (isset($b['standard_fee']) || isset($b['standard'])) $fees['standard'] = floatval($b['standard_fee'] ?? $b['standard']);
  if (isset($b['express_fee']) || isset($b['express'])) $fees['express'] = floatval($b['express_fee'] ?? $b['express']);
  if (!empty($b['currency'])) $fees['currency'] = $b['currency'];
  setting_set('delivery_fees', $fees);
  json_out(['success' => true, 'standard_fee' => $fees['standard'], 'express_fee' => $fees['express'], 'currency' => $fees['currency']]);
}

function handle_admin_fc_get(): void {
  json_out(['settings' => setting_get('floating_contact', ['enabled' => false])]);
}

function handle_admin_fc_save(): void {
  $b = body_json();
  $cur = setting_get('floating_contact', []);
  $next = array_merge(is_array($cur) ? $cur : [], $b);
  if (isset($b['settings']) && is_array($b['settings'])) $next = array_merge($next, $b['settings']);
  setting_set('floating_contact', $next);
  json_out(['success' => true, 'settings' => $next]);
}

function handle_push_status(): void {
  $prefs = setting_get('push_prefs', ['enabled' => true, 'newOrder' => true, 'paymentProof' => true]);
  $subs = setting_get('push_subscriptions', ['items' => []]);
  $items = $subs['items'] ?? [];
  json_out(['prefs' => $prefs, 'subscribed' => count($items) > 0, 'subscriptionCount' => count($items), 'vapidPublicKey' => '']);
}

function handle_push_subscribe(): void {
  $b = body_json();
  $subs = setting_get('push_subscriptions', ['items' => []]);
  $items = $subs['items'] ?? [];
  $endpoint = $b['endpoint'] ?? '';
  $items = array_values(array_filter($items, fn($s) => ($s['endpoint'] ?? '') !== $endpoint));
  $items[] = ['endpoint' => $endpoint, 'keys' => $b['keys'] ?? [], 'createdAt' => date('c')];
  setting_set('push_subscriptions', ['items' => array_slice($items, -20)]);
  json_out(['success' => true]);
}

function handle_push_unsubscribe(): void {
  $b = body_json();
  $subs = setting_get('push_subscriptions', ['items' => []]);
  $items = $subs['items'] ?? [];
  $endpoint = $b['endpoint'] ?? '';
  if ($endpoint) $items = array_values(array_filter($items, fn($s) => ($s['endpoint'] ?? '') !== $endpoint));
  else $items = [];
  setting_set('push_subscriptions', ['items' => $items]);
  json_out(['success' => true]);
}

function handle_push_prefs(): void {
  $b = body_json();
  $cur = setting_get('push_prefs', []);
  $next = array_merge(is_array($cur) ? $cur : [], $b);
  setting_set('push_prefs', $next);
  json_out(['success' => true, 'prefs' => $next]);
}
