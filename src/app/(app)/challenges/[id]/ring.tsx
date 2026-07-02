/** A small activity-ring dial with an initial (or emoji) in the center. */
export function Ring({
  fill,
  color,
  label,
  size = 40,
  stroke = 5,
}: {
  fill: number; // 0..1
  color: string; // hex
  label: string;
  size?: number;
  stroke?: number;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(Math.max(fill, 0), 1);
  const offset = c * (1 - clamped);
  const center = size / 2;

  return (
    <div
      className="relative flex-none"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: "rotate(-90deg)" }}
      >
        <circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke="#2a2a2e"
          strokeWidth={stroke}
        />
        <circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <b className="absolute inset-0 grid place-items-center text-xs font-bold">
        {label}
      </b>
    </div>
  );
}

/** Ring colors cycle by rank: lime, pink, cyan. */
export const RING_COLORS = ["#a6ff00", "#ff375f", "#00e5ff"];
