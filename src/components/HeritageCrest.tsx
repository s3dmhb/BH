import React from 'react';

interface HeritageCrestProps {
  className?: string;
  size?: number;
}

export const HeritageCrest: React.FC<HeritageCrestProps> = ({ className = '', size = 48 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="شعار شجرة عائلة البوحسون"
    >
      <defs>
        <linearGradient id="crestGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="50%" stopColor="#d4af37" />
          <stop offset="100%" stopColor="#854d0e" />
        </linearGradient>
        <linearGradient id="crestEmerald" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="50%" stopColor="#047857" />
          <stop offset="100%" stopColor="#004d26" />
        </linearGradient>
        <radialGradient id="crestGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#004d26" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Outer ambient glow */}
      <circle cx="50" cy="50" r="48" fill="url(#crestGlow)" />

      {/* Outer shield rim */}
      <circle cx="50" cy="50" r="44" stroke="url(#crestGold)" strokeWidth="2" strokeDasharray="3 3" />
      <circle cx="50" cy="50" r="40" fill="url(#crestEmerald)" stroke="url(#crestGold)" strokeWidth="1.5" />

      {/* 8-pointed Islamic Star Geometry */}
      <polygon
        points="50,15 58,28 72,20 68,36 82,42 72,54 80,68 65,68 62,83 50,75 38,83 35,68 20,68 28,54 18,42 32,36 28,20 42,28"
        stroke="url(#crestGold)"
        strokeWidth="1"
        fill="none"
        opacity="0.4"
      />

      {/* Central Palm & Heritage Tree Motif */}
      <path
        d="M50 72 V38"
        stroke="url(#crestGold)"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      {/* Palm fronds */}
      <path
        d="M50 42 C40 32 30 35 24 44"
        stroke="url(#crestGold)"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M50 42 C60 32 70 35 76 44"
        stroke="url(#crestGold)"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M50 36 C42 24 32 26 28 32"
        stroke="url(#crestGold)"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M50 36 C58 24 68 26 72 32"
        stroke="url(#crestGold)"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M50 32 C48 18 52 18 50 16"
        stroke="url(#crestGold)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Crossed Heritage Swords at Base */}
      <path
        d="M36 76 L64 68"
        stroke="url(#crestGold)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M64 76 L36 68"
        stroke="url(#crestGold)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="50" cy="72" r="2.5" fill="url(#crestGold)" />
    </svg>
  );
};

export const FemaleHeritageBadge: React.FC<{ size?: number; className?: string }> = ({
  size = 32,
  className = ''
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="رمز العائلة النسائي"
    >
      <defs>
        <linearGradient id="femaleRose" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f472b6" />
          <stop offset="50%" stopColor="#db2777" />
          <stop offset="100%" stopColor="#9d174d" />
        </linearGradient>
        <linearGradient id="femaleGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fde047" />
          <stop offset="100%" stopColor="#ca8a04" />
        </linearGradient>
      </defs>

      <circle cx="50" cy="50" r="46" fill="rgba(80, 15, 45, 0.5)" stroke="url(#femaleRose)" strokeWidth="2" />
      <circle cx="50" cy="50" r="38" stroke="url(#femaleGold)" strokeWidth="1" strokeDasharray="2 2" />

      {/* Feminine Islamic Arabesque Motif */}
      <path
        d="M50 25 C42 35 42 45 50 55 C58 45 58 35 50 25 Z"
        fill="url(#femaleRose)"
        stroke="url(#femaleGold)"
        strokeWidth="1"
      />
      <path
        d="M50 75 C42 65 42 55 50 45 C58 55 58 65 50 75 Z"
        fill="url(#femaleRose)"
        stroke="url(#femaleGold)"
        strokeWidth="1"
      />
      <path
        d="M25 50 C35 42 45 42 55 50 C45 58 35 58 25 50 Z"
        fill="url(#femaleRose)"
        stroke="url(#femaleGold)"
        strokeWidth="1"
      />
      <path
        d="M75 50 C65 42 55 42 45 50 C55 58 65 58 75 50 Z"
        fill="url(#femaleRose)"
        stroke="url(#femaleGold)"
        strokeWidth="1"
      />
      <circle cx="50" cy="50" r="4" fill="url(#femaleGold)" />
    </svg>
  );
};
