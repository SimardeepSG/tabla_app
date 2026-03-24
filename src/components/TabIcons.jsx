import React from 'react';
import Svg, { Path, Circle, Ellipse, Line, Rect } from 'react-native-svg';

// Tabla icon — two drums side by side (dayan + bayan) with circular tops
export function TablaIcon({ size = 24, color = '#fff' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Bayan (left, larger drum) */}
      <Path
        d="M3 8 C3 8 2.5 18 4 19 C5 20 8 20 9 19 C10.5 18 10 8 10 8"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        fill="none"
      />
      <Ellipse cx="6.5" cy="8" rx="3.5" ry="2" stroke={color} strokeWidth={1.5} fill="none" />
      {/* Bayan inner circle (syahi) */}
      <Circle cx="6.5" cy="8" r="1.5" stroke={color} strokeWidth={1} fill="none" />

      {/* Dayan (right, smaller drum) */}
      <Path
        d="M14 7 C14 7 13.5 18 15 19 C16 20 19 20 20 19 C21.5 18 21 7 21 7"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        fill="none"
      />
      <Ellipse cx="17.5" cy="7" rx="3.5" ry="2.2" stroke={color} strokeWidth={1.5} fill="none" />
      {/* Dayan inner circle (syahi) */}
      <Circle cx="17.5" cy="7" r="1.3" stroke={color} strokeWidth={1} fill="none" />
    </Svg>
  );
}

// Tanpura icon — long-necked instrument with round body
export function TanpuraIcon({ size = 24, color = '#fff' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Body (gourd) */}
      <Ellipse cx="12" cy="18" rx="5" ry="4" stroke={color} strokeWidth={1.5} fill="none" />
      {/* Neck */}
      <Line x1="12" y1="14" x2="12" y2="2" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      {/* Tuning pegs */}
      <Line x1="10" y1="3" x2="14" y2="3" stroke={color} strokeWidth={1.2} strokeLinecap="round" />
      <Line x1="10" y1="5" x2="14" y2="5" stroke={color} strokeWidth={1.2} strokeLinecap="round" />
      {/* Strings */}
      <Line x1="11" y1="5" x2="11" y2="17" stroke={color} strokeWidth={0.5} />
      <Line x1="12" y1="5" x2="12" y2="17" stroke={color} strokeWidth={0.5} />
      <Line x1="13" y1="5" x2="13" y2="17" stroke={color} strokeWidth={0.5} />
      {/* Bridge */}
      <Line x1="10.5" y1="17" x2="13.5" y2="17" stroke={color} strokeWidth={1.2} strokeLinecap="round" />
    </Svg>
  );
}

// Editor icon — musical note with a pencil
export function EditorIcon({ size = 24, color = '#fff' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Musical note */}
      <Circle cx="7" cy="18" r="3" stroke={color} strokeWidth={1.5} fill="none" />
      <Line x1="10" y1="18" x2="10" y2="5" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M10 5 C10 5 16 3 16 7" stroke={color} strokeWidth={1.5} strokeLinecap="round" fill="none" />
      {/* Pencil */}
      <Path
        d="M16 2 L21 7 L19 9 L14 4 Z"
        stroke={color}
        strokeWidth={1.2}
        strokeLinejoin="round"
        fill="none"
      />
      <Line x1="14" y1="4" x2="16" y2="2" stroke={color} strokeWidth={1.2} strokeLinecap="round" />
    </Svg>
  );
}

// Settings icon — gear/cog
export function SettingsIcon({ size = 24, color = '#fff' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={1.5} fill="none" />
      <Path
        d="M12 1 L13.5 4 L16 3.5 L15.5 6.5 L19 7 L17 9.5 L20 11 L17.5 13 L20 15 L17 15.5 L18.5 18.5 L15.5 17.5 L15 20.5 L12 19 L9 20.5 L8.5 17.5 L5.5 18.5 L7 15.5 L4 15 L6.5 13 L4 11 L7 9.5 L5 7 L8.5 6.5 L8 3.5 L10.5 4 Z"
        stroke={color}
        strokeWidth={1.3}
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
