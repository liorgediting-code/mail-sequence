"use client";
import { useEffect, useState } from "react";

type LogRow = { template_slug: string; status: string; sent_at: string };
type Lead = {
  id: string; email: string; name: string | null; phone: string | null;
  source: string; status: string; signed_up_at: string;
  unsubscribed_at: string | null; logs: LogRow[];
};

export default function AdminPage() {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [err, setErr] = useState<string>("");
  const [filter, setFilter] = useState<string>("all");

  async function load() {
    const res = await fetch("/api/admin/leads", { cache: "no-store" });
    if (res.status === 401) { window.location.href = "/admin/login"; return; }
    const j = await res.json();
    if (!res.ok) { setErr(j.error || "load_error"); return; }
    setLeads(j.leads);
  }
  useEffect(() => { load(); }, []);

  async function setStatus(id: string, status: string) {
    await fetch("/api/admin/leads", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    load();
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }

  if (err) return <pre className="p-6 text-red-600">{err}</pre>;
  if (!leads) return <p className="p-6">טוען...</p>;

  const filtered = filter === "all" ? leads : leads.filter((l) => l.status === filter);

  const counts = {
    all:          leads.length,
    active:       leads.filter((l) => l.status === "active").length,
    paused:       leads.filter((l) => l.status === "paused").length,
    unsubscribed: leads.filter((l) => l.status === "unsubscribed").length,
    bounced:      leads.filter((l) => l.status === "bounced").length,
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">לידים — {leads.length}</h1>
        <button onClick={logout} className="text-sm text-gray-600 underline">יציאה</button>
      </header>

      <div className="flex gap-2 mb-4 flex-wrap">
        {(["all","active","paused","unsubscribed","bounced"] as const).map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1 rounded border text-sm ${filter === s ? "bg-navy text-white" : "bg-white"}`}>
            {labelFor(s)} ({counts[s]})
          </button>
        ))}
      </div>

      <div className="bg-white border rounded-lg overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-right">
            <tr>
              <th className="p-3">אימייל</th>
              <th className="p-3">שם</th>
              <th className="p-3">מקור</th>
              <th className="p-3">סטטוס</th>
              <th className="p-3">תאריך הצטרפות</th>
              <th className="p-3">מיילים שנשלחו</th>
              <th className="p-3">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((l) => (
              <tr key={l.id} className="border-t">
                <td className="p-3 font-mono text-xs">{l.email}</td>
                <td className="p-3">{l.name ?? "—"}</td>
                <td className="p-3 text-gray-500">{l.source}</td>
                <td className="p-3"><StatusBadge s={l.status} /></td>
                <td className="p-3 text-gray-500">{new Date(l.signed_up_at).toLocaleString("he-IL")}</td>
                <td className="p-3">
                  {l.logs.length === 0 ? <span className="text-gray-400">—</span> :
                    l.logs.slice(0, 3).map((r) => (
                      <span key={r.template_slug + r.sent_at} className="inline-block bg-gray-100 px-2 py-0.5 rounded mx-0.5 text-xs">
                        {r.template_slug} {r.status === "failed" ? "✗" : "✓"}
                      </span>
                    ))
                  }
                </td>
                <td className="p-3">
                  <select
                    value={l.status} onChange={(e) => setStatus(l.id, e.target.value)}
                    className="border rounded px-2 py-1 text-xs">
                    <option value="active">פעיל</option>
                    <option value="paused">בהשהיה</option>
                    <option value="unsubscribed">הוסר</option>
                    <option value="bounced">נחזר</option>
                  </select>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="p-6 text-center text-gray-500">אין לידים</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function labelFor(s: string) {
  return ({ all: "הכל", active: "פעיל", paused: "בהשהיה", unsubscribed: "הוסרו", bounced: "נחזרו" } as Record<string,string>)[s] || s;
}
function StatusBadge({ s }: { s: string }) {
  const cls = ({
    active:       "bg-green-100 text-green-800",
    paused:       "bg-yellow-100 text-yellow-800",
    unsubscribed: "bg-gray-200 text-gray-700",
    bounced:      "bg-red-100 text-red-800",
  } as Record<string,string>)[s] || "bg-gray-100";
  return <span className={`inline-block px-2 py-0.5 rounded text-xs ${cls}`}>{labelFor(s)}</span>;
}
