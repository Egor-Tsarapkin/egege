import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["127.0.0.1"],
  async headers() {
    const scriptSources = process.env.NODE_ENV === "development"
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
      : "script-src 'self' 'unsafe-inline'";
    const contentSecurityPolicy = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "img-src 'self' data: blob: https:",
      "media-src 'self' blob:",
      "frame-src https://www.youtube.com https://www.youtube-nocookie.com https://vkvideo.ru",
      process.env.NODE_ENV === "development"
        ? "connect-src 'self' ws://localhost:3001 ws://127.0.0.1:3001"
        : "connect-src 'self'",
      scriptSources,
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",
      "form-action 'self'",
    ].join("; ");
    return [{
      source: "/:path*",
      headers: [
        { key: "Content-Security-Policy", value: contentSecurityPolicy },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
      ],
    }];
  },
  webpack(config, { webpack }) {
    const vpsRuntime = path.resolve(process.cwd(), "lib/vps-cloudflare-workers.ts");
    config.plugins.push(new webpack.NormalModuleReplacementPlugin(/^cloudflare:workers$/, vpsRuntime));
    return config;
  },
};

export default nextConfig;
