import React, { useRef, useState, useEffect } from 'react';

interface Card3DProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  enabled?: boolean;
  intensity?: 'subtle' | 'medium';
  glare?: boolean;
  className?: string;
}

export const Card3D: React.FC<Card3DProps> = ({
  children,
  enabled = true,
  intensity = 'subtle',
  glare = true,
  className = '',
  onMouseMove,
  onMouseLeave,
  ...rest
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [allow3D, setAllow3D] = useState(enabled);
  const [transformStyle, setTransformStyle] = useState<string>(
    'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)'
  );
  const [glarePos, setGlarePos] = useState<{ x: number; y: number; active: boolean }>({
    x: 50,
    y: 50,
    active: false,
  });

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      setAllow3D(false);
      return;
    }
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const coarse = window.matchMedia?.('(pointer: coarse)').matches;
    setAllow3D(!reduced && !coarse);
  }, [enabled]);

  const maxDeg = intensity === 'medium' ? 6.5 : 3.5;
  const liftPx = intensity === 'medium' ? 8 : 4;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    onMouseMove?.(e);
    if (!allow3D || !ref.current) return;

    const rect = ref.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const relX = (e.clientX - rect.left) / rect.width;
    const relY = (e.clientY - rect.top) / rect.height;

    const rotY = (relX - 0.5) * 2 * maxDeg;
    const rotX = -(relY - 0.5) * 2 * maxDeg;

    setTransformStyle(
      `perspective(1000px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) translateZ(${liftPx}px)`
    );
    if (glare) {
      setGlarePos({
        x: Math.round(relX * 100),
        y: Math.round(relY * 100),
        active: true,
      });
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    onMouseLeave?.(e);
    if (!allow3D) return;
    setTransformStyle('perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)');
    setGlarePos(prev => (prev.active ? { ...prev, active: false } : prev));
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={
        allow3D
          ? {
              transform: transformStyle,
              transformStyle: 'preserve-3d',
            }
          : undefined
      }
      className={`relative ${allow3D ? 'card-3d-surface' : ''} ${className}`}
      {...rest}
    >
      {allow3D && glare && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[inherit] overflow-hidden transition-opacity duration-300"
          style={{
            opacity: glarePos.active ? 1 : 0,
            background: `radial-gradient(circle 240px at ${glarePos.x}% ${glarePos.y}%, rgba(255, 255, 255, 0.16), transparent 70%)`,
          }}
        />
      )}
      {children}
    </div>
  );
};
