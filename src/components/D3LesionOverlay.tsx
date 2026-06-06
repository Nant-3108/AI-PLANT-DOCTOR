import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { DiagnosticResult } from '../types';

interface LesionData {
  id: string;
  cx: number; // percentage width
  cy: number; // percentage height
  r: number;
  label: string;
  severity: 'Severe' | 'Moderate' | 'Mild' | 'Healthy Node' | 'Unresolved';
  color: string;
  description: string;
}

interface D3LesionOverlayProps {
  currentResult: DiagnosticResult | null;
  parsedData: any;
  isScanning: boolean;
}

export const D3LesionOverlay: React.FC<D3LesionOverlayProps> = ({
  currentResult,
  parsedData,
  isScanning,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hoveredLesion, setHoveredLesion] = useState<LesionData | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Compute container dimensions for relative coordinate calculation
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });

    resizeObserver.observe(containerRef.current);
    // Initial size
    const rect = containerRef.current.getBoundingClientRect();
    setDimensions({ width: rect.width, height: rect.height });

    return () => resizeObserver.disconnect();
  }, []);

  // Generate lesions or points of interest based on the current parsed state
  const getLesionPoints = (): LesionData[] => {
    if (!currentResult || isScanning) return [];

    const diagnosisStr = currentResult.diagnosis ? currentResult.diagnosis.toLowerCase() : '';
    
    // Check states: No Leaf, Healthy, or Specific Disease
    if (parsedData?.isNoLeaf) {
      // Return target bounding region for the non-botanical object
      return [
        {
          id: 'non-leaf-1',
          cx: 50,
          cy: 50,
          r: 45,
          label: 'Unrecognized Taxonomy Target',
          severity: 'Unresolved',
          color: '#f43f5e',
          description: 'Outer perimeter of non-foliar item detected inside active scanner gate.'
        }
      ];
    }

    if (parsedData?.isHealthy) {
      // Healthy node mapping (represents healthy leaf veins or cell density checks)
      return [
        {
          id: 'healthy-node-1',
          cx: 35,
          cy: 50,
          r: 12,
          label: 'Stomata Matrix Alpha',
          severity: 'Healthy Node',
          color: '#22c55e',
          description: 'Optimal chlorophyll reflection, no sign of pathogen spore colonization.'
        },
        {
          id: 'healthy-node-2',
          cx: 65,
          cy: 40,
          r: 10,
          label: 'Vascular Bundle Beta',
          severity: 'Healthy Node',
          color: '#22c55e',
          description: 'Excellent moisture retention with normal leaf tip transpiration rates.'
        }
      ];
    }

    // Is Diseased
    if (currentResult.isDiseased) {
      // Customized for Tomato Early Blight
      if (diagnosisStr.includes('blight') || diagnosisStr.includes('tomato')) {
        return [
          {
            id: 'blight-primary',
            cx: 48,
            cy: 38,
            r: 22,
            label: 'Primary Concentric Necrosis',
            severity: 'Severe',
            color: '#ef4444',
            description: 'Core desiccated tissue exhibiting dark concentric target-board rings.'
          },
          {
            id: 'blight-halo-1',
            cx: 56,
            cy: 42,
            r: 32,
            label: 'Spreading Chlorosis Ring',
            severity: 'Moderate',
            color: '#eab308',
            description: 'Yellow halo margin created by toxin excretion collapsing cell borders.'
          },
          {
            id: 'blight-satellite',
            cx: 32,
            cy: 62,
            r: 14,
            label: 'Secondary Satellite Lesion',
            severity: 'Moderate',
            color: '#f97316',
            description: 'Spore generation site spreading near lateral leaf vein pathway.'
          }
        ];
      }

      // Fallback generator for other diseases using characters count or stable values
      const seed = diagnosisStr.length;
      return [
        {
          id: 'custom-lesion-1',
          cx: Math.max(25, (seed * 7) % 75),
          cy: Math.max(25, (seed * 11) % 75),
          r: 16,
          label: 'Primary Pathogen Node',
          severity: 'Severe',
          color: '#ef4444',
          description: 'Localized hotspot showing abnormal cell pigmentation and cell degradation.'
        },
        {
          id: 'custom-lesion-2',
          cx: Math.max(25, (seed * 13) % 75),
          cy: Math.max(25, (seed * 17) % 75),
          r: 24,
          label: 'Secondary Symptomatic Area',
          severity: 'Moderate',
          color: '#f97316',
          description: 'Area of expanding chlorotic lesion displaying soft rot attributes.'
        }
      ];
    }

    return [];
  };

  useEffect(() => {
    if (!svgRef.current || dimensions.width === 0 || dimensions.height === 0 || isScanning) {
      // Clear SVG on scanning
      d3.select(svgRef.current).selectAll('*').remove();
      return;
    }

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const lesions = getLesionPoints();
    if (lesions.length === 0) return;

    // Draw grid coordinate overlay background for a cool botanical tracker look
    const gridG = svg.append('g').attr('id', 'scanner-grid').style('opacity', 0.15);
    const cols = 5;
    const rows = 4;
    for (let i = 1; i < cols; i++) {
      const x = (i / cols) * dimensions.width;
      gridG.append('line')
        .attr('x1', x)
        .attr('y1', 0)
        .attr('x2', x)
        .attr('y2', dimensions.height)
        .attr('stroke', '#a1a1aa')
        .attr('stroke-width', 0.75)
        .attr('stroke-dasharray', '2,2');
    }
    for (let j = 1; j < rows; j++) {
      const y = (j / rows) * dimensions.height;
      gridG.append('line')
        .attr('x1', 0)
        .attr('y1', y)
        .attr('x2', dimensions.width)
        .attr('y2', y)
        .attr('stroke', '#a1a1aa')
        .attr('stroke-width', 0.75)
        .attr('stroke-dasharray', '2,2');
    }

    // Render interactive nodes
    lesions.forEach((lesion) => {
      const parentX = (lesion.cx / 100) * dimensions.width;
      const parentY = (lesion.cy / 100) * dimensions.height;

      // Group for holding circle and text pointers
      const g = svg.append('g')
        .attr('class', 'lesion-node cursor-pointer pointer-events-auto')
        .style('transition', 'all 0.2s ease-in-out')
        .on('mouseover', function () {
          d3.select(this).select('.main-circle')
            .transition()
            .duration(150)
            .attr('r', lesion.r * 1.35)
            .attr('stroke-width', 3.5);
          
          d3.select(this).select('.pulse-circle')
            .attr('stroke-width', 3);

          setHoveredLesion(lesion);
        })
        .on('mouseout', function () {
          d3.select(this).select('.main-circle')
            .transition()
            .duration(150)
            .attr('r', lesion.r)
            .attr('stroke-width', 1.5);
          
          d3.select(this).select('.pulse-circle')
            .attr('stroke-width', 1);

          setHoveredLesion(null);
        });

      // 1. Pulsing Outer Ring (D3 manual animation element)
      g.append('circle')
        .attr('class', 'pulse-circle')
        .attr('cx', parentX)
        .attr('cy', parentY)
        .attr('r', lesion.r * 1.45)
        .attr('fill', 'none')
        .attr('stroke', lesion.color)
        .attr('stroke-width', 1)
        .style('opacity', 0.85)
        .append('animate')
        .attr('attributeName', 'r')
        .attr('values', `${lesion.r * 0.9};${lesion.r * 1.9}`)
        .attr('dur', '2s')
        .attr('repeatCount', 'indefinite');

      g.append('circle')
        .attr('cx', parentX)
        .attr('cy', parentY)
        .attr('r', lesion.r * 1.45)
        .attr('fill', 'none')
        .attr('stroke', lesion.color)
        .style('opacity', 0.45)
        .append('animate')
        .attr('attributeName', 'opacity')
        .attr('values', '0.7;0')
        .attr('dur', '2s')
        .attr('repeatCount', 'indefinite');

      // 2. Main High-contrast Fill Circle
      g.append('circle')
        .attr('class', 'main-circle')
        .attr('cx', parentX)
        .attr('cy', parentY)
        .attr('r', lesion.r)
        .attr('fill', lesion.color)
        .style('fill-opacity', 0.22)
        .attr('stroke', lesion.color)
        .attr('stroke-width', 1.5);

      // 3. Center Target Dot
      g.append('circle')
        .attr('cx', parentX)
        .attr('cy', parentY)
        .attr('r', 3)
        .attr('fill', '#ffffff')
        .style('filter', 'drop-shadow(0px 0px 3px rgba(0,0,0,0.8))');

      // 4. Fine Technical Pointer Wireframes
      const pathAngle = (lesion.cx > 50) ? Math.PI * 0.25 : Math.PI * 0.75;
      const wireLen = 22;
      const wireX = parentX + Math.cos(pathAngle) * wireLen;
      const wireY = parentY + Math.sin(pathAngle) * wireLen;

      g.append('line')
        .attr('x1', parentX)
        .attr('y1', parentY)
        .attr('x2', wireX)
        .attr('y2', wireY)
        .attr('stroke', lesion.color)
        .attr('stroke-width', 0.8)
        .style('opacity', 0.65);

      g.append('circle')
        .attr('cx', wireX)
        .attr('cy', wireY)
        .attr('r', 1.5)
        .attr('fill', lesion.color);
    });

  }, [dimensions, currentResult, isScanning, parsedData]);

  const hasItems = getLesionPoints().length > 0;

  return (
    <div 
      ref={containerRef}
      className={`absolute inset-0 w-full h-full pointer-events-none select-none z-10 duration-300 ${
        isScanning ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* SVG D3 elements canvas layer */}
      <svg 
        ref={svgRef} 
        className="w-full h-full pointer-events-none select-none"
        style={{ position: 'absolute', top: 0, left: 0 }}
      />

      {/* Floating interactive tooltip inside image box constraint */}
      {hoveredLesion && (
        <div 
          className="absolute bottom-3 left-3 right-3 bg-zinc-950/95 border border-zinc-800/90 text-left p-3 rounded-xl backdrop-blur-md shadow-2xl flex flex-col gap-1 pointer-events-none select-none animate-fadeIn max-w-[calc(100%-24px)]"
          style={{ zIndex: 30 }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono tracking-widest uppercase font-bold text-zinc-500">
              Diagnostic Overlay Tracker
            </span>
            <span 
              className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded"
              style={{ 
                backgroundColor: `${hoveredLesion.color}15`, 
                color: hoveredLesion.color,
                border: `1px solid ${hoveredLesion.color}30`
              }}
            >
              {hoveredLesion.severity}
            </span>
          </div>
          <h5 className="text-xs font-bold text-white mt-1">
            {hoveredLesion.label}
          </h5>
          <p className="text-[10px] text-zinc-400 leading-relaxed font-light">
            {hoveredLesion.description}
          </p>
        </div>
      )}

      {/* Persistent Infographic Status Overlay */}
      {hasItems && (
        <div className="absolute top-3 right-3 bg-[#0a0a0ae0] backdrop-blur-md border border-zinc-800/80 px-2 py-1 rounded text-[8px] font-mono text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 z-20">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
          D3 Infrared Hotspots
        </div>
      )}
    </div>
  );
};
