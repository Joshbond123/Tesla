-- Seed realistic payment method details (account_details, wallet_address,
-- payment_instructions, logo_url) for all default payment methods.
-- Run on 2026-07-25 — fixes empty config causing blank customer Payment page.

UPDATE public.payment_methods SET
  account_details = '{"businessName":"Tesla Global Awards LLC","email":"payments@teslaglobalawards.com","merchantId":"TM8XK2R9Q4ZPA","paypalMeLink":"https://paypal.me/teslaglobalawards","instructions":"Send the delivery fee via PayPal to our verified business account. Select \"Friends & Family\" and include your Order ID in the note so we can match your payment quickly. Screenshot the confirmation and upload it as proof."}',
  wallet_address  = 'payments@teslaglobalawards.com',
  payment_instructions = 'Send the delivery fee via PayPal to our verified business account. Select "Friends & Family" and include your Order ID in the note.',
  logo_url = 'assets/payment-logos/paypal.svg',
  display_name = 'PayPal',
  updated_at = now()
WHERE name = 'paypal';

UPDATE public.payment_methods SET
  account_details = '{"cashtag":"$TeslaGlobalAwards","accountName":"Tesla Global Awards","phone":"+1 (888) 472-3001","instructions":"Open Cash App and send the delivery fee to our verified $Cashtag. Add your Order ID in the \"For\" field. Screenshot the payment confirmation and upload it as your proof."}',
  wallet_address  = '$TeslaGlobalAwards',
  payment_instructions = 'Open Cash App and send the delivery fee to $TeslaGlobalAwards. Add your Order ID in the "For" field. Screenshot confirmation and upload as proof.',
  logo_url = 'assets/payment-logos/cashapp.svg',
  display_name = 'Cash App',
  updated_at = now()
WHERE name = 'cashapp';

UPDATE public.payment_methods SET
  account_details = '{"username":"@TeslaGlobalAwards","accountName":"Tesla Global Awards LLC","instructions":"Send the delivery fee to our official Venmo handle. Include your Order ID in the payment description. Screenshot the confirmation screen and upload it as your payment proof."}',
  wallet_address  = '@TeslaGlobalAwards',
  payment_instructions = 'Send the delivery fee to @TeslaGlobalAwards on Venmo. Include your Order ID in the description. Screenshot confirmation and upload as proof.',
  logo_url = 'assets/payment-logos/venmo.svg',
  display_name = 'Venmo',
  updated_at = now()
WHERE name = 'venmo';

UPDATE public.payment_methods SET
  account_details = '{"recipientName":"Tesla Global Awards LLC","email":"zelle@teslaglobalawards.com","phone":"+1 (415) 892-3401","instructions":"Open Zelle in your banking app and send the delivery fee to our registered email or phone number. Include your Order ID in the memo field. Take a screenshot of the confirmation and upload it as proof."}',
  wallet_address  = 'zelle@teslaglobalawards.com',
  payment_instructions = 'Send via Zelle to zelle@teslaglobalawards.com or +1 (415) 892-3401. Include your Order ID in the memo. Screenshot confirmation and upload as proof.',
  logo_url = 'assets/payment-logos/zelle.svg',
  display_name = 'Zelle',
  updated_at = now()
WHERE name = 'zelle';

UPDATE public.payment_methods SET
  account_details = '{"walletAddress":"bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh","network":"Bitcoin (BTC) — Mainnet","confirmationsRequired":"1 confirmation","instructions":"Send the exact delivery fee amount in BTC to the wallet address above. Include your Order ID in the transaction memo if supported by your wallet. Copy the wallet address carefully or scan the QR code. Upload a screenshot of your transaction confirmation as proof."}',
  wallet_address  = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
  payment_instructions = 'Send the exact delivery fee in BTC to the wallet address. Include Order ID in memo. Upload transaction confirmation screenshot.',
  logo_url = 'assets/payment-logos/bitcoin.svg',
  display_name = 'Bitcoin (BTC)',
  updated_at = now()
WHERE name = 'bitcoin';

UPDATE public.payment_methods SET
  account_details = '{"walletAddress":"0x71C7656EC7ab88b098defB751B7401B5f6d8976F","network":"Ethereum (ETH) — ERC-20 Mainnet","confirmationsRequired":"12 confirmations","instructions":"Send the delivery fee in ETH to the wallet address above. Make sure you are sending on the Ethereum mainnet (not a testnet). Copy the address carefully or scan the QR code. Upload your transaction hash or screenshot as proof."}',
  wallet_address  = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
  payment_instructions = 'Send ETH on Ethereum mainnet to the wallet address. Upload transaction hash or screenshot as proof.',
  logo_url = 'assets/payment-logos/ethereum.svg',
  display_name = 'Ethereum (ETH)',
  updated_at = now()
WHERE name = 'ethereum';

UPDATE public.payment_methods SET
  account_details = '{"walletAddress":"0x71C7656EC7ab88b098defB751B7401B5f6d8976F","network":"USDT ERC-20 — Ethereum Mainnet","memo":"","instructions":"Send USDT on the ERC-20 (Ethereum) network to the wallet address above. Do NOT send on TRC-20 or BEP-20 — funds sent on the wrong network cannot be recovered. Copy the address exactly or scan the QR. Upload transaction screenshot as proof."}',
  wallet_address  = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
  payment_instructions = 'Send USDT (ERC-20) on Ethereum network only. Upload transaction confirmation as proof.',
  logo_url = 'assets/payment-logos/usdt-erc20.svg',
  display_name = 'USDT (ERC-20)',
  updated_at = now()
WHERE name = 'usdt-erc20';

UPDATE public.payment_methods SET
  account_details = '{"walletAddress":"0x71C7656EC7ab88b098defB751B7401B5f6d8976F","network":"USDT ERC-20 — Ethereum Mainnet","memo":"","instructions":"Send USDT on the ERC-20 (Ethereum) network. Do NOT send on TRC-20 — funds sent on the wrong network cannot be recovered."}',
  wallet_address  = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
  payment_instructions = 'Send USDT (ERC-20) on Ethereum network only. Upload transaction confirmation as proof.',
  logo_url = 'assets/payment-logos/usdt-erc20.svg',
  display_name = 'USDT (ERC-20)',
  updated_at = now()
WHERE name = 'usdt';

UPDATE public.payment_methods SET
  account_details = '{"walletAddress":"TGovTsVoH3R4VtmUcPEMmPqK7DNmPDQwGX","network":"USDT TRC-20 — TRON Network","memo":"","instructions":"Send USDT on the TRC-20 (TRON) network to the wallet address above. Do NOT send on ERC-20 — funds sent on the wrong network cannot be recovered. Copy the address exactly or scan the QR. Upload transaction screenshot as proof."}',
  wallet_address  = 'TGovTsVoH3R4VtmUcPEMmPqK7DNmPDQwGX',
  payment_instructions = 'Send USDT (TRC-20) on TRON network only. Upload transaction confirmation as proof.',
  logo_url = 'assets/payment-logos/usdt-trc20.svg',
  display_name = 'USDT (TRC-20)',
  updated_at = now()
WHERE name = 'usdt-trc20';

UPDATE public.payment_methods SET
  account_details = '{"merchantName":"Tesla Global Awards LLC","merchantAccount":"TGAWARDS-US-9041","supportPhone":"+1 (888) 472-3001","acceptedNetworks":"Visa, Mastercard, Amex, Discover","instructions":"Enter your card details securely in the form below. All transactions are encrypted with 256-bit SSL. You will receive an email confirmation after your payment is processed."}',
  payment_instructions = 'Enter your card details in the secure form below. All data is encrypted with 256-bit SSL.',
  logo_url = 'assets/payment-logos/creditcard.svg',
  display_name = 'Credit Card',
  updated_at = now()
WHERE name = 'creditcard';

UPDATE public.payment_methods SET
  account_details = '{"instructions":"Purchase an Apple Gift Card from any Apple Store, Apple.com, or retail location. Scratch off the back to reveal the redemption code. Upload clear photos of both the FRONT and BACK of the card. Make sure the card code is fully visible and legible in your photo.","denominationsAccepted":"$25, $50, $100, $200 denominations accepted","purchaseLocations":"Apple Store, Apple.com, Walmart, Target, Best Buy, CVS, Walgreens"}',
  payment_instructions = 'Purchase an Apple Gift Card, scratch the back to reveal the code, then upload clear photos of both the front and back. Code must be fully legible.',
  logo_url = 'assets/payment-logos/applegift.svg',
  display_name = 'Apple Gift Card',
  updated_at = now()
WHERE name = 'applegift';
