import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    const backendOrigin = process.env.BACKEND_API_ORIGIN ?? "http://127.0.0.1:8080";
    return [
      {
        source: "/api/:path*",
        destination: `${backendOrigin}/api/:path*`
      },
      {
        source: "/logout",
        destination: `${backendOrigin}/logout`
      },
      {
        source: "/oauth2/:path*",
        destination: `${backendOrigin}/oauth2/:path*`
      }
    ];
  }
};

export default nextConfig;
