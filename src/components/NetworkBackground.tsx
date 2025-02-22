'use client';

import { useEffect, useRef } from 'react';

interface Point {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export function NetworkBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match window size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Create points
    const points: Point[] = [];
    const numPoints = Math.floor((window.innerWidth * window.innerHeight) / 30000); // Slightly reduced density
    for (let i = 0; i < numPoints; i++) {
      points.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4, // Slightly slower for smoother connections
        vy: (Math.random() - 0.5) * 0.4  // Slightly slower for smoother connections
      });
    }

    // Animation function
    function animate() {
      if (!ctx || !canvas) return;

      // Clear canvas with gradient background
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, '#1a237e');  // Dark blue
      gradient.addColorStop(1, '#283593');  // Slightly lighter blue
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update and draw points
      points.forEach(point => {
        point.x += point.vx;
        point.y += point.vy;

        // Bounce off edges
        if (point.x < 0 || point.x > canvas.width) point.vx *= -1;
        if (point.y < 0 || point.y > canvas.height) point.vy *= -1;

        // Draw point with a subtle glow effect
        ctx.beginPath();
        ctx.arc(point.x, point.y, 2.5, 0, Math.PI * 2); // Slightly larger dots
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'; // More opaque dots
        ctx.fill();
        
        // Add glow effect
        ctx.beginPath();
        ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fill();
      });

      // Draw lines between nearby points
      points.forEach((point, i) => {
        points.slice(i + 1).forEach(otherPoint => {
          const dx = point.x - otherPoint.x;
          const dy = point.y - otherPoint.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const maxDistance = 180; // Increased connection distance

          if (distance < maxDistance) {
            ctx.beginPath();
            ctx.moveTo(point.x, point.y);
            ctx.lineTo(otherPoint.x, otherPoint.y);
            
            // Create more prominent lines
            const opacity = 0.35 * (1 - distance / maxDistance); // Increased base opacity
            ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
            ctx.lineWidth = 0.8; // Slightly thicker lines
            ctx.stroke();

            // Add subtle glow effect to lines
            ctx.beginPath();
            ctx.moveTo(point.x, point.y);
            ctx.lineTo(otherPoint.x, otherPoint.y);
            ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.3})`;
            ctx.lineWidth = 2.5;
            ctx.stroke();
          }
        });
      });

      requestAnimationFrame(animate);
    }

    // Start animation
    animate();

    // Cleanup
    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed top-0 left-0 w-full h-full -z-10"
      style={{ background: 'linear-gradient(to bottom right, #1a237e, #283593)' }} // Fallback gradient
    />
  );
} 