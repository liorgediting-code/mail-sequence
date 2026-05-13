"use client";
import { useState } from "react";

export default function HomePage() {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [msg, setMsg] = useState<string>("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("loading"); setMsg("");
    const f = new FormData(e.currentTarget);
    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: String(f.get("email") || "").trim(),
        name:  String(f.get("name")  || "").trim() || null,
        phone: String(f.get("phone") || "").trim() || null,
      }),
    });
    if (res.ok) { setState("done"); }
    else {
      const j = await res.json().catch(() => ({}));
      setState("error"); setMsg(j?.error || "שגיאה לא ידועה");
    }
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <h1 className="text-3xl font-bold mb-2">הרשמה לרשימת התפוצה</h1>
      <p className="text-gray-600 mb-8">
        תקבל מאיתנו מיילים עם ערך אמיתי. אפשר להסיר את הרישום בכל רגע.
      </p>

      {state === "done" ? (
        <div className="rounded-lg bg-white border p-6">
          <p className="text-lg font-semibold mb-1">תודה!</p>
          <p className="text-gray-600">המייל הראשון בדרך אליך 🎉</p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4 bg-white border rounded-lg p-6">
          <label className="block">
            <span className="block text-sm mb-1">אימייל</span>
            <input
              name="email" type="email" required
              className="w-full border rounded px-3 py-2 text-right"
              placeholder="name@example.com"
            />
          </label>
          <label className="block">
            <span className="block text-sm mb-1">שם (לא חובה)</span>
            <input
              name="name" type="text"
              className="w-full border rounded px-3 py-2 text-right"
            />
          </label>
          <label className="block">
            <span className="block text-sm mb-1">טלפון (לא חובה)</span>
            <input
              name="phone" type="tel"
              className="w-full border rounded px-3 py-2 text-right"
            />
          </label>
          <button
            type="submit"
            disabled={state === "loading"}
            className="w-full bg-navy text-white rounded py-3 font-semibold disabled:opacity-60"
          >
            {state === "loading" ? "שולח..." : "הרשמה"}
          </button>
          {state === "error" && (
            <p className="text-red-600 text-sm">{msg}</p>
          )}
        </form>
      )}
    </main>
  );
}
