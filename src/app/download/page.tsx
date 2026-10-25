import Link from "next/link";
import { headers } from "next/headers";
import { Logo } from "@/components/brand/Logo";
import { DownloadPicker } from "@/components/marketing/DownloadPicker";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  formatSize,
  latestRelease,
  platformFromUserAgent,
  releaseHistory,
} from "@/lib/posReleases";

export const metadata = {
  title: "Download the POS app",
  description: "The till app for Android, Windows and Linux.",
};

const longDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

/** Public downloads page for the till: the newest release for the visitor's platform, what changed, and older versions. */
export default async function DownloadPage() {
  const [latest, history, ua] = await Promise.all([
    latestRelease(),
    releaseHistory(),
    headers().then((h) => h.get("user-agent") ?? ""),
  ]);
  const older = history.filter((r) => r.version !== latest?.version);

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-space-3 px-space-4 py-space-4 md:px-space-7 lg:px-space-9">
        <Link href="/" aria-label="Home">
          <Logo />
        </Link>
        <Button href="/portal/login" variant="secondary" size="md">
          Sign in
        </Button>
      </header>

      <main className="mx-auto max-w-[880px] px-space-4 pt-space-7 pb-space-9 md:px-space-7">
        <p className="mb-space-2 text-[12px] font-bold tracking-[0.12em] text-brand-600 uppercase">
          POS app
        </p>
        <h1 className="text-display-lg mb-space-3">Download the till</h1>
        <p className="mb-space-6 max-w-[560px] text-[14px] text-ink-600">
          Install the POS app on the tablet or computer at your counter, then
          pair it with your branch from the portal. It keeps billing when the
          internet drops and syncs when it is back.
        </p>

        {latest ? (
          <>
            <Card className="p-space-5 md:p-space-6">
              <p className="mb-space-4 text-[13px] text-ink-600">
                Version{" "}
                <strong className="text-ink-900">{latest.version}</strong> ·{" "}
                {longDate(latest.date)}
              </p>
              <DownloadPicker
                release={latest}
                initial={platformFromUserAgent(ua)}
              />
            </Card>

            {latest.notes && (
              <section className="mt-space-7">
                <h2 className="mb-space-3 text-[18px] font-semibold text-ink-900">
                  What&apos;s new in {latest.version}
                </h2>
                <p className="text-[14px] whitespace-pre-line text-ink-600">
                  {latest.notes}
                </p>
              </section>
            )}

            {older.length > 0 && (
              <section className="mt-space-7">
                <h2 className="mb-space-3 text-[18px] font-semibold text-ink-900">
                  Older versions
                </h2>
                <ul className="divide-y divide-line rounded-lg border border-line bg-card">
                  {older.map((r) => (
                    <li
                      key={r.version}
                      className="flex flex-wrap items-center gap-x-space-4 gap-y-1 px-space-4 py-space-3 text-[13.5px]"
                    >
                      <span className="font-semibold text-ink-900">
                        {r.version}
                      </span>
                      <span className="text-ink-400">{longDate(r.date)}</span>
                      <span className="ml-auto flex flex-wrap gap-x-space-3">
                        {Object.values(r.files).map((f) => (
                          <a
                            key={f.name}
                            href={f.url}
                            className="text-brand-600 hover:underline"
                          >
                            {f.name.split(".").slice(-1)[0] === "gz"
                              ? "tar.gz"
                              : f.name.split(".").slice(-1)[0]}{" "}
                            ({formatSize(f.size)})
                          </a>
                        ))}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        ) : (
          <Card className="p-space-6 text-[14px] text-ink-600">
            The first version is on its way. Check back soon, or ask us for the
            app.
          </Card>
        )}
      </main>

      <SiteFooter />
    </>
  );
}
