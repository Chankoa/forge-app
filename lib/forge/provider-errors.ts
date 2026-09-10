import { NoObjectGeneratedError } from "ai";
import { ForgeError } from "./contracts";

export function classifyProviderError(error: unknown, timedOut = false): ForgeError {
  if (timedOut) return new ForgeError("timeout");
  if (error instanceof ForgeError) return error;
  if (NoObjectGeneratedError.isInstance(error)) return new ForgeError("invalid_result");
  const status = typeof error === "object" && error && "statusCode" in error && typeof error.statusCode === "number" ? error.statusCode : undefined;
  if (status === 401 || status === 403) return new ForgeError("provider_auth");
  if (status === 404) return new ForgeError("provider_not_found");
  if (status === 429) return new ForgeError("rate_limited");
  if (status === undefined && error instanceof TypeError) return new ForgeError("provider_network");
  return new ForgeError("provider_error");
}