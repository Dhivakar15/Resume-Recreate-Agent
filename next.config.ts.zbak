import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The preview panel accesses the dev server through a proxied *.space-z.ai
  // origin; allow it so dev assets load without cross-origin warnings.
  allowedDevOrigins: ["*.space-z.ai"],
  // Keep resume parsers unbundled: unpdf resolves pdfjs-dist via
  // import.meta.resolve() at runtime, which breaks when Next.js bundles the
  // route for production (caused 502 crashes on serverless deploys).
  serverExternalPackages: ["unpdf", "mammoth"],
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
