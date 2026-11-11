import { Suspense } from "react";
import type { Metadata } from "next";
import {
  MemberDetail,
  MemberDetailSkeleton,
} from "@/app/features/organizations/ui/MemberDetail";

export const metadata: Metadata = { title: "Member" };

/** The ids are request data, so they are read behind Suspense (Cache Components). */
export default function MemberPage({
  params,
}: {
  params: Promise<{ organizationId: string; memberId: string }>;
}) {
  return (
    <Suspense fallback={<MemberDetailSkeleton />}>
      {params.then(({ organizationId, memberId }) => (
        <MemberDetail
          key={`${organizationId}/${memberId}`}
          organizationId={organizationId}
          memberUserId={memberId}
        />
      ))}
    </Suspense>
  );
}
