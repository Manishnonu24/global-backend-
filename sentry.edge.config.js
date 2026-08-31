import * as Sentry from "@sentry/nextjs";
import { getSentryOptions } from "./src/lib/observability/sentryOptions.js";

Sentry.init(getSentryOptions());
