/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { hostname: 'i.ytimg.com' },
      { hostname: 'yt3.ggpht.com' }
    ]
  },
  typescript: {
    ignoreBuildErrors: false
  }
};

module.exports = nextConfig;
