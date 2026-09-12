import type { NextConfig } from "next";

const CONNECT_SRC = [
  "'self'",
  "https://cohort-y4zr.onrender.com",
  "https://indexer.preprod.midnight.network",
  "https://indexer.preview.midnight.network",
  "https://indexer.mainnet.midnight.network",
  "https://rpc.preprod.midnight.network",
  "https://rpc.preview.midnight.network",
  "https://rpc.mainnet.midnight.network",
  "wss://indexer.preprod.midnight.network",
  "wss://indexer.preview.midnight.network",
  "wss://indexer.mainnet.midnight.network",
  "https://api-preprod.1am.xyz",
  "https://api-preview.1am.xyz",
  "https://api.1am.xyz",
  "wss://api-preprod.1am.xyz",
  "wss://api-preview.1am.xyz",
  "wss://api.1am.xyz",
].join(" ");

/**
 * Next.js App Router hydration currently requires 'unsafe-inline' for
 * script/style. wasm-unsafe-eval is required for 1AM in-browser proving.
 * connect-src is pinned; it is not *.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  `connect-src ${CONNECT_SRC}`,
  "worker-src 'self' blob:",
  "font-src 'self'",
  "img-src 'self' data:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  reactStrictMode: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  env: {
    NEXT_PUBLIC_COHORT_API_ORIGIN:
      process.env.NEXT_PUBLIC_COHORT_API_ORIGIN || "https://cohort-y4zr.onrender.com",
    NEXT_PUBLIC_MIDNIGHT_NETWORK: process.env.NEXT_PUBLIC_MIDNIGHT_NETWORK || "preprod",
    NEXT_PUBLIC_CONTRACT_ADDRESS:
      process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
      "1d5c2084222c8abea80bc8228c0c743ca183138e52f404594caa28572e7c29cc",
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: CSP },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=15552000; includeSubDomains",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
