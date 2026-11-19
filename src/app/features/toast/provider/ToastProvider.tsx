"use client";

import { Tokens } from "@/app/features/auth/signIn/types/sign-in-response";
import { MainResponse } from "@/app/shared/types.ts/main-response";
import {
  safeErrorMessage,
  safeSuccessMessage,
} from "@/app/shared/utils/errors/safeMessage";
import clsx from "clsx";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";

import {
  createContext,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type ToastType = "success" | "error" | "warning" | "info";

interface ToastState {
  toastType: ToastType | null;
  message: string | null;
  duration?: number;
  /** Changes on every new toast, so the same message twice restarts it. */
  id?: number;
}

interface ToastContextValue {
  toast: ToastState;
  setToast: React.Dispatch<React.SetStateAction<ToastState>>;
  addToastMessage: (
    toastType: ToastType,
    message: string,
    duration?: number,
  ) => void;
  removeToastMessage: () => void;
  handleToast: (
    res: MainResponse<string | null | Tokens>,
    pathAfterSuccess?: string,
  ) => void;
}

const DEFAULT_TOAST_DURATION = 2500;
/** Errors and warnings stay longer: they usually need reading. */
const LONG_TOAST_DURATION = 5000;

/** One look per status: a light tint, a coloured icon, dark text
    (see --status-* in globals.css). */
const LOOKS: Record<
  ToastType,
  { title: string; icon: LucideIcon; surface: string; iconColor: string }
> = {
  success: {
    title: "Success",
    icon: CheckCircle2,
    surface:
      "border-status-success-border bg-status-success-bg text-status-success-text",
    iconColor: "text-status-success",
  },
  error: {
    title: "Error",
    icon: XCircle,
    surface:
      "border-status-error-border bg-status-error-bg text-status-error-text",
    iconColor: "text-status-error",
  },
  warning: {
    title: "Warning",
    icon: AlertTriangle,
    surface:
      "border-status-warning-border bg-status-warning-bg text-status-warning-text",
    iconColor: "text-status-warning",
  },
  info: {
    title: "Info",
    icon: Info,
    surface:
      "border-status-info-border bg-status-info-bg text-status-info-text",
    iconColor: "text-status-info",
  },
};

export const ToastContext = createContext<ToastContextValue | undefined>(
  undefined,
);

export default function ToastProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [toast, setToast] = useState<ToastState>({
    toastType: null,
    message: null,
    duration: DEFAULT_TOAST_DURATION,
  });
  const [paused, setPaused] = useState(false);

  const addToastMessage = useCallback(
    (toastType: ToastType, message: string, duration?: number) => {
      setPaused(false);
      setToast({
        toastType,
        message,
        duration:
          duration ??
          (toastType === "error" || toastType === "warning"
            ? LONG_TOAST_DURATION
            : DEFAULT_TOAST_DURATION),
        id: Date.now(),
      });
    },
    [],
  );

  const removeToastMessage = useCallback(() => {
    setToast({
      toastType: null,
      message: null,
      duration: DEFAULT_TOAST_DURATION,
    });
  }, []);

  const handleToast = useCallback(
    (res: MainResponse<string | null | Tokens>, pathAfterSuccess?: string) => {
      const duration = DEFAULT_TOAST_DURATION;

      if (res.isSuccess) {
        addToastMessage("success", safeSuccessMessage(res.message), duration);
        if (pathAfterSuccess) {
          setTimeout(() => {
            router.push(pathAfterSuccess);
          }, duration + 150);
        }
      } else {
        addToastMessage(
          "error",
          safeErrorMessage(res.message, res.status),
          LONG_TOAST_DURATION,
        );
      }
    },
    [addToastMessage, router],
  );

  // The timer pauses while the pointer or focus is on the toast, and resumes
  // with the time that was left.
  const remaining = useRef(0);
  const startedAt = useRef(0);

  useEffect(() => {
    remaining.current = toast.duration ?? DEFAULT_TOAST_DURATION;
  }, [toast.id, toast.duration]);

  useEffect(() => {
    if (!toast.toastType || !toast.message || paused) return;

    startedAt.current = performance.now();
    const timeout = window.setTimeout(removeToastMessage, remaining.current);

    return () => {
      window.clearTimeout(timeout);
      remaining.current = Math.max(
        0,
        remaining.current - (performance.now() - startedAt.current),
      );
    };
  }, [toast.toastType, toast.message, toast.id, paused, removeToastMessage]);

  const contextValue = useMemo(
    () => ({
      toast,
      setToast,
      addToastMessage,
      removeToastMessage,
      handleToast,
    }),
    [toast, addToastMessage, removeToastMessage, handleToast],
  );

  const look = toast.toastType ? LOOKS[toast.toastType] : null;
  const urgent = toast.toastType === "error" || toast.toastType === "warning";

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {look && toast.message !== null && (
        <div className="pointer-events-none fixed top-5 left-1/2 z-9999 w-[min(92vw,26rem)] -translate-x-1/2">
          <div
            key={toast.id}
            role={urgent ? "alert" : "status"}
            aria-live={urgent ? "assertive" : "polite"}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
            className={clsx(
              "toast-in pointer-events-auto relative overflow-hidden rounded-box border shadow-[0_12px_32px_-16px_rgba(18,23,42,0.35)]",
              look.surface,
            )}
          >
            <div className="flex items-start gap-3 py-3.5 pr-2.5 pl-4">
              <look.icon
                aria-hidden="true"
                className={clsx("mt-px h-5 w-5 shrink-0", look.iconColor)}
                strokeWidth={2.2}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-5 font-semibold">{look.title}</p>
                <p className="mt-0.5 text-sm leading-5 break-words opacity-90">
                  {toast.message}
                </p>
              </div>
              <button
                type="button"
                onClick={removeToastMessage}
                aria-label="Dismiss notification"
                className="-mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-control opacity-70 transition-[opacity,background-color] hover:bg-black/5 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-current"
              >
                <X aria-hidden="true" className="h-4 w-4" strokeWidth={2.3} />
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}
