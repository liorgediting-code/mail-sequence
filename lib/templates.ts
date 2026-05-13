// Email sequence definition.
//
// `day_offset` is measured from the lead's signed_up_at. The cron picks the
// earliest unsent step whose target time (signed_up_at + day_offset days) is
// in the past for each active lead, and sends it.
//
// Body is plain Hebrew text. We render it to HTML at send time by wrapping it
// in an RTL document and converting double-newlines to paragraphs. The
// {{UNSUB_URL}} placeholder is replaced per-lead.

export type Template = {
  slug: string;          // stable id, used as the email_log unique key
  day_offset: number;    // 0 = same day as signup
  subject: string;       // Hebrew, kept short for inbox preview
  body: string;          // Hebrew, plain text with paragraph breaks
};

export const SEQUENCE: Template[] = [
  {
    slug: "welcome",
    day_offset: 0,
    subject: "המדריך שלך",
    body: `היי! ראיתי שנרשמת לקבל את המדריך שלי, מקווה שראית אותו ואם לא אני מצרף לך כאן קישור אליו: https://liavcohen.co.il

(נ.ב, הוספתי אותך לרשימת המיילים שלי, כאן אני מביא הרבה מאוד ערך בחינם לגמרי ;) ממליץ לך להישאר, אבל אם תרצה לצאת תמיד תוכל ללחוץ למטה על "הסר".`,
  },
  {
    slug: "fear-of-people",
    day_offset: 1,
    subject: "הדבר היחיד שעוצר את המכירה שלך",
    body: `היי, טוב — זה המייל הראשון יחסית שאני שולח לך עם באמת ערך, ורציתי לספר לך על הבעיה האמיתית במכירות של בעלי עסקים שדופקת להם את כל אחוזי ההמרה.

והיא: פחד מאנשים. רוב בעלי העסקים שמגיעים אליי פוחדים מאנשים — פוחדים לשאול שאלה, פוחדים להעמיד את הלקוח במקום, ונותנים לו לדרוך עליהם במילים אחרות. וכשהלקוח נותן התנגדות כזו או אחרת, הם ישר מתקפלים ומשחררים אותו בלי לשאול שאלות מכווינות.

אם קראת את המדריך שקיבלת במייל הקודם, כנראה שאתה כבר קצת יותר מבין במכירות משאר בעלי העסקים. מה שאני רוצה להגיד לך זה — אף פעם אל תפחד לשאול שאלות, להעמיד את הלקוח במקום אם הוא מדבר לא לעניין, ואף פעם אל תשחרר אם הוא נותן התנגדות. תמיד תנסה לפתור אותה או להבין אם זה אמיתי או שהוא מחרטט.

אוהב,
ליאב.`,
  },
];

// Wrap body text in an RTL HTML document. Adds an unsub footer.
export function renderHtml(body: string, unsubUrl: string): string {
  const paragraphs = body
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 16px 0;">${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`)
    .join("");

  return `<!doctype html>
<html lang="he" dir="rtl">
  <head><meta charset="utf-8"/></head>
  <body style="margin:0;padding:0;background:#f6f6f6;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#f6f6f6;">
      <tr><td align="center" style="padding:24px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;background:#ffffff;border-radius:8px;">
          <tr><td style="padding:32px;font-family:'Heebo',Arial,sans-serif;font-size:16px;line-height:1.7;color:#1a1f3a;direction:rtl;text-align:right;">
            ${paragraphs}
            <hr style="border:none;border-top:1px solid #e5e5e5;margin:32px 0 16px 0;"/>
            <p style="font-size:12px;color:#888;margin:0;">
              <a href="${unsubUrl}" style="color:#888;text-decoration:underline;">ביטול רישום / הסר</a>
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

export function renderText(body: string, unsubUrl: string): string {
  return `${body}\n\n---\nביטול רישום: ${unsubUrl}\n`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]!));
}
