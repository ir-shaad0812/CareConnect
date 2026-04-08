/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Google OAuth avatar URLs can require browser context/cookies and fail when
    // fetched by the Next.js server optimizer with upstream 400 responses.
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.googleusercontent.com",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "5000",
        pathname: "/uploads/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "5000",
        pathname: "/uploads/**",
      },
    ],
  },
};

export default nextConfig;
