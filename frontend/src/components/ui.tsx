import { useEffect } from "react";
import type { ReactNode, SelectHTMLAttributes } from "react";
import { createPortal } from "react-dom";
import carsemLogo from "../assets/carsem-logo.png";

// ---------------------------------------------------------------------------
// Shared building blocks (ported from the Carsem Shipping Portal so both apps look the same).
// Change a colour or an icon here and it updates everywhere.
// ---------------------------------------------------------------------------
export type Notice = { type: "success" | "error"; text: string } | null;
export type IconProps = { className?: string };

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------
export const panel =
  "relative overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-[0_12px_35px_rgba(7,27,85,0.08)]";
// Buttons and inputs are built from a tone + a size, so a page never has to override
// a colour or height by appending classes (Tailwind does not guarantee which of two
// conflicting classes wins, which once made a red button render white-on-white).
const INPUT_SIZES = {
  md: "h-12 px-4 text-[15px]",
  lg: "h-14 px-4 text-lg font-bold tabular-nums", // touch-friendly, for the receiving dock
} as const;
export const input = (size: keyof typeof INPUT_SIZES = "md") =>
  `w-full rounded-xl border border-blue-100 bg-brand-ice/40 outline-none transition hover:border-blue-200 focus:border-brand-blue focus:bg-white focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 ${INPUT_SIZES[size]}`;
export const inputCls = input("md");
export const textareaCls =
  "min-h-24 w-full rounded-xl border border-blue-100 bg-brand-ice/40 px-4 py-3 text-[15px] outline-none transition hover:border-blue-200 focus:border-brand-blue focus:bg-white focus:ring-4 focus:ring-blue-100";
export const selectCls = `${inputCls} appearance-none pr-10`;

const BUTTON_TONES = {
  red: "bg-brand-red text-white shadow-[0_7px_18px_rgba(237,41,36,0.24)] hover:-translate-y-0.5 hover:bg-brand-red-dark hover:shadow-[0_10px_22px_rgba(237,41,36,0.3)] disabled:translate-y-0 disabled:opacity-60 disabled:shadow-none",
  secondary: "border border-blue-100 bg-white text-brand-blue hover:border-brand-blue hover:bg-brand-ice disabled:opacity-50",
  danger: "border border-red-200 bg-white text-brand-red hover:border-brand-red hover:bg-red-50 disabled:opacity-50",
} as const;
const BUTTON_SIZES = {
  sm: "h-9 gap-1.5 rounded-lg px-3 text-xs",
  md: "h-11 gap-2 rounded-xl px-4 text-sm",
  lg: "h-12 gap-2 rounded-xl px-6 text-sm",
  xl: "h-14 gap-2 rounded-xl px-8 text-base", // touch-friendly
} as const;
export const button = (tone: keyof typeof BUTTON_TONES, size: keyof typeof BUTTON_SIZES) =>
  `inline-flex items-center justify-center font-bold transition disabled:cursor-not-allowed ${BUTTON_TONES[tone]} ${BUTTON_SIZES[size]}`;

export const redBtn = button("red", "lg");
export const secondaryBtn = button("secondary", "md");
export const smallBtn = button("secondary", "sm");
export const tableHead = "bg-brand-ice text-[11px] uppercase tracking-wide text-slate-500";
export const th = "px-4 py-3 font-semibold";
export const td = "px-4 py-3";

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------
function Icon({ className = "h-5 w-5", d }: IconProps & { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d={d} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
export const ArrowIcon = ({ className = "h-4 w-4" }: IconProps) => <Icon className={className} d="m9 18 6-6-6-6" />;
export const BackIcon = ({ className = "h-4 w-4" }: IconProps) => <Icon className={className} d="m15 18-6-6 6-6" />;
export const CheckIcon = ({ className = "h-4 w-4" }: IconProps) => <Icon className={className} d="m5 12 4.5 4.5L19 7" />;
export const SearchIcon = (p: IconProps) => <Icon {...p} d="M11 17.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13ZM16 16l4 4" />;
export const ChartIcon = (p: IconProps) => <Icon {...p} d="M4 20V4m0 16h16M8 16v-5m4 5V8m4 8v-3" />;
export const ClipboardIcon = (p: IconProps) => (
  <Icon {...p} d="M9 4h6v3H9zM9 5H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-3M8.5 11h7M8.5 15h5" />
);
export const TruckIcon = (p: IconProps) => (
  <Icon {...p} d="M3 6h11v10H3zM14 9h4l3 3v4h-7M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm10 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
);
export const BoxIcon = (p: IconProps) => <Icon {...p} d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Zm0 0v0M4 7.5l8 4.5 8-4.5M12 12v9" />;
export const UsersIcon = (p: IconProps) => (
  <Icon {...p} d="M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1m6.5-9a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM21 19v-1a4 4 0 0 0-3-3.9M15.5 3.1a3.5 3.5 0 0 1 0 6.8" />
);
export const BuildingIcon = (p: IconProps) => <Icon {...p} d="M4 21V5l8-2v18M12 8h8v13M4 21h16M8 8h.01M8 12h.01M8 16h.01M16 12h.01M16 16h.01" />;
export const PlusIcon = (p: IconProps) => <Icon {...p} d="M12 5v14M5 12h14" />;
export const TrashIcon = (p: IconProps) => <Icon {...p} d="M4 7h16M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3" />;
export const CloseIcon = (p: IconProps) => <Icon {...p} d="m6 6 12 12M18 6 6 18" />;
export const KeyIcon = (p: IconProps) => <Icon {...p} d="M15 9a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm-3 3v9m0-4h3m-3 2h2" />;
export const EditIcon = (p: IconProps) => <Icon {...p} d="M4 20h4L19 9l-4-4L4 16v4Zm9-13 4 4" />;
export const AlertIcon = (p: IconProps) => (
  <Icon {...p} d="M12 9v4m0 4h.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
);
export const PaperclipIcon = (p: IconProps) => (
  <Icon {...p} d="m20 11.5-8.5 8.5a5 5 0 0 1-7-7L13 4.5a3.5 3.5 0 0 1 5 5L9.5 18a2 2 0 0 1-3-3L14 7.5" />
);
export const InboxIcon = (p: IconProps) => <Icon {...p} d="M4 13h4l2 3h4l2-3h4M4 13l2-8h12l2 8v6H4v-6Z" />;
export const ClockIcon = (p: IconProps) => <Icon {...p} d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v4l3 2" />;
export const UploadIcon = (p: IconProps) => <Icon {...p} d="M12 16V4m0 0L7 9m5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />;
export const GridIcon = (p: IconProps) => <Icon {...p} d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />;
export const TrendIcon = (p: IconProps) => <Icon {...p} d="M3 17l6-6 4 4 8-8M15 7h6v6" />;
export const FileIcon = (p: IconProps) => <Icon {...p} d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8l-5-5Zm0 0v5h5M9 13h6M9 17h4" />;

// ---------------------------------------------------------------------------
// Small pieces
// ---------------------------------------------------------------------------
export function Spinner({ className = "border-white/40 border-t-white" }: { className?: string }) {
  return <span className={`inline-block h-4 w-4 animate-spin rounded-full border-2 ${className}`} />;
}

export function Loading() {
  return (
    <div className="flex justify-center py-16">
      <Spinner className="h-6 w-6 border-brand-blue/30 border-t-brand-blue" />
    </div>
  );
}

/** Label + input wrapper used in forms. */
export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

/** Native select with the brand chevron. */
export function Select({ className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select {...props} className={`${selectCls} ${className}`} />
      <svg viewBox="0 0 20 20" className="pointer-events-none absolute right-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M5.3 7.7a1 1 0 0 1 1.4 0l3.3 3.3 3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4Z" clipRule="evenodd" />
      </svg>
    </div>
  );
}

export function TopBar() {
  return <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-red via-brand-bright to-brand-navy" />;
}

export function Banner({ notice }: { notice: Notice }) {
  if (!notice) return null;
  const style =
    notice.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800";
  return (
    <div role="alert" className={`mb-5 rounded-xl border px-4 py-3 text-sm font-medium ${style}`}>
      {notice.text}
    </div>
  );
}

export type Tone = "slate" | "red" | "blue" | "green" | "amber" | "violet" | "navy" | "redSoft";

export function Badge({ children, tone = "slate" }: { children: ReactNode; tone?: Tone }) {
  const tones: Record<Tone, string> = {
    slate: "bg-slate-100 text-slate-600",
    red: "bg-brand-red text-white",
    redSoft: "bg-red-50 text-red-700 ring-1 ring-red-200",
    blue: "bg-blue-50 text-brand-blue",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    violet: "bg-violet-50 text-violet-700",
    navy: "bg-brand-navy text-white",
  };
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function EmptyState({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-blue-200 bg-brand-ice/50 px-6 py-12 text-center">
      <p className="font-bold text-slate-700">{title}</p>
      {text && <p className="mt-1 text-sm text-slate-500">{text}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-end gap-2 pt-4 text-sm text-slate-500">
      <button type="button" className={smallBtn} disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Previous
      </button>
      <span className="px-2">
        Page <strong className="text-slate-800">{page}</strong> of {pages}
      </span>
      <button type="button" className={smallBtn} disabled={page >= pages} onClick={() => onPage(page + 1)}>
        Next
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------
export function Logo({ size = "h-12 w-12", img = "h-9 w-9" }: { size?: string; img?: string }) {
  return (
    <div className={`grid ${size} shrink-0 place-items-center overflow-hidden rounded-xl bg-white shadow-[0_6px_16px_rgba(0,0,0,0.2)] ring-2 ring-white/20`}>
      <img src={carsemLogo} alt="Carsem" draggable={false} className={`${img} select-none object-contain`} />
    </div>
  );
}

/** Logo + app name, used in the app header. */
export function Brand() {
  return (
    <div className="flex items-center gap-3">
      <Logo />
      <div>
        <p className="text-lg font-extrabold tracking-[-0.02em] sm:text-xl">CARSEM DAILY QR &amp; PR</p>
        <p className="hidden text-xs font-medium tracking-wide text-blue-100 sm:block">Open PRs and pending QRs by buyer</p>
      </div>
    </div>
  );
}

/** White panel with the brand top bar and a title area. */
export function Card({
  eyebrow,
  title,
  description,
  actions,
  children,
  className = "",
  bodyClassName = "p-5 sm:p-7",
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={`${panel} ${className}`}>
      <TopBar />
      <div className="flex flex-col gap-3 border-b border-blue-50 bg-gradient-to-r from-white to-brand-ice px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-7">
        <div className="min-w-0">
          {eyebrow && (
            <div className="mb-1 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-brand-red">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-red" />
              {eyebrow}
            </div>
          )}
          <h2 className="text-xl font-extrabold tracking-[-0.02em] text-brand-navy">{title}</h2>
          {description && <div className="mt-1 text-sm text-slate-500">{description}</div>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>
      {children !== undefined && <div className={bodyClassName}>{children}</div>}
    </section>
  );
}

/** Pop-up dialog. */
export function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-brand-navy/50 px-4 py-8 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative w-full ${wide ? "max-w-4xl" : "max-w-lg"} overflow-hidden rounded-2xl bg-white shadow-[0_24px_60px_rgba(7,27,85,0.35)]`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-blue-50 px-5 py-4 sm:px-6">
          <h2 className="text-lg font-extrabold text-brand-navy">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-slate-500 hover:bg-brand-ice hover:text-brand-navy">
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 sm:p-6">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
