import {
  CalendarCheck2,
  CheckCircle2,
  ClipboardPenLine,
  CloudSun,
  ShieldCheck,
} from "lucide-react";
import { BrandHeader } from "@/components/layout/brand-header";

const steps = [
  { label: "Describe", icon: ClipboardPenLine },
  { label: "Verify", icon: CheckCircle2 },
  { label: "Conditions", icon: CloudSun },
  { label: "Safer shift", icon: CalendarCheck2 },
] as const;

export default function Home() {
  return (
    <main
      id="main-content"
      className="min-h-screen bg-[var(--sand-50)] text-[var(--navy-950)]"
    >
      <BrandHeader />

      <section className="mx-auto flex w-full max-w-6xl flex-col px-5 pb-10 pt-12 sm:px-8 sm:pt-16 lg:px-10 lg:pb-14 lg:pt-20">
        <div className="grid items-end gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3.5 py-2 text-sm font-semibold text-amber-950">
              <ShieldCheck aria-hidden="true" className="size-4" />
              Outdoor shift planning
            </div>

            <h1 className="max-w-3xl text-balance text-4xl font-bold leading-[1.08] tracking-[-0.035em] sm:text-5xl lg:text-6xl">
              Turn tomorrow&apos;s outdoor work plan into a safer shift.
            </h1>

            <p className="mt-6 max-w-2xl text-pretty text-lg leading-8 text-[var(--navy-700)] sm:text-xl">
              Prepare one crew&apos;s workday around verified tasks, forecast
              conditions, and clear operational safety rules.
            </p>

            <button
              type="button"
              disabled
              aria-describedby="planning-status"
              className="mt-8 inline-flex min-h-12 items-center justify-center rounded-lg bg-amber-500 px-6 py-3 font-bold text-[var(--navy-950)] opacity-65 shadow-sm disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300 focus-visible:ring-offset-2"
            >
              Start planning
            </button>
            <p id="planning-status" className="mt-2 text-sm text-[var(--navy-600)]">
              Planning workflow coming next
            </p>
          </div>

          <aside className="rounded-2xl border border-[var(--sand-300)] bg-white p-6 shadow-[0_18px_50px_rgba(16,37,55,0.08)]">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--navy-600)]">
              Foundation release
            </p>
            <p className="mt-3 text-lg font-bold">Built for deliberate planning</p>
            <p className="mt-2 text-sm leading-6 text-[var(--navy-700)]">
              The scheduling workflow is intentionally unavailable while its
              deterministic safety foundation is prepared.
            </p>
          </aside>
        </div>

        <section aria-labelledby="planning-flow" className="mt-16 sm:mt-20">
          <h2 id="planning-flow" className="sr-only">
            Planning flow
          </h2>
          <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map(({ label, icon: Icon }, index) => (
              <li
                key={label}
                className="relative flex min-h-32 items-center gap-4 rounded-xl border border-[var(--sand-300)] bg-[var(--sand-100)] p-5"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-white text-amber-700 shadow-sm ring-1 ring-[var(--sand-300)]">
                  <Icon aria-hidden="true" className="size-5" strokeWidth={2} />
                </span>
                <span>
                  <span className="block text-xs font-bold tabular-nums text-[var(--navy-500)]">
                    0{index + 1}
                  </span>
                  <span className="mt-1 block font-bold">{label}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <footer className="mt-8 flex items-start gap-3 border-t border-[var(--sand-300)] pt-6 text-sm leading-6 text-[var(--navy-700)]">
          <ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-amber-700" />
          <p>
            Planning guidance only. Verify conditions using qualified on-site
            safety procedures.
          </p>
        </footer>
      </section>
    </main>
  );
}
