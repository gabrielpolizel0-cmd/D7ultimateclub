interface Props {
  data: number[];
}

export default function LPChart({ data }: Props) {
  if (data.length === 0) return null;

  const width = 600;
  const height = 160;
  const padding = 8;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - padding - ((v - min) / range) * (height - padding * 2);
    return { x, y };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`;
  const last = points[points.length - 1];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full h-full">
      <defs>
        <linearGradient id="lpGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00e5b4" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#00e5b4" stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1="0" y1={height * 0.25} x2={width} y2={height * 0.25} stroke="#2a3245" strokeDasharray="2 4" />
      <line x1="0" y1={height * 0.5} x2={width} y2={height * 0.5} stroke="#2a3245" strokeDasharray="2 4" />
      <line x1="0" y1={height * 0.75} x2={width} y2={height * 0.75} stroke="#2a3245" strokeDasharray="2 4" />
      <path d={areaPath} fill="url(#lpGrad)" />
      <path d={linePath} fill="none" stroke="#00e5b4" strokeWidth="2" />
      <circle cx={last.x} cy={last.y} r="4" fill="#00e5b4" />
    </svg>
  );
}
