"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  color: string;
  alpha: number;
  decay: number;
}

export function useParticleAnimation(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  containerRef: React.RefObject<HTMLDivElement>,
  isActiveSession: boolean, // Renamed for clarity, this is table.isActive
  isOvertime: boolean,
  isWarningYellow: boolean,
  isWarningOrange: boolean,
  isEnabled: boolean = true // New prop to globally enable/disable this effect
) {
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number>(0);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true); // Set mounted state after initial render
  }, []);

  useEffect(() => {
    // Only run animation if globally enabled, component is mounted, and session is active
    if (!isEnabled || !isMounted || !isActiveSession) {
      // Clear canvas if not active or not enabled
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
      // Cancel any existing animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      particlesRef.current = []; // Clear particles
      return;
    }

    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let animationRunning = true;

    const resizeCanvas = () => {
      if (canvas && container) {
        // Check if container has valid dimensions
        if (container.clientWidth > 0 && container.clientHeight > 0) {
          canvas.width = container.clientWidth;
          canvas.height = container.clientHeight;
        }
      }
    };

    resizeCanvas();
    // It might be better to use ResizeObserver if available and appropriate
    window.addEventListener("resize", resizeCanvas);

    const createParticle = (currentCanvas: HTMLCanvasElement): Particle => {
      let color = "#00FF00"; // Green for active by default
      if (isOvertime) color = "#FF0000"; // Red for overtime
      else if (isWarningOrange) color = "#FFA500"; // Orange for warning
      else if (isWarningYellow) color = "#FFFF00"; // Yellow for early warning
      // isActiveSession is already true if we reach here

      return {
        x: Math.random() * currentCanvas.width,
        y: Math.random() * currentCanvas.height,
        size: Math.random() * 2 + 0.5, // Smaller particles
        speedX: (Math.random() - 0.5) * 0.3, // Slower speeds
        speedY: (Math.random() - 0.5) * 0.3,
        color,
        alpha: Math.random() * 0.3 + 0.1, // Lower initial alpha
        decay: Math.random() * 0.005 + 0.002, // Slower decay
      };
    };
    
    const initParticles = () => {
      particlesRef.current = [];
      // Reduce particle count if it's too demanding
      const particleCount = isActiveSession ? 10 : 5; // Reduced from 20:10
      if (canvas.width > 0 && canvas.height > 0) { // Ensure canvas has dimensions
        for (let i = 0; i < particleCount; i++) {
          particlesRef.current.push(createParticle(canvas));
        }
      }
    };


    const animate = () => {
      if (!animationRunning || !canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx || canvas.width === 0 || canvas.height === 0) { // Don't draw if canvas not ready
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current.forEach((particle, index) => {
        particle.x += particle.speedX;
        particle.y += particle.speedY;
        particle.alpha -= particle.decay;

        if (
          particle.alpha <= 0 ||
          particle.x < -particle.size || particle.x > canvas.width + particle.size ||
          particle.y < -particle.size || particle.y > canvas.height + particle.size
        ) {
          // Replace particle instead of creating new one to maintain count
           if (isActiveSession) { // Only respawn if the session is still active
             particlesRef.current[index] = createParticle(canvas);
           } else {
             particlesRef.current.splice(index, 1); // Remove if session no longer active
           }
        } else {
            ctx.globalAlpha = particle.alpha;
            ctx.fillStyle = particle.color;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
        }
      });

      ctx.globalAlpha = 1.0; // Reset global alpha
      if (animationRunning) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    // Delay initialization slightly to allow other elements to render first
    const startAnimationTimeout = setTimeout(() => {
        if (canvas.offsetParent !== null) { // Check if canvas is visible
            initParticles();
            if (particlesRef.current.length > 0) { // Only start animation if particles were created
                 animationFrameRef.current = requestAnimationFrame(animate);
            }
        }
    }, 100); // Small delay

    return () => {
      animationRunning = false;
      clearTimeout(startAnimationTimeout);
      window.removeEventListener("resize", resizeCanvas);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  // Depend on isEnabled, isMounted, and isActiveSession to re-run the effect if they change.
  // Other state like isOvertime, isWarningYellow, isWarningOrange will affect particle creation color inside.
  }, [isEnabled, isMounted, isActiveSession, canvasRef, containerRef, isOvertime, isWarningYellow, isWarningOrange]); 
}
