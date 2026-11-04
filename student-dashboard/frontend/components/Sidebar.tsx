"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/students", label: "Students" },
  { href: "/courses", label: "Courses" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 border-r border-slate-200 bg-[var(--panel)] flex flex-col">
      <div className="px-5 py-5 border-b border-slate-200">
        <Link href="/" className="inline-flex items-center gap-2 font-semibold text-slate-900 hover:text-brand-600">
          <span aria-hidden className="w-2.5 h-2.5 rounded-sm bg-brand-500 shrink-0" />
          Northgate
        </Link>
        <p className="text-xs text-slate-500 mt-0.5">Student management</p>
      </div>

      <nav className="p-3 flex flex-col gap-1">
        {LINKS.map((link) => {
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={`text-sm rounded-lg px-3 py-2 transition-colors ${
                active
                  ? "bg-brand-500 text-white font-medium shadow-sm"
                  : "text-slate-600 hover:bg-white/60 hover:text-slate-900"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
