"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  Suspense,
  type ReactNode,
} from "react";
import { flushSync } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clsx } from "clsx";
import {
  BookOpen,
  Building2,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  X,
  type LucideIcon,
} from "lucide-react";
import { authApi } from "@/app/features/auth/api/authApi";
import { organizationsApi } from "@/app/features/organizations/api/organizationsApi";
import { canManage } from "@/app/features/organizations/types/organization.types";
import type { User } from "@/app/features/auth/types/auth-api.types";
import { Container } from "@/app/features/landing/ui/primitives";
import { useToast } from "@/app/features/toast/hooks/useToast";
import {
  SIGN_IN_PATH,
  sessionEndedSignInPath,
  useApiErrorHandler,
} from "@/app/shared/hooks/useApiErrorHandler";
import { isAbortError, toApiError } from "@/app/shared/utils/errors/apiError";
import { Avatar, ErrorState, Skeleton, Spinner, mutedText } from "./consoleUi";

const ConsoleUserContext = createContext<User | null>(null);

/**
 * What the signed-in user may see of the Organizations area, from their
 * roles across all their organizations:
 * - "manager": owner or admin somewhere → sees Organizations.
 * - "none": in no organization yet → sees it, to create their first.
 * - "member-only": only ever a plain member → it is hidden.
 * - "unknown": still loading → the sidebar shows what the last visit found
 *   (see useShowsOrganizationsTab), so the tab doesn't wait for the backend.
 */
export type OrganizationAccess = "unknown" | "manager" | "none" | "member-only";

const OrganizationAccessContext = createContext<{
  access: OrganizationAccess;
  /** Reads the roles again; resolves once the backend has answered. */
  refresh: () => Promise<void>;
}>({ access: "unknown", refresh: async () => {} });

export const useOrganizationAccess = () =>
  useContext(OrganizationAccessContext);

export const canSeeOrganizations = (access: OrganizationAccess) =>
  access === "manager" || access === "none";

/* The sidebar doesn't wait for the backend to show the Organizations tab:
   it starts from the answer of the last visit, kept in this browser. Only a
   remembered "member-only" hides it; with no memory it shows, since most
   users may open it and the pages themselves say when they may not. */
const ACCESS_KEY = "cortex.organizationAccess";

const rememberAccess = (access: OrganizationAccess) => {
  try {
    window.localStorage.setItem(ACCESS_KEY, access);
  } catch {
    // Storage blocked (private window…): the tab just shows by default.
  }
};

const forgetAccess = () => {
  try {
    window.localStorage.removeItem(ACCESS_KEY);
  } catch {
    // Storage blocked: nothing was remembered.
  }
};

const readRememberedAccess = () => {
  try {
    return window.localStorage.getItem(ACCESS_KEY);
  } catch {
    return null;
  }
};

// Nothing to subscribe to: it is read once, before the backend answers.
const subscribeToNothing = () => () => {};

/** Whether the sidebar lists Organizations, known or not yet. */
const useShowsOrganizationsTab = () => {
  const { access } = useOrganizationAccess();
  const remembered = useSyncExternalStore(
    subscribeToNothing,
    readRememberedAccess,
    () => null,
  );
  return (access === "unknown" ? remembered : access) !== "member-only";
};

/** The signed-in user. Only available inside <SignedIn>. */
export function useConsoleUser(): User {
  const user = useContext(ConsoleUserContext);
  if (!user) throw new Error("useConsoleUser must be used inside <SignedIn>");
  return user;
}

/**
 * Renders a screen once the signed-in user is known, and `fallback` (its
 * skeleton) until then. Each screen wraps itself in this, so nothing in it
 * asks the API for data before the session check has finished.
 */
export const SignedIn = ({
  fallback,
  children,
}: {
  fallback: ReactNode;
  children: ReactNode;
}) => (useContext(ConsoleUserContext) ? children : fallback);

type Session =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; user: User };

type NavItem = { href: string; label: string; icon: LucideIcon };

/** Sidebar sections. Organizations matches its detail pages too. */
const NAV: { heading: string; items: NavItem[] }[] = [
  {
    heading: "Workspace",
    items: [
      { href: "/console", label: "Overview", icon: LayoutDashboard },
      {
        href: "/console/organizations",
        label: "Organizations",
        icon: Building2,
      },
    ],
  },
  {
    heading: "Assistant",
    items: [
      { href: "/console/knowledge", label: "Knowledge base", icon: BookOpen },
      { href: "/console/chat", label: "Chat", icon: MessageSquare },
    ],
  },
];

const isActive = (pathname: string, href: string) =>
  href === "/console"
    ? pathname === "/console"
    : pathname === href || pathname.startsWith(`${href}/`);

const ConsoleBrand = () => (
  <Link
    href="/console"
    aria-label="Cortex console"
    className="inline-flex shrink-0 items-center gap-2.5 rounded-badge"
  >
    <Image
      src="/brand/cortex-cx-mark.svg"
      alt=""
      width={26}
      height={26}
      priority
    />
    <span className="text-[17px] font-semibold tracking-[-0.02em]">Cortex</span>
    <span className="rounded-badge bg-brand-wash px-1.5 py-0.5 font-receipt text-[10px] tracking-[0.1em] text-primary-800 uppercase">
      Console
    </span>
  </Link>
);

/**
 * The current path is request data, so with Cache Components the highlighted
 * nav streams in behind Suspense; the fallback is the same list, unhighlighted.
 */
const SidebarNav = ({ onNavigate }: { onNavigate?: () => void }) => (
  <Suspense fallback={<NavList pathname="" onNavigate={onNavigate} />}>
    <CurrentNav onNavigate={onNavigate} />
  </Suspense>
);

const CurrentNav = ({ onNavigate }: { onNavigate?: () => void }) => (
  <NavList pathname={usePathname()} onNavigate={onNavigate} />
);

const NavList = ({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) => {
  const showsOrganizations = useShowsOrganizationsTab();
  return (
    <nav aria-label="Console" className="flex flex-col gap-5">
      {NAV.map(({ heading, items }, index) => (
        <div
          key={heading}
          className={clsx(index > 0 && "border-t border-brand-ink/10 pt-5")}
        >
          <h2 className="sr-only">{heading}</h2>
          <ul className="flex flex-col gap-0.5">
            {items
              .filter(
                ({ href }) =>
                  href !== "/console/organizations" || showsOrganizations,
              )
              .map(({ href, label, icon: Icon }) => {
                const active = isActive(pathname, href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={clsx(
                        "flex h-10 items-center gap-3 rounded-control px-3 text-sm transition-colors duration-150",
                        active
                          ? "bg-brand-wash font-medium text-primary-800"
                          : "text-brand-ink-muted hover:bg-brand-mist hover:text-brand-ink",
                      )}
                    >
                      <Icon
                        aria-hidden="true"
                        className={clsx(
                          "h-4 w-4 shrink-0",
                          active ? "text-primary-700" : "text-brand-ink-subtle",
                        )}
                      />
                      {label}
                    </Link>
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
    </nav>
  );
};

/**
 * Frame around every console screen: a left sidebar (a drawer below lg) and
 * the session check. Nothing of the console shows until `/api/auth/me` has
 * confirmed the session: the proxy only looks at whether cookies exist.
 */
export const ConsoleShell = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const { addToastMessage } = useToast();
  const handleApiError = useApiErrorHandler();
  const [session, setSession] = useState<Session>({ status: "loading" });
  const [signingOut, setSigningOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [access, setAccess] = useState<OrganizationAccess>("unknown");
  const sessionCheck = useRef<AbortController | null>(null);
  // Stops a roles request still in flight at logout from re-saving them.
  const signedOut = useRef(false);

  // Roles decide whether Organizations shows. If the list can't be read,
  // fall back to showing it: the backend still refuses what isn't allowed.
  const loadAccess = useCallback(async () => {
    try {
      const organizations = await organizationsApi.list();
      if (signedOut.current) return;
      const next: OrganizationAccess =
        organizations.length === 0
          ? "none"
          : organizations.some((o) => canManage(o.role))
            ? "manager"
            : "member-only";
      setAccess(next);
      rememberAccess(next);
    } catch {
      setAccess("manager");
    }
  }, []);

  const loadUser = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const user = await authApi.me(signal);
        if (signal?.aborted) return;
        setSession({ status: "ready", user });
        void loadAccess();
      } catch (error) {
        if (signal?.aborted || isAbortError(error)) return;
        const apiError = toApiError(error);
        if (apiError.status === 401) {
          // Not signed in (or the session ended): the console is private.
          addToastMessage("info", "Sign in to open the console.");
          router.replace(sessionEndedSignInPath());
          return;
        }
        setSession({ status: "error", message: apiError.message });
      }
    },
    [addToastMessage, router, loadAccess],
  );

  // The one session check: a newer run cancels the one before it.
  const checkSession = useCallback(() => {
    sessionCheck.current?.abort();
    const controller = new AbortController();
    sessionCheck.current = controller;
    void loadUser(controller.signal);
  }, [loadUser]);

  useEffect(() => {
    checkSession();

    // Back/Forward can restore this page from the browser's memory without
    // any request, so the proxy never sees it. Check the session again.
    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      signedOut.current = false;
      setSigningOut(false);
      setMenuOpen(false);
      setSession({ status: "loading" });
      checkSession();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => {
      window.removeEventListener("pageshow", onPageShow);
      sessionCheck.current?.abort();
    };
  }, [checkSession]);

  const signOut = async () => {
    setSigningOut(true);
    try {
      await authApi.logout();
    } catch (error) {
      handleApiError(error);
      setSigningOut(false);
      return;
    }
    signedOut.current = true;
    sessionCheck.current?.abort();
    forgetAccess();
    // Committed before leaving, so a copy of this page kept for Back holds
    // no user data. A full load also empties Next's in-memory route cache.
    flushSync(() => setSession({ status: "loading" }));
    window.location.replace(SIGN_IN_PATH);
  };

  if (session.status === "loading") {
    return (
      <div
        role="status"
        aria-label="Checking your session"
        className="h-dvh bg-brand-wash"
      />
    );
  }

  const user = session.status === "ready" ? session.user : null;

  const account = (
    <div className="flex items-center gap-3 border-t border-brand-ink/10 pt-4">
      {user ? (
        <>
          <Avatar name={user.name || user.email} src={user.avatarUrl} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm leading-tight font-medium">
              {user.name}
            </p>
            <p className={clsx("truncate text-xs", mutedText)}>{user.email}</p>
          </div>
          <button
            type="button"
            onClick={signOut}
            disabled={signingOut}
            aria-label="Sign out"
            title="Sign out"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-control text-brand-ink-muted transition-colors duration-150 hover:bg-brand-wash hover:text-brand-ink disabled:pointer-events-none disabled:opacity-60"
          >
            {signingOut ? (
              <Spinner />
            ) : (
              <LogOut aria-hidden="true" className="h-4 w-4" />
            )}
          </button>
        </>
      ) : (
        <>
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="mt-1.5 h-3 w-32" />
          </div>
        </>
      )}
    </div>
  );

  const sidebar = (onNavigate?: () => void) => (
    <div className="flex h-full flex-col px-4 py-5">
      <div className="px-2">
        <ConsoleBrand />
      </div>
      <div className="mt-8 flex-1">
        <SidebarNav onNavigate={onNavigate} />
      </div>
      {account}
    </div>
  );

  return (
    <OrganizationAccessContext.Provider value={{ access, refresh: loadAccess }}>
      <div className="console-theme flex h-dvh flex-col bg-white text-brand-ink lg:flex-row">
        <a
          href="#console-main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[60] focus:rounded-control focus:bg-primary-700 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
        >
          Skip to content
        </a>

        {/* Desktop sidebar */}
        <aside className="hidden w-64 shrink-0 border-r border-brand-ink/10 bg-white lg:block">
          {sidebar()}
        </aside>

        {/* Small screens: a bar with a menu button that opens the sidebar as a drawer */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-brand-ink/10 bg-white px-4 lg:hidden">
          <ConsoleBrand />
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-expanded={menuOpen}
            aria-controls="console-drawer"
            className="inline-flex h-9 items-center gap-2 rounded-control border border-brand-ink/15 px-3 text-sm font-medium transition-colors hover:bg-brand-wash"
          >
            <Menu aria-hidden="true" className="h-4 w-4" />
            Menu
          </button>
        </header>

        {menuOpen && (
          <div
            className="fixed inset-0 z-50 lg:hidden"
            onKeyDown={(event) => {
              if (event.key === "Escape") setMenuOpen(false);
            }}
          >
            <button
              type="button"
              aria-label="Close menu"
              tabIndex={-1}
              onClick={() => setMenuOpen(false)}
              className="absolute inset-0 bg-black/35"
            />
            <aside
              id="console-drawer"
              aria-label="Console menu"
              className="absolute inset-y-0 left-0 w-[min(18rem,85vw)] bg-white shadow-[16px_0_32px_-16px_rgba(18,23,42,0.35)]"
            >
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
                autoFocus
                className="absolute top-4 right-3 inline-flex h-9 w-9 items-center justify-center rounded-control text-brand-ink-muted hover:bg-brand-wash"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
              {sidebar(() => setMenuOpen(false))}
            </aside>
          </div>
        )}

        <main
          id="console-main"
          className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-brand-wash"
        >
          {session.status !== "error" && (
            <ConsoleUserContext.Provider value={user}>
              {children}
            </ConsoleUserContext.Provider>
          )}

          {session.status === "error" && (
            <Container className="py-12">
              <ErrorState
                title="The console could not load"
                message={session.message}
                onRetry={() => {
                  setSession({ status: "loading" });
                  checkSession();
                }}
              />
            </Container>
          )}
        </main>
      </div>
    </OrganizationAccessContext.Provider>
  );
};

/**
 * The band at the top of a console screen: where you are, the screen's title
 * and its main action.
 */
export const PageHeader = ({
  breadcrumb,
  title,
  description,
  media,
  actions,
  children,
  overlap,
}: {
  /** Extra room at the bottom for a panel that rises into the band. */
  overlap?: boolean;
  breadcrumb?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  media?: ReactNode;
  actions?: ReactNode;
  /** Sits flush with the band's bottom edge (tabs). */
  children?: ReactNode;
}) => (
  <div className="border-b border-brand-ink/10 bg-brand-wash">
    <Container
      className={clsx(
        "pt-5 sm:pt-6",
        children ? "" : overlap ? "pb-16 sm:pb-20" : "pb-5 sm:pb-6",
      )}
    >
      {breadcrumb && (
        <div className={clsx("mb-2 text-xs", mutedText)}>{breadcrumb}</div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="flex min-w-0 items-center gap-3">
          {media}
          <div className="min-w-0">
            <h1 className="text-xl leading-tight font-semibold tracking-[-0.01em] break-words sm:text-2xl">
              {title}
            </h1>
            {description && (
              <div
                className={clsx(
                  "mt-1 max-w-2xl text-sm text-pretty",
                  mutedText,
                )}
              >
                {description}
              </div>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        )}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </Container>
  </div>
);
