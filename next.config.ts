import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Silencia el warning de workspace root (hay un package-lock.json en C:\Users\administrador_it)
    root: __dirname,
  },
};

export default nextConfig;
