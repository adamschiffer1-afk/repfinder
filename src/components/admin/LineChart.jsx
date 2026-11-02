'use client';

import { useState, useRef, useCallback } from 'react';
import styles from './LineChart.module.css';

export default function LineChart({ data }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const svgRef = useRef(null);
  const throttleRef = useRef(null);

  if (!data || data.length === 0) {
    return <div className={styles.noData}>Brak danych do wyświetlenia</div>;
  }

  const width = 1000;
  const height = 300;
  const padding = { top: 20, right: 20, bottom: 60, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Combine views + clicks into total
  const totalData = data.map(d => (d.page_view || 0) + (d.product_click || 0));
  const maxValue = Math.max(...totalData, 1);

  // Generate smooth curve path (Bezier)
  const generateSmoothPath = (values) => {
    if (values.length === 0) return '';
    
    const points = values.map((value, i) => ({
      x: padding.left + (i / (data.length - 1)) * chartWidth,
      y: padding.top + chartHeight - (value / maxValue) * chartHeight
    }));

    let path = `M ${points[0].x},${points[0].y}`;
    
    for (let i = 0; i < points.length - 1; i++) {
      const current = points[i];
      const next = points[i + 1];
      
      // Calculate control points for smooth curve
      const xMid = (current.x + next.x) / 2;
      const yMid = (current.y + next.y) / 2;
      
      path += ` Q ${current.x},${current.y} ${xMid},${yMid}`;
      
      if (i === points.length - 2) {
        path += ` Q ${next.x},${next.y} ${next.x},${next.y}`;
      }
    }
    
    return path;
  };

  const linePath = generateSmoothPath(totalData);
  
  // Area path
  const generateAreaPath = (values) => {
    let path = generateSmoothPath(values);
    path += ` L ${padding.left + chartWidth},${padding.top + chartHeight}`;
    path += ` L ${padding.left},${padding.top + chartHeight}`;
    path += ' Z';
    return path;
  };

  const areaPath = generateAreaPath(totalData);

  // Helper: Get Y coordinate on the Bezier curve at specific X
  const getYOnCurve = useCallback((targetX) => {
    // Convert data points to actual coordinates
    const points = totalData.map((value, i) => ({
      x: padding.left + (i / (data.length - 1)) * chartWidth,
      y: padding.top + chartHeight - (value / maxValue) * chartHeight,
      value: value
    }));

    // Find which segment the X is in
    let segmentIndex = 0;
    for (let i = 0; i < points.length - 1; i++) {
      if (targetX >= points[i].x && targetX <= points[i + 1].x) {
        segmentIndex = i;
        break;
      }
    }

    const p0 = points[segmentIndex];
    const p1 = points[segmentIndex + 1] || p0;

    // For quadratic bezier: control point is at the current point
    // and we go to midpoint, then from midpoint to next point
    const xMid = (p0.x + p1.x) / 2;
    const yMid = (p0.y + p1.y) / 2;

    // Determine which half of the bezier curve we're on
    if (targetX <= xMid) {
      // First half: from p0 to midpoint
      const t = (targetX - p0.x) / (xMid - p0.x);
      // Quadratic bezier: B(t) = (1-t)²P0 + 2(1-t)tP1 + t²P2
      // where P1 is control point (p0 in this case)
      const oneMinusT = 1 - t;
      return oneMinusT * oneMinusT * p0.y + 2 * oneMinusT * t * p0.y + t * t * yMid;
    } else {
      // Second half: from midpoint to p1
      const t = (targetX - xMid) / (p1.x - xMid);
      const oneMinusT = 1 - t;
      return oneMinusT * oneMinusT * yMid + 2 * oneMinusT * t * p1.y + t * t * p1.y;
    }
  }, [totalData, data.length, chartWidth, chartHeight, padding, maxValue]);

  const handleMouseMove = useCallback((e) => {
    if (!svgRef.current) return;
    
    // Throttle to every 16ms (60fps)
    if (throttleRef.current) return;
    throttleRef.current = setTimeout(() => {
      throttleRef.current = null;
    }, 16);
    
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    
    // Calculate position relative to chart
    const relativeX = mouseX - padding.left;
    
    // Clamp to chart bounds
    if (relativeX < 0 || relativeX > chartWidth) {
      setHoveredIndex(null);
      return;
    }
    
    // Find exact position on line (interpolated)
    const exactPosition = (relativeX / chartWidth) * (data.length - 1);
    const closestIndex = Math.round(exactPosition);
    
    // Calculate exact X and Y on the curve
    const exactX = padding.left + relativeX;
    const exactY = getYOnCurve(exactX);
    
    setHoveredIndex(closestIndex);
    setTooltipPos({
      x: mouseX,
      y: e.clientY - rect.top,
      exactX: exactX,
      exactY: exactY
    });
  }, [data.length, chartWidth, chartHeight, padding, getYOnCurve]);

  const handleMouseLeave = () => {
    setHoveredIndex(null);
    if (throttleRef.current) {
      clearTimeout(throttleRef.current);
      throttleRef.current = null;
    }
  };

  const formatTime = (timeStr) => {
    if (timeStr.includes(' ')) {
      return timeStr.split(' ')[1];
    }
    return timeStr.split('-').slice(1).join('/');
  };

  return (
    <div className={styles.container}>
      <svg 
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`} 
        className={styles.svg}
        onMouseMove={handleMouseMove}
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

        {/* Gradient area */}
        <path
          d={areaPath}
          fill="url(#areaGradient)"
          opacity="0.5"
        />

        {/* Main line */}
        <path
          d={linePath}
          fill="none"
          stroke="url(#lineGradient)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            filter: 'drop-shadow(0 2px 8px rgba(255, 255, 255, 0.2))'
          }}
        />

        {/* Hover indicator */}
        {hoveredIndex !== null && tooltipPos.exactX && tooltipPos.exactY && (
          <g>
            {/* Vertical line */}
            <line
              x1={tooltipPos.exactX}
              y1={padding.top}
              x2={tooltipPos.exactX}
              y2={padding.top + chartHeight}
              stroke="rgba(255, 255, 255, 0.3)"
              strokeWidth="2"
              strokeDasharray="6 6"
            />
            {/* Outer glow */}
            <circle
              cx={tooltipPos.exactX}
              cy={tooltipPos.exactY}
              r="12"
              fill="rgba(255, 255, 255, 0.1)"
            />
            {/* Point on line */}
            <circle
              cx={tooltipPos.exactX}
              cy={tooltipPos.exactY}
              r="7"
              fill="white"
              stroke="rgba(100, 100, 100, 1)"
              strokeWidth="3"
              style={{
                filter: 'drop-shadow(0 2px 6px rgba(0, 0, 0, 0.4))'
              }}
            />
          </g>
        )}

        {/* X-axis labels */}
        {data.map((point, i) => {
          if (i % Math.ceil(data.length / 8) !== 0 && i !== data.length - 1) return null;
          const x = padding.left + (i / (data.length - 1)) * chartWidth;
          
          return (
            <text
              key={i}
              x={x}
              y={height - padding.bottom + 20}
              textAnchor="middle"
              fill="rgba(255, 255, 255, 0.5)"
              fontSize="11"
            >
              {formatTime(point.time)}
            </text>
          );
        })}

        {/* Gradients */}
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(180, 180, 180, 1)" />
            <stop offset="50%" stopColor="rgba(220, 220, 220, 1)" />
            <stop offset="100%" stopColor="rgba(160, 160, 160, 1)" />
          </linearGradient>
          <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(200, 200, 200, 0.4)" />
            <stop offset="100%" stopColor="rgba(100, 100, 100, 0)" />
          </linearGradient>
        </defs>
      </svg>

      {/* Tooltip */}
      {hoveredIndex !== null && tooltipPos.exactY && (
        <div 
          className={styles.tooltip}
          style={{
            left: Math.min(tooltipPos.x + 10, window.innerWidth - 220),
            top: tooltipPos.exactY - 120 // Always above the point
          }}
        >
          <div className={styles.tooltipTime}>{data[hoveredIndex].time}</div>
          <div className={styles.tooltipRow}>
            <span>👁️ Wyświetlenia:</span>
            <strong>{data[hoveredIndex].page_view}</strong>
          </div>
          <div className={styles.tooltipRow}>
            <span>🖱️ Kliknięcia:</span>
            <strong>{data[hoveredIndex].product_click}</strong>
          </div>
          <div className={styles.tooltipTotal}>
            <span>Razem:</span>
            <strong>{totalData[hoveredIndex]}</strong>
          </div>
        </div>
      )}
    </div>
  );
}
