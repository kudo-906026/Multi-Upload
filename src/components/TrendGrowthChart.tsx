import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { GrowthDataPoint } from '@shared/types';
import { TrendingUp, Youtube, Instagram, Globe, Sparkles, Info } from 'lucide-react';

interface TrendGrowthChartProps {
  data: GrowthDataPoint[];
  topic: string;
}

export const TrendGrowthChart: React.FC<TrendGrowthChartProps> = ({ data, topic }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Series visibility toggles
  const [showYoutube, setShowYoutube] = useState(true);
  const [showInstagram, setShowInstagram] = useState(true);
  const [showSearch, setShowSearch] = useState(true);

  // Active hover tooltip state
  const [hoveredPoint, setHoveredPoint] = useState<GrowthDataPoint | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!data || data.length === 0 || !svgRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth || 600;
    const height = 280;

    const margin = { top: 25, right: 45, bottom: 40, left: 55 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Clear previous SVG contents
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    svg
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('style', 'max-width: 100%; height: auto; overflow: visible;');

    // Defs for gradients and shadow
    const defs = svg.append('defs');

    // YouTube Red Gradient Area
    const ytGradient = defs
      .append('linearGradient')
      .attr('id', 'yt-area-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    ytGradient.append('stop').attr('offset', '0%').attr('stop-color', '#EF4444').attr('stop-opacity', 0.35);
    ytGradient.append('stop').attr('offset', '100%').attr('stop-color', '#EF4444').attr('stop-opacity', 0.0);

    // Instagram Pink Gradient Area
    const igGradient = defs
      .append('linearGradient')
      .attr('id', 'ig-area-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    igGradient.append('stop').attr('offset', '0%').attr('stop-color', '#EC4899').attr('stop-opacity', 0.35);
    igGradient.append('stop').attr('offset', '100%').attr('stop-color', '#EC4899').attr('stop-opacity', 0.0);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // X Scale
    const xScale = d3
      .scalePoint<string>()
      .domain(data.map((d) => d.label))
      .range([0, innerWidth])
      .padding(0.2);

    // Y Scale for Views (YouTube & Instagram)
    const maxViews = d3.max(data, (d) => Math.max(d.youtubeViews, d.instagramViews)) || 100000;
    const yScaleViews = d3
      .scaleLinear()
      .domain([0, maxViews * 1.15])
      .range([innerHeight, 0])
      .nice();

    // Secondary Y Scale for Search Interest (0-100)
    const yScaleSearch = d3.scaleLinear().domain([0, 100]).range([innerHeight, 0]);

    // Gridlines
    const yGrid = d3
      .axisLeft(yScaleViews)
      .ticks(5)
      .tickSize(-innerWidth)
      .tickFormat(() => '');

    g.append('g')
      .attr('class', 'grid')
      .call(yGrid)
      .selectAll('line')
      .attr('stroke', '#1E293B')
      .attr('stroke-dasharray', '3,3');
    g.select('.grid .domain').remove();

    // X Axis
    const xAxis = d3.axisBottom(xScale);
    const xAxisGroup = g
      .append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis);

    xAxisGroup.selectAll('text').attr('fill', '#94A3B8').attr('font-size', '11px').attr('font-weight', '500');
    xAxisGroup.select('.domain').attr('stroke', '#334155');
    xAxisGroup.selectAll('line').attr('stroke', '#334155');

    // Y Axis Left (Views)
    const yAxisViews = d3
      .axisLeft(yScaleViews)
      .ticks(5)
      .tickFormat((d) => {
        const val = Number(d);
        if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
        if (val >= 1000) return `${(val / 1000).toFixed(0)}K`;
        return `${val}`;
      });

    const yAxisGroup = g.append('g').call(yAxisViews);
    yAxisGroup.selectAll('text').attr('fill', '#94A3B8').attr('font-size', '10px');
    yAxisGroup.select('.domain').remove();
    yAxisGroup.selectAll('line').remove();

    // Y Axis Right (Search Interest %)
    if (showSearch) {
      const yAxisSearch = d3.axisRight(yScaleSearch).ticks(5).tickFormat((d) => `${d}%`);
      const yAxisSearchGroup = g.append('g').attr('transform', `translate(${innerWidth}, 0)`).call(yAxisSearch);
      yAxisSearchGroup.selectAll('text').attr('fill', '#818CF8').attr('font-size', '9px');
      yAxisSearchGroup.select('.domain').remove();
      yAxisSearchGroup.selectAll('line').remove();
    }

    // Line & Area Generators
    const ytArea = d3
      .area<GrowthDataPoint>()
      .x((d) => xScale(d.label) || 0)
      .y0(innerHeight)
      .y1((d) => yScaleViews(d.youtubeViews))
      .curve(d3.curveMonotoneX);

    const ytLine = d3
      .line<GrowthDataPoint>()
      .x((d) => xScale(d.label) || 0)
      .y((d) => yScaleViews(d.youtubeViews))
      .curve(d3.curveMonotoneX);

    const igArea = d3
      .area<GrowthDataPoint>()
      .x((d) => xScale(d.label) || 0)
      .y0(innerHeight)
      .y1((d) => yScaleViews(d.instagramViews))
      .curve(d3.curveMonotoneX);

    const igLine = d3
      .line<GrowthDataPoint>()
      .x((d) => xScale(d.label) || 0)
      .y((d) => yScaleViews(d.instagramViews))
      .curve(d3.curveMonotoneX);

    const searchLine = d3
      .line<GrowthDataPoint>()
      .x((d) => xScale(d.label) || 0)
      .y((d) => yScaleSearch(d.searchInterest))
      .curve(d3.curveMonotoneX);

    // Draw YouTube Layer
    if (showYoutube) {
      g.append('path')
        .datum(data)
        .attr('fill', 'url(#yt-area-gradient)')
        .attr('d', ytArea);

      const ytPath = g
        .append('path')
        .datum(data)
        .attr('fill', 'none')
        .attr('stroke', '#EF4444')
        .attr('stroke-width', 2.5)
        .attr('d', ytLine);

      // Animate stroke reveal
      const length = ytPath.node()?.getTotalLength() || 1000;
      ytPath
        .attr('stroke-dasharray', `${length} ${length}`)
        .attr('stroke-dashoffset', length)
        .transition()
        .duration(1200)
        .ease(d3.easeCubicOut)
        .attr('stroke-dashoffset', 0);

      // Dots on points
      g.selectAll('.yt-dot')
        .data(data)
        .enter()
        .append('circle')
        .attr('class', 'yt-dot')
        .attr('cx', (d) => xScale(d.label) || 0)
        .attr('cy', (d) => yScaleViews(d.youtubeViews))
        .attr('r', 3.5)
        .attr('fill', '#EF4444')
        .attr('stroke', '#0F172A')
        .attr('stroke-width', 1.5);
    }

    // Draw Instagram Layer
    if (showInstagram) {
      g.append('path')
        .datum(data)
        .attr('fill', 'url(#ig-area-gradient)')
        .attr('d', igArea);

      const igPath = g
        .append('path')
        .datum(data)
        .attr('fill', 'none')
        .attr('stroke', '#EC4899')
        .attr('stroke-width', 2.5)
        .attr('d', igLine);

      const length = igPath.node()?.getTotalLength() || 1000;
      igPath
        .attr('stroke-dasharray', `${length} ${length}`)
        .attr('stroke-dashoffset', length)
        .transition()
        .duration(1200)
        .ease(d3.easeCubicOut)
        .attr('stroke-dashoffset', 0);

      g.selectAll('.ig-dot')
        .data(data)
        .enter()
        .append('circle')
        .attr('class', 'ig-dot')
        .attr('cx', (d) => xScale(d.label) || 0)
        .attr('cy', (d) => yScaleViews(d.instagramViews))
        .attr('r', 3.5)
        .attr('fill', '#EC4899')
        .attr('stroke', '#0F172A')
        .attr('stroke-width', 1.5);
    }

    // Draw Search Interest Layer
    if (showSearch) {
      const sPath = g
        .append('path')
        .datum(data)
        .attr('fill', 'none')
        .attr('stroke', '#6366F1')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '4,4')
        .attr('d', searchLine);

      const length = sPath.node()?.getTotalLength() || 1000;
      sPath
        .attr('stroke-dashoffset', length)
        .transition()
        .duration(1200)
        .ease(d3.easeCubicOut)
        .attr('stroke-dashoffset', 0);
    }

    // Hover guideline line
    const hoverLine = g
      .append('line')
      .attr('stroke', '#64748B')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '3,3')
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .style('opacity', 0);

    // Interactive Hover Overlay
    const overlay = g
      .append('rect')
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'transparent')
      .style('cursor', 'crosshair');

    overlay.on('mousemove', function (event) {
      const [mouseX] = d3.pointer(event);

      // Find closest point by x coordinate
      let closestPoint = data[0];
      let minDistance = Infinity;

      data.forEach((d) => {
        const xPos = xScale(d.label) || 0;
        const dist = Math.abs(xPos - mouseX);
        if (dist < minDistance) {
          minDistance = dist;
          closestPoint = d;
        }
      });

      const xPos = xScale(closestPoint.label) || 0;
      hoverLine.attr('x1', xPos).attr('x2', xPos).style('opacity', 1);

      setHoveredPoint(closestPoint);
      setTooltipPos({
        x: xPos + margin.left,
        y: Math.min(innerHeight - 40, yScaleViews(Math.max(closestPoint.youtubeViews, closestPoint.instagramViews))),
      });
    });

    overlay.on('mouseleave', function () {
      hoverLine.style('opacity', 0);
      setHoveredPoint(null);
      setTooltipPos(null);
    });
  }, [data, showYoutube, showInstagram, showSearch]);

  if (!data || data.length === 0) return null;

  // Key metrics
  const peakPoint = data.reduce((prev, current) =>
    (prev.youtubeViews + prev.instagramViews) > (current.youtubeViews + current.instagramViews) ? prev : current
  );
  const totalPredicted30d =
    (data[data.length - 1]?.youtubeViews || 0) + (data[data.length - 1]?.instagramViews || 0);

  return (
    <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
      {/* Header with Title and Projection Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="space-y-0.5">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
              D3.js Predicted Growth Trajectory
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                Gemini Forecast
              </span>
            </h3>
          </div>
          <p className="text-[11px] text-slate-400">
            Algorithmic distribution curve based on topic engagement velocity, retention signals, and search grounding trends.
          </p>
        </div>

        {/* Projection KPI Pills */}
        <div className="flex items-center space-x-2 text-xs">
          <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300">
            <span className="text-slate-400 text-[10px] block">30-Day Total Reach</span>
            <span className="font-extrabold text-white text-xs sm:text-sm text-emerald-400">
              ~{(totalPredicted30d / 1000).toFixed(1)}K views
            </span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300">
            <span className="text-slate-400 text-[10px] block">Viral Peak Velocity</span>
            <span className="font-extrabold text-amber-400 text-xs sm:text-sm">
              {peakPoint.label}
            </span>
          </div>
        </div>
      </div>

      {/* Series Toggle Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="flex items-center space-x-2">
          {/* YouTube Toggle */}
          <button
            type="button"
            onClick={() => setShowYoutube(!showYoutube)}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
              showYoutube
                ? 'bg-red-950/40 border-red-500/60 text-red-300'
                : 'bg-slate-900/60 border-slate-800 text-slate-500 opacity-60'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <Youtube className="w-3.5 h-3.5 text-red-500" />
            <span>YouTube Shorts</span>
          </button>

          {/* Instagram Toggle */}
          <button
            type="button"
            onClick={() => setShowInstagram(!showInstagram)}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
              showInstagram
                ? 'bg-pink-950/40 border-pink-500/60 text-pink-300'
                : 'bg-slate-900/60 border-slate-800 text-slate-500 opacity-60'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-pink-500" />
            <Instagram className="w-3.5 h-3.5 text-pink-500" />
            <span>Instagram Reels</span>
          </button>

          {/* Search Interest Toggle */}
          <button
            type="button"
            onClick={() => setShowSearch(!showSearch)}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
              showSearch
                ? 'bg-indigo-950/40 border-indigo-500/60 text-indigo-300'
                : 'bg-slate-900/60 border-slate-800 text-slate-500 opacity-60'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <Globe className="w-3.5 h-3.5 text-indigo-400" />
            <span>Search Interest</span>
          </button>
        </div>

        <div className="text-[11px] text-slate-500 flex items-center gap-1">
          <Info className="w-3 h-3 text-slate-400" />
          <span>Hover chart for day-by-day projected metrics</span>
        </div>
      </div>

      {/* D3 SVG Container with Relative Tooltip */}
      <div ref={containerRef} className="relative w-full overflow-hidden select-none">
        <svg ref={svgRef} className="w-full" />

        {/* Floating Tooltip Card */}
        {hoveredPoint && tooltipPos && (
          <div
            className="absolute z-20 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-3 bg-slate-900/95 border border-slate-700/80 rounded-xl p-3 shadow-2xl backdrop-blur-md text-xs space-y-1.5 min-w-[170px]"
            style={{
              left: `${tooltipPos.x}px`,
              top: `${tooltipPos.y + 15}px`,
            }}
          >
            <div className="font-extrabold text-white border-b border-slate-800 pb-1 flex items-center justify-between">
              <span>{hoveredPoint.label}</span>
              <span className="text-[10px] text-slate-400 font-mono">Day {hoveredPoint.day}</span>
            </div>

            <div className="space-y-1 text-[11px]">
              {showYoutube && (
                <div className="flex items-center justify-between text-red-400">
                  <span className="flex items-center gap-1">
                    <Youtube className="w-3 h-3" />
                    <span>YouTube:</span>
                  </span>
                  <span className="font-mono font-bold text-white">
                    {hoveredPoint.youtubeViews.toLocaleString()} views
                  </span>
                </div>
              )}

              {showInstagram && (
                <div className="flex items-center justify-between text-pink-400">
                  <span className="flex items-center gap-1">
                    <Instagram className="w-3 h-3" />
                    <span>Instagram:</span>
                  </span>
                  <span className="font-mono font-bold text-white">
                    {hoveredPoint.instagramViews.toLocaleString()} views
                  </span>
                </div>
              )}

              {showSearch && (
                <div className="flex items-center justify-between text-indigo-400 border-t border-slate-800/80 pt-1">
                  <span className="flex items-center gap-1">
                    <Globe className="w-3 h-3" />
                    <span>Search Index:</span>
                  </span>
                  <span className="font-mono font-bold text-white">
                    {hoveredPoint.searchInterest}/100
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
