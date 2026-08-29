import React from 'react';

export function DivisionBarChart({ data }: { data: { name: string; totalScore: number }[] }) {
  const maxScore = Math.max(...data.map(d => d.totalScore), 1);
  const chartHeight = 220;
  const paddingBottom = 40;
  const paddingTop = 20;
  const paddingLeft = 45;
  const paddingRight = 15;
  
  const getShortName = (name: string) => {
    return name
      .replace('กองทัพมหาเสือพิทักษ์', 'มหาเสือ')
      .replace('กองทัพธรณินพิทักษ์', 'ธรณิน')
      .replace('กองทัพอาทมาต', 'อาทมาต')
      .replace('กองพระตำรวจหลวง', 'ตำรวจหลวง')
      .replace('กองทัพที่ 1 ปัญจะซันยะ', 'ทัพ 1')
      .replace('กองทัพที่ 2 วัชรนาถ', 'ทัพ 2')
      .replace('กองทัพที่ 3 ปุณฑริก', 'ทัพ 3')
      .replace('กองทัพที่ 4 เกาโมทก', 'ทัพ 4');
  };

  const colors = [
    '#fbbf24', // มหาเสือ (gold)
    '#a855f7', // ธรณิน (purple)
    '#71717a', // อาทมาต (zinc)
    '#f97316', // ตำรวจหลวง (orange)
    '#94a3b8', // ทัพ 1 (slate)
    '#f43f5e', // ทัพ 2 (rose)
    '#8b5cf6', // ทัพ 3 (violet)
    '#0ea5e9'  // ทัพ 4 (sky)
  ];

  return (
    <div className="w-full">
      <svg viewBox="0 0 500 240" className="w-full h-auto select-none">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
          const y = paddingTop + (chartHeight - paddingTop - paddingBottom) * (1 - ratio);
          const val = Math.round(maxScore * ratio);
          return (
            <g key={idx} className="opacity-20">
              <line x1={paddingLeft} y1={y} x2={500 - paddingRight} y2={y} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3 3" />
              <text x={paddingLeft - 8} y={y + 4} fill="#94a3b8" fontSize="10" textAnchor="end" className="font-mono">
                {val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((d, idx) => {
          const count = data.length;
          const barWidth = 32;
          const gap = (500 - paddingLeft - paddingRight - (barWidth * count)) / (count - 1);
          const x = paddingLeft + idx * (barWidth + gap);
          
          const graphHeight = chartHeight - paddingTop - paddingBottom;
          const barHeight = maxScore > 0 ? (d.totalScore / maxScore) * graphHeight : 0;
          const y = chartHeight - paddingBottom - barHeight;
          const color = colors[idx] || '#00f0ff';
          const shortName = getShortName(d.name);

          return (
            <g key={d.name} className="group">
              {/* Background trace */}
              <rect
                x={x}
                y={paddingTop}
                width={barWidth}
                height={graphHeight}
                fill="rgba(255,255,255,0.02)"
                rx="4"
              />

              {/* Foreground bar */}
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(barHeight, 3)}
                fill={color}
                rx="4"
                className="transition-all duration-500 ease-out hover:opacity-80"
                style={{ filter: `drop-shadow(0 0 6px ${color}44)` }}
              />

              {/* Value on top of bar */}
              {d.totalScore > 0 && (
                <text
                  x={x + barWidth / 2}
                  y={y - 6}
                  fill="#e2e8f0"
                  fontSize="9"
                  fontWeight="bold"
                  textAnchor="middle"
                  className="font-mono opacity-80"
                >
                  {d.totalScore.toFixed(0)}
                </text>
              )}

              {/* X label */}
              <text
                x={x + barWidth / 2}
                y={chartHeight - paddingBottom + 16}
                fill="#94a3b8"
                fontSize="9"
                textAnchor="middle"
                className="font-medium"
              >
                {shortName}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function DivisionDonutChart({ data }: { data: { name: string; count: number }[] }) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const size = 200;
  const radius = 70;
  const strokeWidth = 18;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  const getShortName = (name: string) => {
    return name
      .replace('กองทัพมหาเสือพิทักษ์', 'มหาเสือ')
      .replace('กองทัพธรณินพิทักษ์', 'ธรณิน')
      .replace('กองทัพอาทมาต', 'อาทมาต')
      .replace('กองพระตำรวจหลวง', 'ตำรวจ')
      .replace('กองทัพที่ 1 ปัญจะซันยะ', 'ทัพ 1')
      .replace('กองทัพที่ 2 วัชรนาถ', 'ทัพ 2')
      .replace('กองทัพที่ 3 ปุณฑริก', 'ทัพ 3')
      .replace('กองทัพที่ 4 เกาโมทก', 'ทัพ 4');
  };

  const colors = [
    '#fbbf24', '#a855f7', '#71717a', '#f97316',
    '#94a3b8', '#f43f5e', '#8b5cf6', '#0ea5e9'
  ];

  let currentAngle = -90; // Start at top

  return (
    <div className="flex items-center justify-center gap-6">
      <div className="relative w-[180px] h-[180px]">
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90 origin-center drop-shadow-[0_0_10px_rgba(0,0,0,0.5)]">
          {total === 0 ? (
            <circle cx={center} cy={center} r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={strokeWidth} />
          ) : (
            data.map((d, idx) => {
              if (d.count === 0) return null;
              
              const percentage = d.count / total;
              const strokeDasharray = `${percentage * circumference} ${circumference}`;
              const rotateAngle = currentAngle + 90; // offset back -90 from svg rotation
              
              const circle = (
                <circle
                  key={d.name}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  stroke={colors[idx] || '#00f0ff'}
                  strokeWidth={strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeLinecap="butt"
                  transform={`rotate(${rotateAngle} ${center} ${center})`}
                  className="transition-all duration-1000 ease-out hover:stroke-[22px] cursor-pointer"
                >
                  <title>{d.name}: {d.count} นาย</title>
                </circle>
              );
              
              currentAngle += percentage * 360;
              return circle;
            })
          )}
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-black text-text-primary tracking-tighter">
            {total}
          </span>
          <span className="text-[10px] text-text-secondary font-bold uppercase tracking-widest mt-0.5">
            Total
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-col justify-center gap-2 max-h-[180px] overflow-y-auto pr-2 custom-scrollbar">
        {data.map((d, idx) => {
          if (d.count === 0) return null;
          return (
            <div key={d.name} className="flex items-center gap-2 text-xs">
              <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: colors[idx] || '#00f0ff' }} />
              <div className="flex flex-col">
                <span className="text-text-primary font-medium leading-none mb-1">{getShortName(d.name)}</span>
                <span className="text-text-secondary text-[10px] leading-none font-mono">{d.count} นาย ({((d.count/total)*100).toFixed(0)}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
