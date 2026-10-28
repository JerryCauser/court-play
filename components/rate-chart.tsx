"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { percent } from "@/lib/format";

export type RatePoint = { label: string; value: number | null };

const HEIGHT = 160;
const PAD = { top: 12, right: 44, bottom: 12, left: 44 };
const TICKS = [0, 0.5, 1];

export function RateChart({ title, points, color }: { title: string; points: RatePoint[]; color: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (points.length > 1 ? (i / (points.length - 1)) * plotW : plotW / 2);
  const y = (v: number) => PAD.top + (1 - v) * plotH;
  const shown = points.flatMap((p, i) => (p.value === null ? [] : [{ i, v: p.value }]));
  const line = shown.map(({ i, v }, k) => `${k ? "L" : "M"}${x(i)},${y(v)}`).join("");
  const area = shown.length > 1 ? `${line}L${x(shown.at(-1)!.i)},${y(0)}L${x(shown[0].i)},${y(0)}Z` : "";
  const last = shown.at(-1);

  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    if (points.length === 0) return;
    const left = e.clientX - e.currentTarget.getBoundingClientRect().left;
    const step = points.length > 1 ? plotW / (points.length - 1) : 1;
    const i = points.length > 1 ? Math.round((left - PAD.left) / step) : 0;
    setHover(Math.min(points.length - 1, Math.max(0, i)));
  };

  const active = hover === null ? null : points[hover];
  const summary = shown.map(({ i, v }) => `${points[i].label}: ${percent(v)}`).join(", ");

  return (
    <figure className="chart">
      <figcaption className="chart-title">{title}</figcaption>
      <div className="chart-plot" ref={wrap}>
        {width > 0 && (
          <svg
            width={width}
            height={HEIGHT}
            role="img"
            aria-label={`${title}. ${summary}`}
            onPointerMove={onMove}
            onPointerLeave={() => setHover(null)}
          >
            {TICKS.map((t) => (
              <g key={t}>
                <line className="chart-grid" x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} />
                <text className="chart-tick" x={PAD.left - 6} y={y(t)} textAnchor="end" dominantBaseline="middle">
                  {percent(t)}
                </text>
              </g>
            ))}
            {area && <path d={area} fill={color} opacity={0.1} />}
            {shown.length > 1 && (
              <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            )}
            {hover !== null && (
              <line className="chart-crosshair" x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={HEIGHT - PAD.bottom} />
            )}
            {shown.map(({ i, v }) => (
              <circle
                key={i}
                className="chart-dot"
                cx={x(i)}
                cy={y(v)}
                r={i === hover ? 6 : 4}
                fill={color}
              />
            ))}
            {last && (
              <text className="chart-end" x={x(last.i) + 10} y={y(last.v)} dominantBaseline="middle">
                {percent(last.v)}
              </text>
            )}
          </svg>
        )}
        {active && hover !== null && (
          <div
            className="chart-tooltip"
            style={{ left: Math.min(Math.max(x(hover), 60), width - 60), top: active.value === null ? PAD.top : y(active.value) }}
          >
            <strong>{percent(active.value)}</strong>
            <span className="muted">{active.label}</span>
          </div>
        )}
      </div>
    </figure>
  );
}
