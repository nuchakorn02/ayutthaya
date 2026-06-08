import type { Metadata } from 'next';
import './globals.css';
import ParticleBackground from '@/components/ParticleBackground';

export const metadata: Metadata = {
  title: 'กรมทหารราชวัลลภ',
  description: 'กระดานคะแนนแต้มการทำงาน กรมทหารมหาดเล็กราชวัลลภรักษาพระองค์',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className="dark">
      <body className="bg-bg-primary min-h-screen bg-grid antialiased relative overflow-x-hidden">
        {/* Floating Embers Particles Backdrop */}
        <ParticleBackground />
        
        {/* Content Layer */}
        <div className="relative z-10 min-h-screen flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
