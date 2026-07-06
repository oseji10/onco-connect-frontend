/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable App Router (it's on by default in Next.js 13+)
  // No need for experimental.appDir anymore
  
  // Ensure TypeScript checking during build
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: false,
  },

  output: 'export',
    trailingSlash: true,
  
  // Strict mode for better development
  reactStrictMode: true,

   eslint: {
      ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true, 
      },
      images: { unoptimized: true }, 
  
  // Configure images if needed
  // images: {
  //   domains: [], // Add your image domains here
  // },
  
  allowedDevOrigins: ['https://api.ticketa.com.ng'],

}

module.exports = nextConfig