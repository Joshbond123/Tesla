-- ============================================================
-- Tesla Award — MySQL / MariaDB schema (InfinityFree compatible)
-- Import this file in phpMyAdmin (Import → Choose file → Go)
-- File type must be .sql  — do NOT import index.html
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS tracking_data;
DROP TABLE IF EXISTS payment_proofs;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS selected_cars;
DROP TABLE IF EXISTS delivery_details;
DROP TABLE IF EXISTS user_sessions;
DROP TABLE IF EXISTS payment_methods;
DROP TABLE IF EXISTS giveaway_users;
DROP TABLE IF EXISTS admin_settings;

CREATE TABLE giveaway_users (
  id CHAR(36) NOT NULL,
  auth_user_id VARCHAR(64) DEFAULT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(64) DEFAULT NULL,
  first_name VARCHAR(120) DEFAULT NULL,
  last_name VARCHAR(120) DEFAULT NULL,
  verification_token VARCHAR(128) DEFAULT NULL,
  verification_status VARCHAR(32) NOT NULL DEFAULT 'pending',
  entry_count INT NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  verified_at DATETIME DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_giveaway_users_email (email),
  KEY idx_users_status (verification_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_sessions (
  token VARCHAR(128) NOT NULL,
  user_id CHAR(36) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME DEFAULT NULL,
  PRIMARY KEY (token),
  KEY idx_sessions_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE selected_cars (
  id CHAR(36) NOT NULL,
  user_id CHAR(36) DEFAULT NULL,
  data LONGTEXT DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_selected_cars_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE delivery_details (
  id CHAR(36) NOT NULL,
  user_id CHAR(36) DEFAULT NULL,
  data LONGTEXT DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_delivery_details_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE orders (
  id CHAR(36) NOT NULL,
  order_id VARCHAR(64) NOT NULL,
  tracking_number VARCHAR(64) DEFAULT NULL,
  user_id CHAR(36) DEFAULT NULL,
  selected_car_id CHAR(36) DEFAULT NULL,
  delivery_details_id CHAR(36) DEFAULT NULL,
  delivery_method LONGTEXT DEFAULT NULL,
  payment_method LONGTEXT DEFAULT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'processing',
  order_date DATETIME DEFAULT NULL,
  estimated_delivery VARCHAR(128) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_orders_order_id (order_id),
  KEY idx_orders_user (user_id),
  KEY idx_orders_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE tracking_data (
  id CHAR(36) NOT NULL,
  order_id VARCHAR(64) NOT NULL,
  stage VARCHAR(64) NOT NULL,
  stage_order INT NOT NULL DEFAULT 0,
  timestamp DATETIME DEFAULT NULL,
  completed TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_tracking_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE payment_methods (
  id CHAR(36) NOT NULL,
  slug VARCHAR(64) NOT NULL,
  name VARCHAR(120) NOT NULL,
  display_name VARCHAR(120) DEFAULT NULL,
  type VARCHAR(32) DEFAULT 'wallet',
  description TEXT,
  wallet_address TEXT,
  account_details LONGTEXT,
  qr_code_url TEXT,
  payment_instructions TEXT,
  logo_url TEXT,
  logo_id VARCHAR(64) DEFAULT NULL,
  icon_emoji VARCHAR(16) DEFAULT NULL,
  sort_order INT NOT NULL DEFAULT 99,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  config LONGTEXT DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_pm_slug (slug),
  KEY idx_pm_enabled (enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE payment_proofs (
  id CHAR(36) NOT NULL,
  user_id CHAR(36) DEFAULT NULL,
  order_id VARCHAR(64) DEFAULT NULL,
  order_ref VARCHAR(64) DEFAULT NULL,
  payment_method VARCHAR(120) DEFAULT NULL,
  proof_url VARCHAR(512) DEFAULT NULL,
  proof_back_url VARCHAR(512) DEFAULT NULL,
  proof_urls LONGTEXT DEFAULT NULL,
  proof_type VARCHAR(32) DEFAULT 'image',
  image_count INT NOT NULL DEFAULT 0,
  amount VARCHAR(64) DEFAULT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  reviewed_at DATETIME DEFAULT NULL,
  reviewed_by VARCHAR(120) DEFAULT NULL,
  car_model VARCHAR(120) DEFAULT NULL,
  customer_name VARCHAR(160) DEFAULT NULL,
  customer_email VARCHAR(255) DEFAULT NULL,
  customer_phone VARCHAR(64) DEFAULT NULL,
  user_email VARCHAR(255) DEFAULT NULL,
  delivery_method VARCHAR(120) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_pp_order (order_id),
  KEY idx_pp_status (status),
  KEY idx_pp_user (user_id),
  KEY idx_pp_email (customer_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE admin_settings (
  `key` VARCHAR(191) NOT NULL,
  value LONGTEXT DEFAULT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- Default admin password = admin123 (SHA-256)
INSERT INTO admin_settings (`key`, value) VALUES
('admin_password_hash', '{"hash":"240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9"}'),
('delivery_fees', '{"standard":299,"express":399,"currency":"USD"}'),
('push_prefs', '{"enabled":true,"newOrder":true,"paymentProof":true,"promptDismissed":false}'),
('push_subscriptions', '{"items":[]}'),
('floating_contact', '{"enabled":false,"whatsapp":{"phone":""},"telegram":{"username":""}}');

INSERT INTO payment_methods (id, slug, name, display_name, type, description, logo_url, sort_order, enabled, config, account_details, created_at) VALUES ('76f89fc1-24b8-48b5-b78a-bf46e0b242c3', 'paypal', 'PayPal', 'PayPal', 'wallet', '', '', 1, 1, '{"email": "", "instructions": "Pay via PayPal"}', '{"email": "", "instructions": "Pay via PayPal"}', NOW());
INSERT INTO payment_methods (id, slug, name, display_name, type, description, logo_url, sort_order, enabled, config, account_details, created_at) VALUES ('e746dc9f-2528-4267-9a34-ab68e5ff2a94', 'cashapp', 'Cash App', 'Cash App', 'wallet', '', '', 2, 1, '{"cashtag": "", "instructions": "Pay via Cash App"}', '{"cashtag": "", "instructions": "Pay via Cash App"}', NOW());
INSERT INTO payment_methods (id, slug, name, display_name, type, description, logo_url, sort_order, enabled, config, account_details, created_at) VALUES ('9b87123a-847e-4332-a283-23a86ddb9364', 'venmo', 'Venmo', 'Venmo', 'wallet', '', '', 3, 1, '{}', '{}', NOW());
INSERT INTO payment_methods (id, slug, name, display_name, type, description, logo_url, sort_order, enabled, config, account_details, created_at) VALUES ('656f7a2e-b4cb-4076-b73d-41d7ac4d7154', 'zelle', 'Zelle', 'Zelle', 'bank', '', '', 4, 1, '{}', '{}', NOW());
INSERT INTO payment_methods (id, slug, name, display_name, type, description, logo_url, sort_order, enabled, config, account_details, created_at) VALUES ('cd129ed7-548b-4435-9e81-0867c766c621', 'bitcoin', 'Bitcoin', 'Bitcoin', 'crypto', '', '', 5, 1, '{}', '{}', NOW());
INSERT INTO payment_methods (id, slug, name, display_name, type, description, logo_url, sort_order, enabled, config, account_details, created_at) VALUES ('6951d08a-78a8-4e43-adb9-3944ddfe6f79', 'ethereum', 'Ethereum', 'Ethereum', 'crypto', '', '', 6, 1, '{}', '{}', NOW());
INSERT INTO payment_methods (id, slug, name, display_name, type, description, logo_url, sort_order, enabled, config, account_details, created_at) VALUES ('bd97c614-f316-4f59-baa7-c82544b6b618', 'usdt-erc20', 'USDT (ERC-20)', 'USDT (ERC-20)', 'crypto', '', '', 7, 1, '{}', '{}', NOW());
INSERT INTO payment_methods (id, slug, name, display_name, type, description, logo_url, sort_order, enabled, config, account_details, created_at) VALUES ('27fb86f7-390d-4ed9-aeb6-e8c62d5aeb04', 'usdt-trc20', 'USDT (TRC-20)', 'USDT (TRC-20)', 'crypto', '', '', 8, 1, '{}', '{}', NOW());
INSERT INTO payment_methods (id, slug, name, display_name, type, description, logo_url, sort_order, enabled, config, account_details, created_at) VALUES ('93526aa4-7ad4-4449-ad4e-8608bd36b6ea', 'creditcard', 'Credit / Debit Card', 'Credit / Debit Card', 'card', '', '', 9, 1, '{}', '{}', NOW());
INSERT INTO payment_methods (id, slug, name, display_name, type, description, logo_url, sort_order, enabled, config, account_details, created_at) VALUES ('d7543abd-4bed-4e56-a126-cfeb0c22b415', 'applegift', 'Apple Gift Card', 'Apple Gift Card', 'gift', '', '', 10, 1, '{}', '{}', NOW());
