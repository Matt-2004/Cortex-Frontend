"use client";

import { useCallback } from "react";
import { useResource } from "@/app/features/console/hooks/useResource";
import { subscriptionsApi } from "@/app/features/organizations/api/subscriptionsApi";
import {
  canManage,
  type Organization,
} from "@/app/features/organizations/types/organization.types";
import { documentsApi } from "../api/documentsApi";

/**
 * One organization's documents, and its plan usage for owners and admins
 * (members get 403 from the subscription endpoint, so it isn't asked).
 *
 * Mount it under `key={organization.id}`: a fresh mount per organization
 * means another organization's list is never shown while this one loads.
 */
export function useOrganizationDocuments(organization: Organization) {
  const { id } = organization;
  const manageable = canManage(organization.role);

  const load = useCallback(
    (signal: AbortSignal) => documentsApi.list(id, signal),
    [id],
  );
  const { resource, reload, retry } = useResource(load);

  const loadUsage = useCallback(
    (signal: AbortSignal) =>
      manageable ? subscriptionsApi.get(id, signal) : Promise.resolve(null),
    [id, manageable],
  );
  const { resource: usage, reload: reloadUsage } = useResource(loadUsage);

  /** Resolves once the backend answered both. */
  const refresh = useCallback(async () => {
    await Promise.all([reload(), reloadUsage()]);
  }, [reload, reloadUsage]);

  return { resource, usage, retry, refresh };
}

export type OrganizationDocuments = ReturnType<typeof useOrganizationDocuments>;
