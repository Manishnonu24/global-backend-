// src/lib/observability/requestContext.js
import crypto from "crypto";

/**
 * Shared request-ID helper.
 * Extracts a valid x-request-id from an incoming Request object (Next.js Request or similar)
 * or generates a new one.
 */
export function getRequestId(request) {
  let reqId = null;
  if (request?.headers?.get) {
    reqId = request.headers.get("x-request-id");
  } else if (request?.headers && typeof request.headers === "object" && request.headers["x-request-id"]) {
    reqId = request.headers["x-request-id"];
  }
  
  if (!reqId || typeof reqId !== 'string') {
    return crypto.randomUUID();
  }
  
  return reqId;
}
