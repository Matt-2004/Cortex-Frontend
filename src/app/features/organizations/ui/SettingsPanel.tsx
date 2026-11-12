"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { Check, Copy } from "lucide-react";
import { useToast } from "@/app/features/toast/hooks/useToast";
import { useApiErrorHandler } from "@/app/shared/hooks/useApiErrorHandler";
import { organizationsApi } from "../api/organizationsApi";
import {
  ORGANIZATION_LIMITS,
  OWNER,
  type Organization,
} from "../types/organization.types";
import { useOrganizationAccess } from "@/app/features/console/ui/ConsoleShell";
import {
  Avatar,
  Field,
  Modal,
  Notice,
  Panel,
  Spinner,
  buttonDanger,
  buttonPrimary,
  buttonSecondary,
  formatDate,
  inputLook,
  mutedText,
} from "@/app/features/console/ui/consoleUi";

const isHttpUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
};

type Errors = { name?: string; logoUrl?: string };

/**
 * The Settings tab: rename the organization, set its logo, read its details,
 * and (owners only) delete it.
 */
export const SettingsPanel = ({
  organization,
  editable,
  onSaved,
}: {
  organization: Organization;
  /** False for members: they can read the settings but not change them. */
  editable: boolean;
  onSaved: () => Promise<unknown>;
}) => {
  const { addToastMessage } = useToast();
  const handleApiError = useApiErrorHandler();
  const [name, setName] = useState(organization.name);
  const [logoUrl, setLogoUrl] = useState(organization.logoUrl ?? "");
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);

  const trimmedName = name.trim();
  const trimmedLogo = logoUrl.trim();
  const changed =
    trimmedName !== organization.name ||
    trimmedLogo !== (organization.logoUrl ?? "");

  const reset = () => {
    setName(organization.name);
    setLogoUrl(organization.logoUrl ?? "");
    setErrors({});
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const found: Errors = {};
    if (!trimmedName) found.name = "Enter a name.";
    if (trimmedLogo && !isHttpUrl(trimmedLogo)) {
      found.logoUrl = "Enter a full web address, starting with https://";
    }
    setErrors(found);
    if (found.name || found.logoUrl) return;

    setSaving(true);
    try {
      await organizationsApi.update(organization.id, {
        name: trimmedName,
        logoUrl: trimmedLogo || null,
      });
      await onSaved();
      addToastMessage("success", "Your changes were saved.");
    } catch (error) {
      handleApiError(error, { onFieldErrors: setErrors });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
      <Panel className="p-4 sm:p-6 lg:col-span-7">
        <h2 className="text-base font-semibold">General</h2>
        <p className={clsx("mt-1 text-sm", mutedText)}>
          The name and logo people see for this organization.
        </p>

        {!editable && (
          <div className="mt-5">
            <Notice>
              You are a member of this organization. Only owners and admins can
              change its settings.
            </Notice>
          </div>
        )}

        <form onSubmit={submit} noValidate className="mt-6">
          <fieldset
            disabled={!editable}
            className="flex min-w-0 flex-col gap-5"
          >
            <Field label="Name" htmlFor="settings-name" error={errors.name}>
              <input
                id="settings-name"
                name="name"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setErrors((current) => ({ ...current, name: undefined }));
                }}
                maxLength={ORGANIZATION_LIMITS.nameMax}
                autoComplete="organization"
                required
                aria-invalid={Boolean(errors.name)}
                aria-describedby={
                  errors.name ? "settings-name-error" : undefined
                }
                className={inputLook}
              />
            </Field>

            <Field
              label="Logo URL"
              htmlFor="settings-logo"
              optional
              error={errors.logoUrl}
              hint="A link to a square image. Leave it empty to show initials."
            >
              <div className="flex items-center gap-3">
                <Avatar
                  name={trimmedName || organization.name}
                  src={isHttpUrl(trimmedLogo) ? trimmedLogo : null}
                  shape="square"
                  className="h-10 w-10 text-xs"
                />
                <input
                  id="settings-logo"
                  name="logoUrl"
                  type="url"
                  inputMode="url"
                  value={logoUrl}
                  onChange={(event) => {
                    setLogoUrl(event.target.value);
                    setErrors((current) => ({
                      ...current,
                      logoUrl: undefined,
                    }));
                  }}
                  maxLength={ORGANIZATION_LIMITS.logoUrlMax}
                  placeholder="https://yourstore.com/logo.png"
                  autoComplete="off"
                  spellCheck={false}
                  aria-invalid={Boolean(errors.logoUrl)}
                  aria-describedby={
                    errors.logoUrl
                      ? "settings-logo-error"
                      : "settings-logo-hint"
                  }
                  className={inputLook}
                />
              </div>
            </Field>

            {editable && (
              <div className="mt-1 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={reset}
                  disabled={!changed || saving}
                  className={buttonSecondary}
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={!changed || saving}
                  className={buttonPrimary}
                >
                  {saving && <Spinner />}
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </div>
            )}
          </fieldset>
        </form>
      </Panel>

      <Panel className="self-start p-4 sm:p-6 lg:col-span-5">
        <h2 className="text-base font-semibold">Details</h2>
        <dl className="mt-4 divide-y divide-brand-ink/10 text-sm">
          <Detail label="Organization ID">
            <CopyValue value={organization.id} />
          </Detail>
          <Detail label="Slug">
            <span className="font-receipt text-[13px]">
              {organization.slug}
            </span>
          </Detail>
          <Detail label="Created">{formatDate(organization.createdAt)}</Detail>
        </dl>
      </Panel>

      {organization.role === OWNER && (
        <DeleteOrganization organization={organization} />
      )}
    </div>
  );
};

/** Deleting can't be undone, so the owner types the name to confirm. */
const DeleteOrganization = ({
  organization,
}: {
  organization: Organization;
}) => {
  const router = useRouter();
  const { addToastMessage } = useToast();
  const handleApiError = useApiErrorHandler();
  const { refresh } = useOrganizationAccess();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);

  const confirmed = typed.trim() === organization.name;

  const close = () => {
    if (busy) return;
    setOpen(false);
    setTyped("");
  };

  const remove = async (event: FormEvent) => {
    event.preventDefault();
    if (!confirmed) return;
    setBusy(true);
    try {
      await organizationsApi.remove(organization.id);
      // It may have been the user's last managed organization: the
      // Organizations area can disappear, so know before moving on.
      await refresh();
      addToastMessage("success", `${organization.name} was deleted.`);
      router.replace("/console/organizations");
    } catch (error) {
      handleApiError(error);
      setBusy(false);
    }
  };

  return (
    <Panel className="flex flex-col gap-4 border-[#D92D20]/25 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6 lg:col-span-7">
      <div>
        <h2 className="text-base font-semibold">Delete organization</h2>
        <p className={clsx("mt-1 text-sm", mutedText)}>
          Removes the organization and everyone&apos;s access to it. This
          can&apos;t be undone.
        </p>
      </div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={clsx(buttonDanger, "shrink-0")}
      >
        Delete organization
      </button>

      <Modal
        open={open}
        onClose={close}
        title="Delete this organization?"
        description={`${organization.name} and all its memberships will be removed for good.`}
      >
        <form onSubmit={remove} noValidate className="flex flex-col gap-5">
          <Field
            label={`Type ${organization.name} to confirm`}
            htmlFor="delete-organization-name"
          >
            <input
              id="delete-organization-name"
              name="confirmName"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              disabled={busy}
              className={inputLook}
            />
          </Field>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={close}
              disabled={busy}
              className={buttonSecondary}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!confirmed || busy}
              className={buttonDanger}
            >
              {busy && <Spinner />}
              {busy ? "Deleting…" : "Delete organization"}
            </button>
          </div>
        </form>
      </Modal>
    </Panel>
  );
};

const Detail = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
    <dt className={clsx("text-xs", mutedText)}>{label}</dt>
    <dd className="min-w-0">{children}</dd>
  </div>
);

const CopyValue = ({ value }: { value: string }) => {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard blocked (permissions, insecure origin): the value is
      // still on screen to select by hand.
    }
  };

  return (
    <span className="flex items-center gap-2">
      <span className="min-w-0 font-receipt text-[13px] break-all">
        {value}
      </span>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? "Copied" : "Copy organization ID"}
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[#4B5468] transition-colors duration-150 hover:bg-brand-wash hover:text-brand-ink"
      >
        {copied ? (
          <Check aria-hidden="true" className="h-4 w-4 text-primary-700" />
        ) : (
          <Copy aria-hidden="true" className="h-4 w-4" />
        )}
      </button>
    </span>
  );
};
