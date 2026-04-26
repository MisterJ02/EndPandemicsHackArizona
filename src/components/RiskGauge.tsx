import { useEffect, useRef } from "react";
import { riskMeta } from "@/lib/geo";

function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy - r * Math.sin(rad)];
}

function arcBand(cx: number, cy: number, r1: number, r2: number, a1: number, a2: number) {
  const [x1o, y1o] = polar(cx, cy, r1, a1);
  const [x2o, y2o] = polar(cx, cy, r1, a2);
  const [x1i, y1i] = polar(cx, cy, r2, a1);
  const [x2i, y2i] = polar(cx, cy, r2, a2);
  const lg = a1 - a2 > 180 ? 1 : 0;
  const f = (v: number) => v.toFixed(2);
  return [
    `M ${f(x1o)} ${f(y1o)}`,
    `A ${r1} ${r1} 0 ${lg} 0 ${f(x2o)} ${f(y2o)}`,
    `L ${f(x2i)} ${f(y2i)}`,
    `A ${r2} ${r2} 0 ${lg} 1 ${f(x1i)} ${f(y1i)} Z`,
  ].join(" ");
}

const cx = 150,
  cy = 150,
  ro = 115,
  ri = 78;

const BANDS = [
  { a1: 180, a2: 135, fill: "#22c55e" },
  { a1: 135, a2: 90, fill: "#eab308" },
  { a1: 90, a2: 45, fill: "#f97316" },
  { a1: 45, a2: 0, fill: "#ef4444" },
];

export function RiskGauge({ score }: { score: number }) {
  const needleRef = useRef<SVGGElement>(null);
  const currentRef = useRef(-90);
  const targetRef = useRef(-90);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    targetRef.current = -90 + (score / 100) * 180;
    const tick = () => {
      const diff = targetRef.current - currentRef.current;
      if (Math.abs(diff) < 0.3) {
        currentRef.current = targetRef.current;
        rafRef.current = null;
      } else {
        currentRef.current += diff * 0.11;
        rafRef.current = requestAnimationFrame(tick);
      }
      if (needleRef.current) {
        needleRef.current.setAttribute(
          "transform",
          `rotate(${currentRef.current.toFixed(2)}, 150, 150)`,
        );
      }
    };
    if (!rafRef.current) rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [score]);

  const { label, color } = riskMeta(score);

  const ticks: { x1: number; y1: number; x2: number; y2: number; main: boolean }[] = [];
  for (let i = 0; i <= 20; i++) {
    const angle = 180 - i * 9;
    const isMain = i % 5 === 0;
    const [x1, y1] = polar(cx, cy, ro + 2, angle);
    const [x2, y2] = polar(cx, cy, ro + (isMain ? 8 : 5), angle);
    ticks.push({ x1, y1, x2, y2, main: isMain });
  }

  const labels = [0, 25, 50, 75, 100].map((s) => {
    const angle = 180 - (s / 100) * 180;
    const [x, y] = polar(cx, cy, ro + 18, angle);
    return { score: s, x, y };
  });

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 300 200" className="w-full max-w-[320px]">
        <path d={arcBand(cx, cy, ro + 2, ri - 2, 180, 0)} fill="#e2e8f0" />
        {BANDS.map((b, i) => (
          <path key={i} d={arcBand(cx, cy, ro, ri, b.a1, b.a2)} fill={b.fill} opacity={0.88} />
        ))}
        <g>
          {ticks.map((t, i) => (
            <line
              key={i}
              x1={t.x1.toFixed(2)}
              y1={t.y1.toFixed(2)}
              x2={t.x2.toFixed(2)}
              y2={t.y2.toFixed(2)}
              stroke="white"
              strokeWidth={t.main ? 2.5 : 1.5}
              opacity={0.85}
            />
          ))}
          {labels.map((l) => (
            <text
              key={l.score}
              x={l.x.toFixed(2)}
              y={(l.y + 3.5).toFixed(2)}
              textAnchor="middle"
              fontSize={9}
              fill="#94a3b8"
              fontWeight={700}
              fontFamily="system-ui"
            >
              {l.score}
            </text>
          ))}
        </g>
        <g ref={needleRef} transform="rotate(-90, 150, 150)">
          <line x1="150" y1="150" x2="150" y2="55" stroke="#0f172a" strokeWidth={3} strokeLinecap="round" />
          <circle cx="150" cy="150" r="8" fill="#0f172a" />
          <circle cx="150" cy="150" r="3" fill="white" />
        </g>
        <text x="150" y="180" textAnchor="middle" fontSize="32" fontWeight={800} fill={color} fontFamily="system-ui">
          {score}
        </text>
      </svg>
      <div className="text-xs font-bold tracking-wider mt-1" style={{ color }}>
        {label.toUpperCase()}
      </div>
    </div>
  );
}
