export function trustedPaymentCheckout(url, mode) {
  return url.protocol === "https:" && (url.hostname === "checkout.flutterwave.com" || (mode === "test" && url.hostname === "checkout-v2.dev-flutterwave.com"));
}
