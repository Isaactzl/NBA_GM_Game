import { getGradeValue, isGodTierGrade } from '../utils/gradeUtils.js';

const ATTRIBUTE_LABELS = [
  { key: 'size', short: 'SIZ' },
  { key: 'shooting', short: 'SHT' },
  { key: 'finishing', short: 'FIN' },
  { key: 'playmaking', short: 'PLY' },
  { key: 'iq', short: 'IQ' },
  { key: 'defense', short: 'DEF' },
  { key: 'rebounding', short: 'REB' },
  { key: 'athleticism', short: 'ATH' },
];

export function PlayerRadarChart({ attributes = {} }) {
  const size = 300;
  const center = size / 2;
  const radius = center - 34;

  const categories = ATTRIBUTE_LABELS.map((attribute) => ({
    ...attribute,
    value: getGradeValue(attributes[attribute.key]),
  }));

  const polygonPoints = categories
    .map((category, index) => {
      const angle = (Math.PI * 2 * index) / categories.length - Math.PI / 2;
      const distance = (category.value / 100) * radius;
      return `${center + distance * Math.cos(angle)},${center + distance * Math.sin(angle)}`;
    })
    .join(' ');

  const backgroundPolygons = [0.25, 0.5, 0.75, 1].map((scale) => {
    const ringRadius = radius * scale;
    const ringPoints = categories
      .map((_, index) => {
        const angle = (Math.PI * 2 * index) / categories.length - Math.PI / 2;
        return `${center + ringRadius * Math.cos(angle)},${center + ringRadius * Math.sin(angle)}`;
      })
      .join(' ');

    return { ringRadius, ringPoints };
  });

  const labels = categories.map((category, index) => {
    const angle = (Math.PI * 2 * index) / categories.length - Math.PI / 2;
    const coordinateRadius = radius + 24;

    return {
      ...category,
      x: center + coordinateRadius * Math.cos(angle),
      y: center + coordinateRadius * Math.sin(angle),
    };
  });

  const hasGodTierAttribute = categories.some((category) => isGodTierGrade(attributes[category.key]));

  return (
    <div className="radar-chart-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="player-radar-chart">
        {hasGodTierAttribute && (
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="rgba(251, 191, 36, 0.35)"
            strokeWidth="3"
            className="radar-god-tier-pulse"
          />
        )}

        {backgroundPolygons.map((polygon, index) => (
          <polygon
            key={`ring-${index}`}
            points={polygon.ringPoints}
            fill="none"
            stroke="rgba(148, 163, 184, 0.24)"
            strokeWidth="1"
          />
        ))}

        {categories.map((category, index) => {
          const angle = (Math.PI * 2 * index) / categories.length - Math.PI / 2;
          const x = center + radius * Math.cos(angle);
          const y = center + radius * Math.sin(angle);

          return (
            <line
              key={`axis-${category.key}`}
              x1={center}
              y1={center}
              x2={x}
              y2={y}
              stroke="rgba(148, 163, 184, 0.24)"
              strokeWidth="1"
            />
          );
        })}

        <polygon
          points={polygonPoints}
          fill="rgba(52, 211, 153, 0.35)"
          stroke="#34d399"
          strokeWidth="3"
          filter="drop-shadow(0 0 10px rgba(52, 211, 153, 0.7))"
        />

        {labels.map((label) => (
          <text
            key={label.key}
            x={label.x}
            y={label.y}
            fill="#94a3b8"
            fontSize="12"
            fontWeight="700"
            textAnchor="middle"
            alignmentBaseline="middle"
          >
            {label.short}
          </text>
        ))}
      </svg>
    </div>
  );
}
