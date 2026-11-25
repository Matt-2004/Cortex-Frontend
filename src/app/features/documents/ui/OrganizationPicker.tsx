"use client";

import { useId } from "react";
import { clsx } from "clsx";
import {
  roleLabel,
  type Organization,
} from "@/app/features/organizations/types/organization.types";
import { inputLook } from "@/app/features/console/ui/consoleUi";

/**
 * Which organization's files the page shows and uploads to. Only rendered
 * when the user belongs to more than one: with one there is nothing to pick.
 */
export const OrganizationPicker = ({
  organizations,
  selectedId,
  onSelect,
  disabled,
}: {
  organizations: Organization[];
  selectedId: string;
  onSelect: (organizationId: string) => void;
  /** While files upload: they must all land in the organization they started in. */
  disabled?: boolean;
}) => {
  const id = useId();
  return (
    <>
      <label htmlFor={id} className="sr-only">
        Organization
      </label>
      <select
        id={id}
        value={selectedId}
        onChange={(event) => onSelect(event.target.value)}
        disabled={disabled}
        title={disabled ? "Wait for the uploads to finish" : undefined}
        // A fixed width next to Refresh, not the full-width form input.
        className={clsx(inputLook.replace("w-full", "w-56 max-w-full"), "pr-8")}
      >
        {organizations.map((organization) => (
          <option key={organization.id} value={organization.id}>
            {organization.name} · {roleLabel(organization.role)}
          </option>
        ))}
      </select>
    </>
  );
};
