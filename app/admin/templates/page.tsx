"use client";
import { useEffect, useState } from "react";
import { AdminNav } from "../_components/AdminNav";

type Template = {
  id: string;
  slug: string;
  day_offset: number;
  subject: string;
  body: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
};

export default function TemplatesPage() {
  const [items, setItems] = useState<Template[] | null>(null);
  const [err, setErr] = useState<{ msg: string; hint?: string } | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/templates", { cache: "no-store" });
    if (res.status === 401) { window.location.href = "/admin/login"; return; }
    const j = await res.json();
    if (!res.ok) { setErr({ msg: j.error || "load_error", hint: j.hint }); return; }
    setErr(null);
    setItems(j.templates);
  }
  useEffect(() => { load(); }, []);

  async function patch(id: string, patch: Partial<Template>) {
    setSavingId(id);
    const res = await fetch("/api/admin/templates", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    setSavingId(null);
    if (!res.ok) { alert((await res.json()).error); return; }
    load();
  }

  async function add() {
    const lastDay = items && items.length ? items[items.length - 1].day_offset : -1;
    const res = await fetch("/api/admin/templates", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        subject: "מייל חדש",
        body: "תוכן המייל...",
        day_offset: lastDay + 1,
      }),
    });
    if (!res.ok) { alert((await res.json()).error); return; }
    load();
  }

  async function remove(t: Template) {
    if (!confirm(`למחוק את המייל "${t.subject}"?`)) return;
    const res = await fetch(`/api/admin/templates?id=${t.id}`, { method: "DELETE" });
    if (!res.ok) { alert((await res.json()).error); return; }
    load();
  }

  async function testSend(t: Template) {
    const to = prompt("שלח בדיקה לאיזה אימייל?", "");
    if (!to) return;
    const res = await fetch("/api/admin/templates/test-send", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: t.id, to }),
    });
    const j = await res.json();
    if (!res.ok) alert(`שגיאה: ${j.error}`);
    else alert(`נשלח! נשארו ${j.quotaRemaining} מתוך מכסת היום.`);
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <AdminNav />

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">רצף מיילים</h1>
        <button onClick={add} className="bg-navy text-white rounded px-4 py-2 text-sm font-semibold">
          + הוספת מייל
        </button>
      </div>

      {err && (
        <div className="bg-red-50 border border-red-200 rounded p-4 mb-4 text-sm">
          <p className="font-semibold text-red-800">{err.msg}</p>
          {err.hint && <p className="text-red-700 mt-1">{err.hint}</p>}
        </div>
      )}

      {!items ? <p>טוען...</p> : items.length === 0 ? (
        <p className="text-gray-500 py-12 text-center">
          אין מיילים ברצף. לחץ "הוספת מייל" כדי להתחיל.
        </p>
      ) : (
        <div className="space-y-4">
          {items.map((t, i) => (
            <Row
              key={t.id}
              t={t}
              index={i}
              prevDay={i > 0 ? items[i - 1].day_offset : null}
              saving={savingId === t.id}
              onSave={(p) => patch(t.id, p)}
              onDelete={() => remove(t)}
              onTest={() => testSend(t)}
            />
          ))}
        </div>
      )}

      <details className="mt-10 text-xs text-gray-500">
        <summary className="cursor-pointer">איך זה עובד?</summary>
        <div className="mt-2 leading-relaxed space-y-2">
          <p>• <b>יום (day_offset)</b>: כמה ימים אחרי ההרשמה המייל יישלח. 0 = באותו יום, 1 = למחרת, וכו'.</p>
          <p>• כל ליד מקבל מייל אחד לכל היותר בכל הרצה של ה-cron (07:00 UTC כל יום) — את המייל הבא ברצף שכבר עבר זמנו.</p>
          <p>• <b>השבתה</b> של מייל מונעת ממנו להישלח לאף ליד חדש. לידים שכבר קיבלו אותו לא יושפעו.</p>
          <p>• <b>מחיקה</b> של מייל היא סופית. לידים שכבר קיבלו אותו בעבר לא יקבלו אותו שוב גם אם תיצור מייל חדש עם אותם מילים.</p>
          <p>• עריכת תוכן או נושא של מייל קיים — לידים שכבר קיבלו אותו לא יקבלו את הגרסה המעודכנת. לידים חדשים כן.</p>
        </div>
      </details>
    </main>
  );
}

function Row(props: {
  t: Template; index: number; prevDay: number | null; saving: boolean;
  onSave: (p: Partial<Template>) => void;
  onDelete: () => void; onTest: () => void;
}) {
  const { t, index, prevDay, saving } = props;
  const [subject, setSubject] = useState(t.subject);
  const [body, setBody] = useState(t.body);
  const [day, setDay] = useState(t.day_offset);
  const dirty = subject !== t.subject || body !== t.body || day !== t.day_offset;

  return (
    <section className={`bg-white border rounded-lg ${t.enabled ? "" : "opacity-60"}`}>
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold bg-gray-100 px-2 py-0.5 rounded">
            מייל #{index + 1}
          </span>
          <span className="text-xs text-gray-500">
            יום {t.day_offset}{prevDay !== null ? ` · השהיה ${t.day_offset - prevDay} ימים מהמייל הקודם` : ""}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs flex items-center gap-1">
            <input
              type="checkbox" checked={t.enabled}
              onChange={(e) => props.onSave({ enabled: e.target.checked })}
            /> פעיל
          </label>
          <button onClick={props.onTest} className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded">בדיקה</button>
          <button onClick={props.onDelete} className="text-xs text-red-600 hover:bg-red-50 px-2 py-1 rounded">מחק</button>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div className="grid grid-cols-[1fr_120px] gap-3">
          <label className="block">
            <span className="block text-xs text-gray-600 mb-1">נושא</span>
            <input
              value={subject} onChange={(e) => setSubject(e.target.value)}
              className="w-full border rounded px-3 py-2 text-right"
            />
          </label>
          <label className="block">
            <span className="block text-xs text-gray-600 mb-1">יום מההרשמה</span>
            <input
              type="number" min={0} value={day}
              onChange={(e) => setDay(Math.max(0, parseInt(e.target.value || "0", 10)))}
              className="w-full border rounded px-3 py-2 text-right"
            />
          </label>
        </div>

        <label className="block">
          <span className="block text-xs text-gray-600 mb-1">תוכן (פסקאות מופרדות בשורה ריקה)</span>
          <textarea
            value={body} onChange={(e) => setBody(e.target.value)}
            rows={10}
            className="w-full border rounded px-3 py-2 text-right font-sans leading-relaxed"
          />
        </label>

        <div className="flex justify-end">
          <button
            disabled={!dirty || saving}
            onClick={() => props.onSave({ subject, body, day_offset: day })}
            className="bg-navy text-white rounded px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {saving ? "שומר..." : dirty ? "שמירה" : "שמור"}
          </button>
        </div>
      </div>
    </section>
  );
}
