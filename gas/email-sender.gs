/**
 * mail-sequence — Gmail sender web app.
 *
 * Deploy:
 *   1. script.google.com → New project → paste this file.
 *   2. Project Settings (gear) → Script properties → add property
 *        SECRET = <same value as GAS_EMAIL_SECRET in mail-sequence env>
 *   3. Deploy → New deployment → Web app:
 *        - Execute as: Me (your Gmail account that will send)
 *        - Who has access: Anyone with the link
 *      Authorize when prompted, then copy the /exec URL into GAS_EMAIL_WEBHOOK.
 *
 * Request:  POST  application/json
 *   { secret, to, subject, htmlBody, textBody?, fromName?, replyTo? }
 *
 * Response: { ok: true, messageId, quotaRemaining }
 *           or { ok: false, error }
 */

function doPost(e) {
  let body;
  try { body = JSON.parse(e.postData.contents); }
  catch (err) { return _json({ ok: false, error: 'bad_json' }, 400); }

  const expected = PropertiesService.getScriptProperties().getProperty('SECRET');
  if (!expected || body.secret !== expected) {
    return _json({ ok: false, error: 'unauthorized' }, 401);
  }

  if (!body.to || !body.subject || (!body.htmlBody && !body.textBody)) {
    return _json({ ok: false, error: 'missing_fields' }, 400);
  }

  const quotaRemaining = MailApp.getRemainingDailyQuota();
  if (quotaRemaining < 1) {
    return _json({ ok: false, error: 'quota_exhausted', quotaRemaining: 0 }, 429);
  }

  // If a `from` alias is supplied, ensure it's actually a verified alias of
  // the authenticated Gmail account. Send from the primary address otherwise
  // (so a typo / unverified alias doesn't silently swap senders).
  let fromAlias;
  if (body.fromEmail) {
    const aliases = GmailApp.getAliases();
    if (aliases.indexOf(body.fromEmail) !== -1) {
      fromAlias = body.fromEmail;
    } else {
      return _json({
        ok: false,
        error: 'from_not_alias',
        hint: 'Add the address under Gmail → Settings → Accounts → "Send mail as" first.',
        knownAliases: aliases,
      }, 400);
    }
  }

  try {
    GmailApp.sendEmail(body.to, body.subject, body.textBody || '', {
      htmlBody: body.htmlBody || undefined,
      name:     body.fromName || 'Liav',
      from:     fromAlias,
      replyTo:  body.replyTo  || undefined,
    });
  } catch (err) {
    return _json({ ok: false, error: String(err && err.message || err) }, 500);
  }

  // Gmail doesn't return a stable id from GmailApp.sendEmail; we synthesize one
  // for log correlation.
  const messageId = Utilities.getUuid();
  return _json({ ok: true, messageId, quotaRemaining: quotaRemaining - 1 });
}

function doGet() {
  return _json({ ok: true, service: 'mail-sequence email-sender' });
}

function _json(obj, _status) {
  // Apps Script web apps can't set status codes from ContentService; clients
  // should treat ok:false as the error signal.
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
