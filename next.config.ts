import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    const contentSecurityPolicy = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "img-src 'self' data: blob: https:",
      "media-src 'self' blob:",
      "frame-src https://www.youtube.com https://www.youtube-nocookie.com",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "script-src 'self' 'unsafe-inline'",
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
