import type { NextConfig } from "next";
import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), "../../.env") });
config({ path: resolve(process.cwd(), ".env.local"), override: true });

const nextConfig: NextConfig = {
  transpilePackages: ["@commitglow/ui", "@commitglow/db"]
};

export default nextConfig;
