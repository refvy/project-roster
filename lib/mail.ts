import { getEmailFrom, getResendApiKey } from "./env";

export async function sendMagicLinkEmail({
  to,
  url,
}: {
  to: string;
  url: string;
}) {
  const apiKey = getResendApiKey();
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: getEmailFrom(),
      to: [to],
      subject: "Your Skwad magic link",
      text: [
        "Sign in to Skwad with this link. It expires in 20 minutes.",
        "",
        url,
        "",
        "If you did not request this, you can ignore the email.",
      ].join("\n"),
      html: [
        "<p>Sign in to Skwad with this link. It expires in 20 minutes.</p>",
        `<p><a href="${url}">Open magic link</a></p>`,
        "<p>If you did not request this, you can ignore the email.</p>",
      ].join(""),
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Resend ${response.status}: ${detail.slice(0, 500)}`);
  }
}
