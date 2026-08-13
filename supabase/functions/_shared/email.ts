// Order confirmation email: template + Resend send helper, shared so any function
// that needs to send this email uses the same branding and the same from-address.

import { formatPrice } from "./pricing.ts";

// Resend's shared test sender — no domain verification needed, works immediately.
// Swap this one line for a verified getkeystate.com address once DNS is set up.
export const FROM_EMAIL = "KEYSTATE <onboarding@resend.dev>";

const BRAND_ORANGE = "#FF5724";
const BRAND_NAVY = "#1C2631";

// Served from public/logo-email.png — a stable, unhashed path (unlike Vite's
// content-hashed bundle assets) so this URL doesn't break on future rebuilds.
const LOGO_URL = "https://getkeystate.com/logo-email.png";

export interface OrderConfirmationItem {
  label: string; // e.g. "Metal — Silver"
  quantity: number;
}

export interface OrderConfirmationShipping {
  name: string;
  addressLine1: string;
  addressLine2?: string | null;
  city?: string | null;
  postalCode?: string | null;
  country?: string | null;
}

export interface OrderConfirmationEmailData {
  orderId: string;
  customerName: string;
  companyName?: string | null;
  totalAmount: number;
  items: OrderConfirmationItem[];
  shipping?: OrderConfirmationShipping | null;
}

export const getOrderNumber = (orderId: string): string =>
  `KS-${orderId.substring(0, 8).toUpperCase()}`;

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export function buildOrderConfirmationEmailHtml(data: OrderConfirmationEmailData): string {
  const orderNumber = getOrderNumber(data.orderId);
  const customerName = escapeHtml(data.customerName || "");

  const itemRows = data.items
    .map(
      (item) => `
        <tr>
          <td style="padding:10px 0;font-size:14px;color:#475569;border-bottom:1px solid #F1F5F9;">${escapeHtml(item.label)}</td>
          <td align="right" style="padding:10px 0;font-size:14px;font-weight:600;color:${BRAND_NAVY};border-bottom:1px solid #F1F5F9;">${item.quantity} units</td>
        </tr>`
    )
    .join("");

  const companyRow = data.companyName
    ? `<p style="margin:0 0 4px 0;font-size:14px;color:#64748B;">${escapeHtml(data.companyName)}</p>`
    : "";

  const shippingBlock = data.shipping
    ? `
      <tr>
        <td style="padding:24px 32px 0 32px;">
          <h3 style="margin:0 0 8px 0;font-size:15px;color:${BRAND_NAVY};">Shipping Address</h3>
          <p style="margin:0;font-size:14px;color:#64748B;line-height:1.6;">
            ${escapeHtml(data.shipping.name)}<br />
            ${escapeHtml(data.shipping.addressLine1)}<br />
            ${data.shipping.addressLine2 ? `${escapeHtml(data.shipping.addressLine2)}<br />` : ""}
            ${[data.shipping.city, data.shipping.postalCode].filter((v): v is string => Boolean(v)).map(escapeHtml).join(", ")}<br />
            ${data.shipping.country ? escapeHtml(data.shipping.country.toUpperCase()) : ""}
          </p>
        </td>
      </tr>`
    : "";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Order Confirmed</title>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:Arial, Helvetica, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F1F5F9;padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#FFFFFF;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="background-color:#FFFFFF;padding:24px 32px;border-bottom:1px solid #E2E8F0;">
              <img src="${LOGO_URL}" alt="KEYSTATE" width="125" height="32" style="display:block;border:0;height:32px;width:125px;" />
            </td>
          </tr>

          <tr>
            <td style="padding:40px 32px 24px 32px;text-align:center;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 16px auto;">
                <tr>
                  <td style="width:56px;height:56px;border-radius:50%;background-color:#FFE4DA;text-align:center;vertical-align:middle;font-size:26px;line-height:56px;color:${BRAND_ORANGE};">&#10003;</td>
                </tr>
              </table>
              <h1 style="margin:0 0 8px 0;font-size:24px;color:${BRAND_NAVY};">Order Confirmed!</h1>
              <p style="margin:0;font-size:15px;color:#64748B;">Thank you for your order${customerName ? `, ${customerName}` : ""}</p>
            </td>
          </tr>

          <tr>
            <td style="padding:0 32px 24px 32px;text-align:center;">
              <span style="display:inline-block;background-color:#F1F5F9;border:1px solid #E2E8F0;border-radius:8px;padding:8px 16px;font-size:14px;color:${BRAND_NAVY};">Order: <strong>${orderNumber}</strong></span>
            </td>
          </tr>

          <tr>
            <td style="padding:0 32px 8px 32px;">
              ${companyRow}
              <h3 style="margin:12px 0 4px 0;font-size:15px;color:${BRAND_NAVY};border-bottom:1px solid #E2E8F0;padding-bottom:8px;">Your Order</h3>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${itemRows}
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:16px 32px 32px 32px;border-top:2px solid ${BRAND_NAVY};margin-top:8px;">
              <table role="presentation" width="100%" style="margin-top:16px;">
                <tr>
                  <td style="font-size:16px;font-weight:bold;color:${BRAND_NAVY};">Total</td>
                  <td align="right" style="font-size:16px;font-weight:bold;color:${BRAND_ORANGE};">${formatPrice(data.totalAmount)}</td>
                </tr>
              </table>
            </td>
          </tr>

          ${shippingBlock}

          <tr>
            <td style="padding:32px;text-align:center;border-top:1px solid #F1F5F9;">
              <p style="margin:0;font-size:13px;color:#94A3B8;">Need help? Contact us at <a href="mailto:hello.keystate@gmail.com" style="color:${BRAND_ORANGE};text-decoration:none;">hello.keystate@gmail.com</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendOrderConfirmationEmail(params: {
  apiKey: string;
  to: string;
  data: OrderConfirmationEmailData;
}): Promise<{ ok: boolean; status: number; body: string }> {
  const orderNumber = getOrderNumber(params.data.orderId);
  const html = buildOrderConfirmationEmailHtml(params.data);

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: params.to,
      subject: `Order Confirmed — ${orderNumber}`,
      html,
    }),
  });

  const body = await res.text();
  return { ok: res.ok, status: res.status, body };
}
