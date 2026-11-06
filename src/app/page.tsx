import { getServerSession } from "next-auth";
import Link from "next/link";
import { Suspense } from "react";

import { authOptions } from "@/auth";

export default async function HomePage() {
  return (
    <Suspense fallback={<HomeShell><p>Loading your session...</p></HomeShell>}>
      <AuthenticatedHome />
    </Suspense>
  );
}

async function AuthenticatedHome() {
  const session = await getServerSession(authOptions);
  const summary = session?.authSummary;

  return (
    <HomeShell>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">
          Gear Up
        </p>
        <h1 className="mt-4 text-4xl font-semibold">Hello</h1>
        <p className="mt-4 text-slate-300">
          {session?.user?.email
            ? `You are signed in as ${session.user.email}.`
            : "Welcome to the authentication demo."}
        </p>

        {summary ? (
          <section className="mt-10 rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold">Google login details</h2>
            <p className="mt-2 text-sm text-amber-300">
              Secret token values are intentionally never rendered in the
              browser.
            </p>
            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
              <Detail label="Provider" value={summary.provider} />
              <Detail label="Type" value={summary.type} />
              <Detail
                label="Provider account ID"
                value={summary.providerAccountId}
              />
              <Detail label="Token type" value={summary.tokenType} />
              <Detail label="Scope" value={summary.scope} />
              <Detail
                label="Expires at"
                value={
                  summary.expiresAt
                    ? new Date(summary.expiresAt * 1000).toISOString()
                    : "Unavailable"
                }
              />
              <Detail
                label="Access token"
                value={summary.hasAccessToken ? "Present (hidden)" : "Not returned"}
              />
              <Detail
                label="Refresh token"
                value={summary.hasRefreshToken ? "Present (hidden)" : "Not returned"}
              />
              <Detail
                label="ID token"
                value={summary.hasIdToken ? "Present (hidden)" : "Not returned"}
              />
            </dl>
          </section>
        ) : (
          <Link
            href="/auth/login"
            className="mt-8 inline-flex rounded-lg bg-emerald-400 px-5 py-3 font-semibold text-slate-950 hover:bg-emerald-300"
          >
            Sign in with Google
          </Link>
        )}
    </HomeShell>
  );
}

function HomeShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-dvh bg-slate-950 px-6 py-16 text-slate-100">
      <div className="mx-auto max-w-3xl">{children}</div>
    </main>
  );
}

function Detail({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 break-all text-sm text-slate-200">
        {value ?? "Unavailable"}
      </dd>
    </div>
  );
}
