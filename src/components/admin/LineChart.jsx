'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './LineChart.module.css';

export default function LineChart({ data }) {
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const svgRef = useRef(null);

  if (!data || data.length === 0) {
    return <div className={styles.noData}>Brak danych do wyświetlenia</div>;
  }

  const width = 1000;
  const height = 300;
  const padding = { top: 20, right: 20, bottom: 60, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Prepare data
  const viewsData = data.map(d => d.page_view || 0);
  const clicksData = data.map(d => d.product_click || 0);
  const maxViews = Math.max(...viewsData, 1);
  const maxClicks = Math.max(...clicksData, 1);
  const maxValue = Math.max(maxViews, maxClicks);

  // Generate points
  const generatePoints = (values) => {
    return values.map((value, i) => {
      const x = padding.left + (i / (data.length - 1)) * chartWidth;
      const y = padding.top + chartHeight - (value / maxValue) * chartHeight;
      return `${x},${y}`;
    }).join(' ');
  };

  const viewsPoints = generatePoints(viewsData);
  const clicksPoints = generatePoints(clicksData);

  // Generate area path
  const generateAreaPath = (values) => {
    let path = `M ${padding.left},${padding.top + chartHeight}`;
    
    values.forEach((value, i) => {
      const x = padding.left + (i / (data.length - 1)) * chartWidth;
      const y = padding.top + chartHeight - (value / maxValue) * chartHeight;
      if (i === 0) {
        path += ` L ${x},${y}`;
      } else {
        path += ` L ${x},${y}`;
      }
    });
    
    path += ` L ${padding.left + chartWidth},${padding.top + chartHeight}`;
    path += ' Z';
    return path;
  };

  const viewsArea = generateAreaPath(viewsData);
  const clicksArea = generateAreaPath(clicksData);

  const handleMouseMove = (e, index) => {
    if (svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      setTooltipPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
    setHoveredPoint(index);
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
  };

  // Format time label
  const formatTime = (timeStr) => {
    if (timeStr.includes(' ')) {
      return timeStr.split(' ')[1]; // Hour
    }
    return timeStr.split('-').slice(1).join('/'); // Date
  };

  return (
    <div className={styles.container}>
      <svg 
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`} 
        className={styles.svg}
        onMouseLeave={handleMouseLeave}
      >
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = padding.top + chartHeight - ratio * chartHeight;
          return (
            <g key={ratio}>
              <line
                x1={padding.left}
                y1={y}
                x2={padding.left + chartWidth}
                y2={y}
                stroke="rgba(255, 255, 255, 0.05)"
                strokeWidth="1"
              />
              <text
                x={padding.left - 10}
                y={y + 4}
                textAnchor="end"
                fill="rgba(255, 255, 255, 0.4)"
                fontSize="11"
              >
                {Math.round(maxValue * ratio)}
              </text>
            </g>
          );
        })}

        {/* Area fills */}
        <path
          d={viewsArea}
          fill="url(#viewsGradient)"
          opacity="0.3"
        />
        <path
          d={clicksArea}
          fill="url(#clicksGradient)"
          opacity="0.3"
        />

        {/* Lines */}
        <polyline
          points={viewsPoints}
          fill="none"
          stroke="rgba(59, 130, 246, 1)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polyline
          points={clicksPoints}
          fill="none"
          stroke="rgba(34, 197, 94, 1)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {data.map((point, i) => {
          const x = padding.left + (i / (data.length - 1)) * chartWidth;
          const yViews = padding.top + chartHeight - (viewsData[i] / maxValue) * chartHeight;
          const yClicks = padding.top + chartHeight - (clicksData[i] / maxValue) * chartHeight;

          return (
            <g key={i}>
              {/* Invisible hover area */}
              <rect
                x={x - 10}
                y={padding.top}
                width={20}
                height={chartHeight}
                fill="transparent"
                onMouseMove={(e) => handleMouseMove(e, i)}
                style={{ cursor: 'pointer' }}
              />
              
              {/* Points */}
              <circle
                cx={x}
                cy={yViews}
                r={hoveredPoint === i ? 6 : 4}
                fill="rgba(59, 130, 246, 1)"
                stroke="white"
                strokeWidth="2"
                style={{ transition: 'all 0.2s ease' }}
              />
              <circle
                cx={x}
                cy={yClicks}
                r={hoveredPoint === i ? 6 : 4}
                fill="rgba(34, 197, 94, 1)"
                stroke="white"
                strokeWidth="2"
                style={{ transition: 'all 0.2s ease' }}
              />

              {/* X-axis labels */}
              {(i % Math.ceil(data.length / 10) === 0 || i === data.length - 1) && (
                <text
                  x={x}
                  y={height - padding.bottom + 20}
                  textAnchor="middle"
                  fill="rgba(255, 255, 255, 0.5)"
                  fontSize="11"
                >
                  {formatTime(point.time)}
                </text>
              )}
            </g>
          );
        })}

        {/* Gradients */}
        <defs>
          <linearGradient id="viewsGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(59, 130, 246, 0.8)" />
            <stop offset="100%" stopColor="rgba(59, 130, 246, 0)" />
          </linearGradient>
          <linearGradient id="clicksGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(34, 197, 94, 0.8)" />
            <stop offset="100%" stopColor="rgba(34, 197, 94, 0)" />
          </linearGradient>
        </defs>
      </svg>

      {/* Tooltip */}
      {hoveredPoint !== null && (
        <div 
          className={styles.tooltip}
          style={{
            left: tooltipPos.x + 10,
            top: tooltipPos.y - 80
          }}
        >
          <div className={styles.tooltipTime}>{data[hoveredPoint].time}</div>
          <div className={styles.tooltipRow}>
            <span className={styles.tooltipDot} style={{ background: 'rgba(59, 130, 246, 1)' }}></span>
            <span>Wyświetlenia:</span>
            <strong>{data[hoveredPoint].page_view}</strong>
          </div>
          <div className={styles.tooltipRow}>
            <span className={styles.tooltipDot} style={{ background: 'rgba(34, 197, 94, 1)' }}></span>
            <span>Kliknięcia:</span>
            <strong>{data[hoveredPoint].product_click}</strong>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <span className={styles.legendDot} style={{ background: 'rgba(59, 130, 246, 1)' }}></span>
          Wyświetlenia
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendDot} style={{ background: 'rgba(34, 197, 94, 1)' }}></span>
          Kliknięcia
        </div>
      </div>
    </div>
  );
}
