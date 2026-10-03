// frontend/src/components/dashboard/charts/ThreeDCharts.jsx
import React from 'react';
import { motion } from 'framer-motion';

/**
 * Adjust hex color brightness for 3D facets (top highlight, side shadow)
 */
function adjustColorBrightness(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  if (isNaN(num)) return hex;
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, Math.max(0, (num >> 16) + amt));
  const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amt));
  const B = Math.min(255, Math.max(0, (num & 0x0000ff) + amt));
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
}

/**
 * Custom 3D Isometric / Extruded Prism Bar for Recharts
 * Renders Front Face, Angled Specular Top Cap, Darkened Isometric Side, and Drop Shadow
 */
export const ThreeDBarShape = (props) => {
  const { fill, x, y, width, height, depth = 10 } = props;

  if (height <= 0 || width <= 0) return null;

  const baseColor = fill || '#5F3F56';
  const topColor = adjustColorBrightness(baseColor, 35); // Lighter highlight
  const sideColor = adjustColorBrightness(baseColor, -25); // Darker depth shadow
  const frontColor = baseColor;

  const actualWidth = Math.max(12, width - depth);

  // Front Face
  const frontX = x;
  const frontY = y;
  const frontW = actualWidth;
  const frontH = height;

  // Top Face (Isometric Cap)
  const topPoints = `
    ${frontX},${frontY} 
    ${frontX + depth},${frontY - depth} 
    ${frontX + frontW + depth},${frontY - depth} 
    ${frontX + frontW},${frontY}
  `;

  // Right Side Face (Depth Extrusion)
  const sidePoints = `
    ${frontX + frontW},${frontY} 
    ${frontX + frontW + depth},${frontY - depth} 
    ${frontX + frontW + depth},${frontY + frontH - depth} 
    ${frontX + frontW},${frontY + frontH}
  `;

  return (
    <g className="cursor-pointer transition-all duration-300 hover:opacity-90">
      {/* 3D Drop Shadow Underneath */}
      <ellipse
        cx={frontX + frontW / 2 + depth / 2}
        cy={frontY + frontH + 2}
        rx={frontW / 2 + 4}
        ry={depth / 3}
        fill="rgba(15, 23, 42, 0.12)"
      />

      {/* Front Face */}
      <rect
        x={frontX}
        y={frontY}
        width={frontW}
        height={frontH}
        fill={frontColor}
        rx={2}
      />

      {/* Front Specular Sheen (Subtle vertical reflection) */}
      <rect
        x={frontX + 1}
        y={frontY + 1}
        width={Math.max(2, frontW * 0.25)}
        height={Math.max(0, frontH - 2)}
        fill="rgba(255, 255, 255, 0.18)"
        rx={1}
      />

      {/* Right Side 3D Extrusion */}
      <polygon
        points={sidePoints}
        fill={sideColor}
        stroke="rgba(0,0,0,0.08)"
        strokeWidth={0.5}
      />

      {/* Top 3D Highlight Cap */}
      <polygon
        points={topPoints}
        fill={topColor}
        stroke="rgba(255,255,255,0.3)"
        strokeWidth={0.5}
      />
    </g>
  );
};

/**
 * 3D Interactive Card Container with Framer Motion hover elevation & specular border
 */
export const ThreeDCard = ({
  children,
  className = '',
  accentGlow = 'rgba(95, 63, 86, 0.1)',
  hoverTilt = true,
  onClick,
}) => {
  return (
    <motion.div
      whileHover={
        hoverTilt
          ? {
              y: -4,
              boxShadow: `0 20px 25px -5px ${accentGlow}, 0 8px 10px -6px rgba(0, 0, 0, 0.05)`,
              transition: { duration: 0.2, ease: 'easeOut' },
            }
          : {}
      }
      onClick={onClick}
      className={`relative bg-white border border-[#e2e8f0] shadow-[0_4px_20px_-2px_rgba(0,0,0,0.04)] rounded-sm overflow-hidden transition-all duration-300 ${className}`}
      style={{
        transformStyle: 'preserve-3d',
      }}
    >
      {/* 3D Specular Top Rim */}
      <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent opacity-80 pointer-events-none" />
      {children}
    </motion.div>
  );
};

/**
 * 3D Glassmorphic Floating Tooltip
 */
export const ThreeDTooltip = ({ active, payload, label, unit = '', prefix = '' }) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-sm border border-slate-700/80 shadow-[0_12px_30px_rgba(0,0,0,0.35)] font-mono text-xs min-w-[160px] select-none"
      style={{
        boxShadow: '0 10px 25px -3px rgba(0,0,0,0.5), 0 0 15px rgba(95, 63, 86, 0.3)',
      }}
    >
      {label && (
        <div className="font-bold text-slate-300 pb-1.5 mb-2 border-b border-slate-800 flex items-center justify-between">
          <span>{label}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        </div>
      )}
      <div className="space-y-1.5">
        {payload.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between gap-3">
            <span className="text-slate-400 flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-xs inline-block"
                style={{ backgroundColor: item.color || item.fill }}
              />
              <span>{item.name || item.dataKey}:</span>
            </span>
            <span className="font-bold text-emerald-400">
              {prefix}
              {typeof item.value === 'number'
                ? item.value.toLocaleString()
                : item.value}{' '}
              {unit}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

/**
 * 3D Isometric Donut Stage Wrapper
 * Gives a perspective depth inclination and ambient drop shadow
 */
export const ThreeDDonutStage = ({ children, is3D = true }) => {
  if (!is3D) return <div className="w-full h-full">{children}</div>;

  return (
    <div
      className="w-full h-full relative flex items-center justify-center"
      style={{
        perspective: '1000px',
      }}
    >
      {/* 3D Under-platform Shadow Ellipse */}
      <div
        className="absolute bottom-2 w-48 h-10 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(15, 23, 42, 0.18) 0%, rgba(15, 23, 42, 0) 70%)',
          transform: 'rotateX(60deg)',
          filter: 'blur(4px)',
        }}
      />
      <div
        className="w-full h-full transition-transform duration-500"
        style={{
          transform: 'rotateX(18deg) scaleY(0.92)',
          transformStyle: 'preserve-3d',
        }}
      >
        {children}
      </div>
    </div>
  );
};
