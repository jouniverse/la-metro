import { useEffect, useRef, useState } from 'react';

const BOOT_LINES = [
  '[SYS] Initializing LA Metro Tactical Transit System...',
  '[NET] Establishing Swiftly API uplink...',
  '[DB ] Loading GTFS route matrix...',
  '[MAP] Rendering tactical overlay...',
  '[SSE] Subscribing to vehicle telemetry...',
  '[SYS] System online.',
];

export default function BootScreen() {
  const canvasRef = useRef(null);
  const [lines, setLines] = useState([]);
  const [progress, setProgress] = useState(0);

  // Flow field animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    let particles = [];
    const PARTICLE_COUNT = 1500;

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    class Particle {
      constructor() { this.reset(); }
      reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.speed = 0.5 + Math.random() * 2;
        this.opacity = 0.1 + Math.random() * 0.5;
      }
      update() {
        this.x += this.speed;
        if (this.x > canvas.width + 20) {
          this.x = -20;
          this.y = Math.random() * canvas.height;
        }
      }
      draw() {
        ctx.globalAlpha = this.opacity;
        ctx.fillStyle = '#ff9d00';
        ctx.fillRect(this.x, this.y, 2, 1);
      }
    }

    particles = Array.from({ length: PARTICLE_COUNT }, () => new Particle());

    function animate() {
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = '#080808';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        p.update();
        p.draw();
      }
      animId = requestAnimationFrame(animate);
    }
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  // Boot text sequence
  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      if (i < BOOT_LINES.length) {
        setLines(prev => [...prev, BOOT_LINES[i]]);
        setProgress(((i + 1) / BOOT_LINES.length) * 100);
        i++;
      } else {
        clearInterval(interval);
      }
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)]"
    >
      <canvas ref={canvasRef} className="absolute inset-0" />
      <div className="relative z-10 flex max-h-[min(100dvh,100%)] flex-col items-center gap-6 overflow-y-auto px-4 py-6 sm:gap-8 sm:px-8">
        {/* Title */}
        <div className="text-center">
          <h1 className="text-5xl font-bold tracking-[0.15em] text-[var(--color-primary)] glitch-text">
            LA METRO
          </h1>
          <p className="text-sm tracking-[0.3em] text-[var(--color-on-surface-variant)] mt-2 uppercase">
            Tactical Transit System v1.0
          </p>
        </div>

        {/* Boot log */}
        <div className="w-[480px] max-w-full font-mono text-xs space-y-1">
          {lines.map((line, i) => (
            <div
              key={i}
              className={`${i === lines.length - 1 ? 'text-[var(--color-primary)]' : 'text-[var(--color-terminal-green)]'} opacity-80`}
            >
              {line}
            </div>
          ))}
          {lines.length < BOOT_LINES.length && (
            <span className="inline-block w-2 h-3 bg-[var(--color-primary)] pulse-glow" />
          )}
        </div>

        {/* Progress bar */}
        <div className="w-[480px] max-w-full">
          <div className="segmented-bar">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className={`segment ${i < Math.floor(progress / 5) ? 'active' : ''}`}
              />
            ))}
          </div>
          <div className="flex justify-between text-[10px] tracking-[0.15em] text-[var(--color-outline)] mt-1 uppercase">
            <span>Boot Sequence</span>
            <span>{Math.round(progress)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
