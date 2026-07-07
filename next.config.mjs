/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Server Actions body size for form-heavy loan/payment forms.
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
