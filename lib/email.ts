// Thin wrapper around the GAS Gmail web app.

import { env } from "./env";

export type SendResult =
  | { ok: true; messageId: string; quotaRemaining: number }
  | { ok: false; error: string; quotaRemaining?: number };

export async function sendViaGas(params: {
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  replyTo?: string;
}): Promise<SendResult> {
  let res: Response;
  try {
    res = await fetch(env.GAS_EMAIL_WEBHOOK(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        secret:    env.GAS_EMAIL_SECRET(),
        fromName:  env.FROM_NAME(),
        fromEmail: env.FROM_EMAIL() || undefined,
        ...params,
      }),
      // Apps Script can be slow on cold start.
      signal: AbortSignal.timeout(30_000),
    });
  } catch (err) {
    return { ok: false, error: `network:${(err as Error).message}` };
  }

  let json: unknown;
  try { json = await res.json(); }
  catch { return { ok: false, error: `non_json_response:${res.status}` }; }

  if (typeof json !== "object" || json === null) {
    return { ok: false, error: "malformed_response" };
  }
  const j = json as Record<string, unknown>;
  if (j.ok === true && typeof j.messageId === "string") {
    return {
      ok: true,
      messageId: j.messageId,
      quotaRemaining: typeof j.quotaRemaining === "number" ? j.quotaRemaining : -1,
    };
  }
  return {
    ok: false,
    error: typeof j.error === "string" ? j.error : "unknown_gas_error",
    quotaRemaining: typeof j.quotaRemaining === "number" ? j.quotaRemaining : undefined,
  };
}
