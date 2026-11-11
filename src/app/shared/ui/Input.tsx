"use client";

import {
  InputHTMLAttributes,
  ReactNode,
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { clsx } from "clsx";
import { Eye, EyeOff } from "lucide-react";
import { buildClassName, fillDetailInputBaseClass } from "./shared-index";
import { shakeElement } from "./shake";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  type:
    | "email"
    | "password"
    | "text"
    | "checkbox"
    | "date"
    | "tel"
    | "number"
    | "file"
    | "month"
    | "Checkbox"
    | "time";

  children: ReactNode;
  error?: string;
}

const AuthInput = forwardRef<
  HTMLInputElement,
  Partial<InputProps> & {
    /** Show the error even if the field hasn't been blurred yet. */
    forceShowError?: boolean;
    /** Extra content rendered under the input (e.g. a requirements list). */
    hint?: ReactNode;
    /**
     * Change this number (e.g. a failed-submit counter) to shake the field
     * again if it's still invalid.
     */
    shakeSignal?: number;
  }
>((props, ref) => {
  const {
    type = "email",
    children,
    error,
    name,
    onBlur,
    forceShowError = false,
    hint,
    shakeSignal = 0,
    ...rest
  } = props;
  // "Touched" = the user typed something and then left the field. Errors
  // stay hidden while someone types for the first time (and when they just
  // tab past an empty field); after that they update live. Forms pass
  // `forceShowError` after a failed submit so empty required fields show too.
  const [isTouched, setIsTouched] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const generatedId = useId();

  const shouldShowError = Boolean(error) && (isTouched || forceShowError);

  // Shake the input box when an error first appears (wrong format on blur)
  // and again on every failed submit while it's still invalid.
  const shakeTargetRef = useRef<HTMLDivElement>(null);
  const showErrorRef = useRef(shouldShowError);
  useEffect(() => {
    if (shouldShowError && !showErrorRef.current) {
      shakeElement(shakeTargetRef.current);
    }
    showErrorRef.current = shouldShowError;
  }, [shouldShowError]);
  useEffect(() => {
    if (shakeSignal > 0 && showErrorRef.current) {
      shakeElement(shakeTargetRef.current);
    }
  }, [shakeSignal]);

  const inputType = type === "password" && showPassword ? "text" : type;
  // Always have an id so the <label> and error/hint are associated.
  const inputId = rest.id ?? name ?? generatedId;
  const errorId = inputId ? `${inputId}-error` : undefined;
  const hintId = inputId && hint ? `${inputId}-hint` : undefined;
  const describedBy =
    [shouldShowError ? errorId : null, hintId].filter(Boolean).join(" ") ||
    undefined;

  return (
    <div
      className="group/field flex w-full flex-col gap-1.5"
      data-invalid={shouldShowError || undefined}
      data-touched={isTouched || undefined}
    >
      <label
        htmlFor={inputId}
        className={clsx(
          "text-sm",
          shouldShowError ? "text-red-500" : "text-gray-500",
        )}
      >
        {children}
      </label>
      <div ref={shakeTargetRef} className="relative flex w-full items-center">
        <input
          name={name}
          {...rest}
          id={inputId}
          ref={ref}
          type={inputType}
          aria-invalid={shouldShowError || undefined}
          aria-describedby={describedBy}
          onBlur={(e) => {
            if (e.currentTarget.value.length > 0) setIsTouched(true);
            onBlur?.(e);
          }}
          className={clsx(
            "w-full rounded-lg border bg-[#E8E9E0] px-4 py-2 text-black transition-colors placeholder:text-sm placeholder:text-gray-400 focus:text-primary focus:ring-primary focus:outline-none focus:placeholder:text-gray-500",
            type === "password" && "pr-11",
            shouldShowError
              ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
              : "border-gray-200",
          )}
        />
        {type === "password" && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            // Static name + aria-pressed: screen readers announce
            // "Show password, toggle button, pressed / not pressed".
            aria-label="Show password"
            aria-pressed={showPassword}
            aria-controls={inputId}
            className="absolute top-1/2 right-2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded text-gray-400 hover:text-gray-600 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-brand-teal"
          >
            {showPassword ? (
              <EyeOff aria-hidden="true" className="h-5 w-5" />
            ) : (
              <Eye aria-hidden="true" className="h-5 w-5" />
            )}
          </button>
        )}
      </div>
      {shouldShowError && (
        <p
          id={errorId}
          data-slot="error"
          className="text-xs font-medium text-red-500"
        >
          {error}
        </p>
      )}
      {hint ? <div id={hintId}>{hint}</div> : null}
    </div>
  );
});

AuthInput.displayName = "AuthInput";

export default AuthInput;

export const Input = ({
  inputRef,
  leadingIcon,
  className,
  label,
  labelClassName,
  id,
  name,
  placeholder,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  inputRef?: React.Ref<HTMLInputElement>;
  leadingIcon?: ReactNode;
  label?: string;
  labelClassName?: string;
}) => {
  const inputId = id ?? name;
  const ariaLabel =
    props["aria-label"] ?? label ?? placeholder ?? name ?? undefined;
  return (
    <div className="relative">
      {label && inputId && (
        <label htmlFor={inputId} className={clsx("sr-only", labelClassName)}>
          {label}
        </label>
      )}
      {leadingIcon && (
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-gray-400">
          {leadingIcon}
        </span>
      )}
      <input
        required
        ref={inputRef}
        id={inputId}
        name={name}
        placeholder={placeholder}
        aria-label={ariaLabel}
        {...props}
        className={buildClassName(
          fillDetailInputBaseClass,
          leadingIcon ? "py-1.5 pr-4 pl-9" : "px-4 py-1.5",
          className,
        )}
      />
    </div>
  );
};

Input.displayName = "Input";
