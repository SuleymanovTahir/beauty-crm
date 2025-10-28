import React from 'react';
// В том же файле PieChartLabel.tsx

import { smartTruncate } from '../../utils/text';

export const customPieLegend = (props: any) => {
  const { payload } = props;

  return (
    <ul style={{
      listStyle: 'none',
      padding: 0,
      margin: 0,
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
      gap: '8px'
    }}>
      {payload.map((entry: any, index: number) => (
        <li
          key={`item-${index}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            color: '#374151'
          }}
          title={entry.value} // Полное название в tooltip
        >
          <span
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '2px',
              backgroundColor: entry.color,
              flexShrink: 0
            }}
          />
          <span style={{ 
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {smartTruncate(entry.value, 20)}
          </span>
        </li>
      ))}
    </ul>
  );
};

interface CustomLabelProps {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
  name: string;
  value: number;
}

export const customPieLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
  name,
  value
}: CustomLabelProps) => {
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 30; // Расстояние от центра
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  // Сокращаем длинные названия
  const truncatedName = smartTruncate(name, 15);

  return (
    <text
      x={x}
      y={y}
      fill="#374151"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      fontSize={12}
      fontWeight={500}
    >
      <title>{name}</title> {/* Полное название в tooltip */}
      <tspan x={x} dy="0">{truncatedName}</tspan>
      <tspan x={x} dy="1.2em" fontSize={10} fill="#6b7280">
        {value} ({(percent * 100).toFixed(0)}%)
      </tspan>
    </text>
  );
};

// Альтернатива: только процент внутри, название в Legend
export const customPiePercentLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent
}: CustomLabelProps) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percent < 0.05) return null; // Не показываем метки для маленьких сегментов

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={14}
      fontWeight="bold"
    >
      {(percent * 100).toFixed(0)}%
    </text>
  );
};