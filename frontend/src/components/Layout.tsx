import type { ReactNode } from "react";
import { NavLink, Outlet, useLocation, useSearchParams } from "react-router-dom";
import { useSnapshots } from "../context/SnapshotContext";
import SnapshotPicker from "./SnapshotPicker";
import { Brand, ClipboardIcon, FileIcon, GridIcon, InboxIcon, TrendIcon, UploadIcon } from "./ui";

// Menu. `keepDate` links carry the selected snapshot day along.
const NAV: [string, string, ReactNode, boolean][] = [
  ["/", "Dashboard", <GridIcon key="d" />, true],
  ["/pr", "PR", <ClipboardIcon key="p" />, true],
  ["/qr/update", "QR Buyer Update", <FileIcon key="u" />, true],
  ["/qr/verify", "QR Buyer Verify", <InboxIcon key="v" />, true],
  ["/trend", "Monthly trend", <TrendIcon key="t" />, false],
  ["/upload", "Upload", <UploadIcon key="up" />, false],
];
const PAGES_WITH_DATE = ["/", "/pr", "/qr/update", "/qr/verify"];

function Header() {
  const { days } = useSnapshots();
  const { pathname } = useLocation();
  return (
    <header className="brand-grid relative overflow-hidden bg-brand-navy text-white shadow-[0_8px_30px_rgba(7,27,85,0.18)]">
      <div className="brand-ribbon pointer-events-none absolute -right-16 -top-32 h-80 w-96 opacity-80" />
      <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-brand-red via-white to-brand-bright" />

      <div className="relative mx-auto flex min-h-[84px] max-w-[1280px] flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-8">
        <Brand />
        {PAGES_WITH_DATE.includes(pathname) && days.length > 0 && <SnapshotPicker />}
      </div>
    </header>
  );
}

export default function Layout() {
  const [params] = useSearchParams();
  const date = params.get("date");

  return (
    <div className="flex min-h-screen flex-col bg-brand-ice text-slate-950">
      <Header />

      <main className="panel-glow mx-auto w-full max-w-[1280px] flex-1 px-4 py-7 sm:px-8 sm:py-10">
        <nav
          aria-label="Sections"
          className="mb-7 flex w-full gap-1.5 overflow-x-auto rounded-2xl border border-blue-100 bg-white p-1.5 shadow-[0_6px_24px_rgba(7,27,85,0.07)]"
        >
          {NAV.map(([to, label, icon, keepDate]) => (
            <NavLink
              key={to}
              to={keepDate && date ? `${to}?date=${date}` : to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition-all ${
                  isActive
                    ? "bg-brand-blue text-white shadow-[0_5px_14px_rgba(11,60,145,0.25)]"
                    : "text-slate-600 hover:bg-brand-ice hover:text-brand-navy"
                }`
              }
            >
              {icon}
              {label}
            </NavLink>
          ))}
        </nav>
        <Outlet />
      </main>

      <footer className="border-t border-blue-100 py-6 text-center text-xs font-medium text-slate-500">
        CARSEM DAILY QR &amp; PR | WAFIY 2026
      </footer>
    </div>
  );
}
