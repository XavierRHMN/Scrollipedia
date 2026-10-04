import type { NextConfig } from 'next';
const config: NextConfig = {
  images: { remotePatterns: [
    { protocol: 'https', hostname: 'upload.wikimedia.org', pathname: '/wikipedia/**' },
    { protocol: 'https', hostname: 'thumb.wikimedia.org', pathname: '/wikipedia/**' },
  ] },
  poweredByHeader: false,
};
export default config;
