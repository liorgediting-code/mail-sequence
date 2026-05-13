"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function AdminNav() {
  const path = usePathname();
  const tabs = [
    { href: "/admin",           label: "לידים" },
    { href: "/admin/templates", label: "רצף מיילים" },
  ];
  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }
  return (
    <header className="flex items-center justify-between mb-6 border-b pb-3">
      <nav className="flex gap-2">
        {tabs.map((t) => {
          const active = path === t.href;
          return (
            <Link key={t.href} href={t.href}
              className={`px-3 py-1.5 rounded text-sm ${active ? "bg-navy text-white" : "bg-white border"}`}>
              {t.label}
            </Link>
          );
        })}
      </nav>
      <button onClick={logout} className="text-sm text-gray-600 underline">יציאה</button>
    </header>
  );
}
