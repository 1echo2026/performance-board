/** 简易 SVG 图表（无外部依赖） */
import { h } from './ui.js';

/** 柱状图 */
export function barChart(data, { width = 600, height = 260, padding = { top: 20, right: 20, bottom: 40, left: 60 }, color = '#2563eb', labelColor = '#374151' } = {}) {
  if (!data.length) return h('div', { class: 'empty' }, '暂无数据');
  const max = Math.max(...data.map(d => d.value), 1);
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const barW = Math.max(20, Math.min(60, innerW / data.length * 0.65));
  const gap = innerW / data.length;

  const svg = hNS('svg', { width, height, viewBox: `0 0 ${width} ${height}`, style: { maxWidth: '100%', height: 'auto', display: 'block' } });

  // 网格线 + Y 轴
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + innerH - (innerH * i / 4);
    svg.appendChild(hNS('line', { x1: padding.left, y1: y, x2: padding.left + innerW, y2: y, stroke: '#e5e7eb', 'stroke-dasharray': '3,3' }));
    const v = Math.round(max * i / 4);
    svg.appendChild(hNS('text', { x: padding.left - 8, y: y + 4, fill: '#9ca3af', 'text-anchor': 'end', 'font-size': '11px' }, fmtY(v)));
  }

  data.forEach((d, i) => {
    const x = padding.left + gap * i + gap / 2 - barW / 2;
    const bh = innerH * d.value / max;
    const y = padding.top + innerH - bh;
    const g = hNS('g');
    g.appendChild(hNS('rect', { x, y, width: barW, height: bh, fill: color, rx: 3 }));
    g.appendChild(hNS('text', { x: padding.left + gap * i + gap / 2, y: y - 5, fill: '#374151', 'text-anchor': 'middle', 'font-size': '11px', 'font-weight': '600' }, fmtY(d.value)));
    g.appendChild(hNS('text', { x: padding.left + gap * i + gap / 2, y: height - 15, fill: labelColor, 'text-anchor': 'middle', 'font-size': '11px' }, d.label));
    svg.appendChild(g);
  });
  return svg;
}

/** 环形图 */
export function donutChart(data, { width = 300, height = 260 } = {}) {
  if (!data.length) return h('div', { class: 'empty' }, '暂无数据');
  const cx = width / 2, cy = height / 2, r = Math.min(width, height) / 2 - 40, rInner = r * 0.6;
  const total = data.reduce((a, b) => a + b.value, 0) || 1;

  const svg = hNS('svg', { width, height, viewBox: `0 0 ${width} ${height}`, style: { maxWidth: '100%', height: 'auto', display: 'block' } });

  let acc = 0;
  data.forEach((d, i) => {
    const start = acc / total * Math.PI * 2 - Math.PI / 2;
    acc += d.value;
    const end = acc / total * Math.PI * 2 - Math.PI / 2;
    const large = (end - start) > Math.PI ? 1 : 0;
    const x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end), y2 = cy + r * Math.sin(end);
    const xi2 = cx + rInner * Math.cos(end), yi2 = cy + rInner * Math.sin(end);
    const xi1 = cx + rInner * Math.cos(start), yi1 = cy + rInner * Math.sin(start);
    const path = hNS('path', {
      d: `M${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} L${xi2},${yi2} A${rInner},${rInner} 0 ${large} 0 ${xi1},${yi1} Z`,
      fill: d.color, opacity: 0.92
    });
    svg.appendChild(path);
  });
  // 中心总计
  svg.appendChild(hNS('text', { x: cx, y: cy - 4, 'text-anchor': 'middle', 'font-size': '13px', fill: '#6b7280' }, '总计'));
  svg.appendChild(hNS('text', { x: cx, y: cy + 18, 'text-anchor': 'middle', 'font-size': '18px', fill: '#111827', 'font-weight': '700' }, fmtY(total)));
  // 图例
  const legendX = 10, legendY = height - 10 - data.length * 16;
  data.forEach((d, i) => {
    const y = legendY + i * 16;
    svg.appendChild(hNS('rect', { x: legendX, y: y - 8, width: 10, height: 10, fill: d.color, rx: 2 }));
    const pct = total > 0 ? (d.value / total * 100).toFixed(1) : '0';
    svg.appendChild(hNS('text', { x: legendX + 15, y: y + 1, 'font-size': '11px', fill: '#374151' }, `${d.label}  ${pct}%`));
  });
  return svg;
}

const COLORS = ['#2563eb', '#0ea5e9', '#16a34a', '#d97706', '#dc2626', '#9333ea', '#e11d48', '#64748b', '#0891b2', '#ca8a04'];

export function assignColors(data) {
  return data.map((d, i) => ({ ...d, color: d.color || COLORS[i % COLORS.length] }));
}

function hNS(tag, attrs = {}, ...children) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === 'class') el.setAttribute('class', v);
    else if (k === 'style' && typeof v === 'object') el.setAttribute('style', Object.entries(v).map(([a, b]) => `${a.replace(/[A-Z]/g, c => '-' + c.toLowerCase())}:${b}`).join(';'));
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v != null && v !== false) el.setAttribute(k, v);
  }
  children.forEach(c => {
    if (c == null) return;
    if (Array.isArray(c)) c.forEach(x => el.appendChild(x instanceof Node ? x : document.createTextNode(String(x))));
    else if (c instanceof Node) el.appendChild(c);
    else el.appendChild(document.createTextNode(String(c)));
  });
  return el;
}

function fmtY(n) {
  if (n >= 10000) return (n / 10000).toFixed(1) + 'w';
  return String(n);
}
