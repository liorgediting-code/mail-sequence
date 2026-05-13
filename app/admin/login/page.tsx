"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setBusy(true);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: pw }),
    });
    setBusy(false);
    if (res.ok) router.replace("/admin");
    else setErr("סיסמה שגויה");
  }

  return (
    <main className="mx-auto max-w-sm px-6 py-24">
      <h1 className="text-2xl font-bold mb-6">כניסת מנהל</h1>
      <form onSubmit={submit} className="space-y-4 bg-white border rounded-lg p-6">
        <input
          type="password" value={pw} onChange={(e) => setPw(e.target.value)}
          autoFocus required
          className="w-full border rounded px-3 py-2 text-right"
          placeholder="סיסמה"
        />
        <button
          type="submit" disabled={busy}
          className="w-full bg-navy text-white rounded py-3 font-semibold disabled:opacity-60"
        >
          {busy ? "..." : "כניסה"}
        </button>
        {err && <p className="text-red-600 text-sm">{err}</p>}
      </form>
    </main>
  );
}
