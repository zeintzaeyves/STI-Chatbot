import path from "path";

const nextConfig = {
  webpack: (config) => {
    config.resolve.alias["@"] = path.resolve(__dirname);

    return config;
  },

  serverExternalPackages: ["pdfjs-dist"],

  // 🔥 FIX: Enable polling so Next.js auto-refresh always works
  webpackDevMiddleware: (config) => {
    config.watchOptions = {
      poll: 1000,            // check for file changes every 1s
      aggregateTimeout: 300, // delay before rebuilding
    };
    return config;
  },
};

export default nextConfig;
