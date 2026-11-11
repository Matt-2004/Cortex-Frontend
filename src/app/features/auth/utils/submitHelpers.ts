import { MainResponse } from "@/app/shared/types.ts/main-response";

/** Response used when a submit throws unexpectedly (network, server action crash…). */
export const unexpectedErrorResponse = (
  message = "Something went wrong. Please try again.",
): MainResponse<null> => ({
  isSuccess: false,
  message,
  data: null,
  status: 500,
});
