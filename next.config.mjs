import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  // Treat these as server external packages so Next.js server-side bundler doesn't try to bundle JSDOM/dompurify sub-dependencies or pino transports.
  serverExternalPackages: ["isomorphic-dompurify", "jsdom", "bullmq", "pino", "pino-loki"],
  experimental: {
    serverActions: {
      bodySizeLimit: "100mb",
    },
    proxyClientMaxBodySize: "100mb",
  },
  async headers() {
    return [
      {
        // Cache DearFlip / PDF.js / Three.js static assets with background revalidation.
        // Revalidating cache prevents stale script versions from being locked in client browsers.
        source: "/fliphelper/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
    ];
  },
  images: {
    qualities: [75, 100],
    remotePatterns: [
      // Allow all HTTPS image origins (S3, IONOS, Cloudinary, AWS, Google Cloud, Unsplash, external CDNs, etc.)
      {
        protocol: "https",
        hostname: "**",
      },
      // Allow all HTTP image origins (local development, test servers, custom IPs)
      {
        protocol: "http",
        hostname: "**",
      },
    ],
    localPatterns: [
      {
        pathname: "/api/media/**",
      },
      {
        pathname: '/**',
        search: '',
      },
    ],
  },

  webpack: (config, { isServer, nextRuntime }) => {
    if (!isServer || nextRuntime !== "nodejs") {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        dns: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push("jsdom", "isomorphic-dompurify");
    }
    return config;
  },
  turbopack: {},
};

const sentryOptions = {
  widenClientFileUpload: true,
  hideSourceMaps: true,
};

if (process.env.SENTRY_AUTH_TOKEN) {
  sentryOptions.authToken = process.env.SENTRY_AUTH_TOKEN;
  sentryOptions.org = process.env.SENTRY_ORG;
  sentryOptions.project = process.env.SENTRY_PROJECT;
}

export default process.env.SENTRY_AUTH_TOKEN 
  ? withSentryConfig(nextConfig, sentryOptions)
  : nextConfig;
