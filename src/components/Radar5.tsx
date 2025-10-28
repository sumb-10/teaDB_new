"use client";
import React from "react";

export type Radar5Props = {
  title: string;
  labels: string[];
  values: number[];
  max: number;
  size?: number;
  levels?: number;
};

export default function Radar5({
  title,
  labels,
  values,
  max,
  size = 260,
  levels = 4,
}: Radar5Props) {
  if (labels.length !== 5 || values.length !== 5) {
    console.warn(`[Radar5] labels/values는 길이 5여야 합니다. (labels=${labels.length}, values=${values.length})`);
  }

  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.38;
  const angle = (2 * Math.PI) / 5;

  const toPoint = (r: number, i: number) => {
    const a = -Math.PI / 2 + i * angle;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  };

  const grids = Array.from({ length: levels }, (_, li) => {
    const rr = radius * ((li + 1) / levels);
    const pts = Array.from({ length: 5 }, (_, i) => toPoint(rr, i));
    const d = pts.map((p) => `${p.x},${p.y}`).join(" ");
    return <polygon key={li} points={d} fill="none" stroke="currentColor" opacity={0.15} />;
  });

  const axes = Array.from({ length: 5 }, (_, i) => {
    const p = toPoint(radius, i);
    return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="currentColor" opacity={0.25} />;
  });

  const clamp = (v: number) => Math.max(0, Math.min(max, v));
  const pts = values.slice(0, 5).map((v, i) => toPoint((clamp(v) / max) * radius, i));
  const polygon = pts.map((p) => `${p.x},${p.y}`).join(" ");

  const labelElems = labels.slice(0, 5).map((lb, i) => {
    const p = toPoint(radius + 16, i);
    return (
      <text key={`${lb}-${i}`} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fontSize={12} style={{ userSelect: "none" }}>
        {lb}
      </text>
    );
  });

  return (
    <figure className="border rounded p-3">
      <figcaption className="text-sm mb-2 font-medium">{title}</figcaption>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
        {grids}
        {axes}
        <polygon points={polygon} fill="currentColor" opacity={0.15} />
        <polygon points={polygon} fill="none" stroke="currentColor" />
        {pts.map((p, i) => (<circle key={i} cx={p.x} cy={p.y} r={3} fill="currentColor" />))}
        {labelElems}
      </svg>
    </figure>
  );
}
