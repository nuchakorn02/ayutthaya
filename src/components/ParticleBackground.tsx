'use client';

import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  size: number;
  speedY: number;
  speedX: number;
  opacity: number;
  fadeSpeed: number;
  angle: number;
  spinSpeed: number;
}

export default function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const particles: Particle[] = [];
    const maxParticles = 30; // Keep it lightweight

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const createParticle = (initBottom = false): Particle => {
      const size = Math.random() * 2.5 + 0.5; // Small glowing embers
      return {
        x: Math.random() * canvas.width,
        y: initBottom ? canvas.height + 10 : Math.random() * canvas.height,
        size,
        speedY: -(Math.random() * 0.8 + 0.3), // Float slowly upwards
        speedX: (Math.random() - 0.5) * 0.3, // Subtle drift
        opacity: Math.random() * 0.5 + 0.2, // Random starting opacity
        fadeSpeed: Math.random() * 0.002 + 0.001,
        angle: Math.random() * Math.PI * 2,
        spinSpeed: (Math.random() - 0.5) * 0.01
      };
    };

    // Initialize particles across screen height
    for (let i = 0; i < maxParticles; i++) {
      particles.push(createParticle(false));
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p, idx) => {
        // Update position
        p.y += p.speedY;
        p.x += p.speedX + Math.sin(p.angle) * 0.15; // Sine drift
        p.angle += p.spinSpeed;

        // Fade out slightly as they go higher
        const screenProgress = p.y / canvas.height; // 1 at bottom, 0 at top
        const opacity = p.opacity * screenProgress;

        if (opacity > 0) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          
          // Golden glowing amber color
          ctx.fillStyle = `rgba(251, 191, 36, ${opacity})`;
          
          ctx.fill();
        }

        // Reset particle if it leaves screen or fades out completely
        if (p.y < -10 || p.x < -10 || p.x > canvas.width + 10) {
          particles[idx] = createParticle(true);
        }
      });

      // Reset shadows to not affect other drawings (if canvas is shared, good practice)
      ctx.shadowBlur = 0;

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0 h-full w-full opacity-70"
      style={{ mixBlendMode: 'screen' }}
    />
  );
}
