"use client";

import { useCallback, useState } from "react";
import { useResource } from "@/app/features/console/hooks/useResource";
import { organizationsApi } from "@/app/features/organizations/api/organizationsApi";
import {
  canManage,
  type Organization,
} from "@/app/features/organizations/types/organization.types";

// Remembers the viewer's last choice on this browser only. A convenience:
// without it the page simply picks again.
const CHOICE_KEY = "cortex.documentsOrganization";

const readChoice = () => {
  try {
    return typeof window === "undefined"
      ? null
      : window.localStorage.getItem(CHOICE_KEY);
  } catch {
    return null;
  }
};

/**
 * Which organization the uploaded files belong to. Documents live under an
 * organization in the backend, so the page needs one chosen.
 *
 * Choice order: the one picked last time (if the user still belongs to it),
 * else the first one they can manage, else the first one at all. Never a
 * hard-coded id: every option comes from GET /api/organizations.
 */
export function useDocumentOrganizations() {
  const load = useCallback(
    (signal: AbortSignal) => organizationsApi.list(signal),
    [],
  );
  const { resource, retry } = useResource(load);
  const [chosenId, setChosenId] = useState<string | null>(readChoice);

  const organizations: Organization[] =
    resource.status === "ready"
      ? [...resource.data].sort((a, b) => a.name.localeCompare(b.name))
      : [];
  const selected =
    organizations.find((entry) => entry.id === chosenId) ??
    organizations.find((entry) => canManage(entry.role)) ??
    organizations[0] ??
    null;

  const select = useCallback((organizationId: string) => {
    setChosenId(organizationId);
    try {
      window.localStorage.setItem(CHOICE_KEY, organizationId);
    } catch {
      // Storage blocked: the choice lasts until the page reloads.
    }
  }, []);

  return { resource, organizations, selected, select, retry };
}
