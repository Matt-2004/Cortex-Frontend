"use client";

import { useState, type FormEvent } from "react";
import { clsx } from "clsx";
import { useToast } from "@/app/features/toast/hooks/useToast";
import { useApiErrorHandler } from "@/app/shared/hooks/useApiErrorHandler";
import { organizationsApi } from "../api/organizationsApi";
import {
  ORGANIZATION_LIMITS,
  type Organization,
} from "../types/organization.types";
import {
  Avatar,
  CopyValue,
  DetailList,
  DetailRow,
  Field,
  Notice,
  Panel,
  PanelHeader,
  Spinner,
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
 * The Settings tab: rename the organization, set its logo, read its details.
 * The API has no delete endpoint, so there is no delete action.
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
    <div className="flex max-w-3xl flex-col gap-4">
      {!editable && (
        <Notice>
          You are a member of this organization. Only owners and admins can
          change its settings.
        </Notice>
      )}

      <Panel className="overflow-hidden">
        <section aria-labelledby="settings-general">
          <PanelHeader
            id="settings-general"
            title="General"
            description="The name and logo people see for this organization."
          />
          <form onSubmit={submit} noValidate>
            <fieldset disabled={!editable} className="min-w-0">
              <div className="flex flex-col gap-4 p-4">
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
                  <div className="flex items-center gap-2">
                    <Avatar
                      name={trimmedName || organization.name}
                      src={isHttpUrl(trimmedLogo) ? trimmedLogo : null}
                      shape="square"
                      className="h-9 w-9 border border-brand-ink/10 text-xs"
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
              </div>

              {editable && (
                <div className="flex flex-col-reverse gap-2 border-t border-brand-ink/10 bg-brand-mist/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-end">
                  {changed && (
                    <p className={clsx("text-xs sm:mr-auto", mutedText)}>
                      You have unsaved changes.
                    </p>
                  )}
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
        </section>
      </Panel>

      <Panel className="overflow-hidden">
        <section aria-labelledby="settings-details">
          <PanelHeader id="settings-details" title="Details" />
          <DetailList>
            <DetailRow label="Organization ID">
              <CopyValue value={organization.id} label="organization ID" />
            </DetailRow>
            <DetailRow label="Slug">
              <span translate="no">{organization.slug}</span>
            </DetailRow>
            <DetailRow label="Created">
              {formatDate(organization.createdAt)}
            </DetailRow>
          </DetailList>
        </section>
      </Panel>
    </div>
  );
};
