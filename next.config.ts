import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // ใช้กับทุก route
        source: '/(.*)',
        headers: [
          // ป้องกัน Clickjacking - ห้าม iframe จาก domain อื่น
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // ป้องกัน MIME sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // บังคับ HTTPS (HSTS) - 1 ปี
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          // ป้องกัน XSS ใน browser เก่า
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          // ลด referrer info ที่ส่งออกไปยัง domain อื่น
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Content Security Policy - ป้องกัน XSS แบบแน่นหนา
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'", // Next.js ต้องการ unsafe-inline สำหรับ inline script hydration
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: https://tr.rbxcdn.com https://images.rbxcdn.com https://thumbnails.roblox.com blob:",
              "connect-src 'self' https://*.supabase.co https://apis.roblox.com",
              "frame-ancestors 'none'",
            ].join('; '),
          },
          // ป้องกันการเข้าถึง browser features ที่ไม่จำเป็น
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
