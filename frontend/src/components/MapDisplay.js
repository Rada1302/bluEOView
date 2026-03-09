import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Plot from 'react-plotly.js';
import {
  colors,
  mapGlobeTitleStyle,
  STD_THRESHOLD,
} from '../constants';
import { generateColorStops, generateColorbarTicks } from '../utils';

const axisBase = {
  showgrid: false,
  zeroline: false,
  showline: false,
  ticks: '',
  showticklabels: false,
};

const MARGIN = { l: 20, r: 70, t: 50, b: 0 };

const HatchOverlay = ({ uncertaintyMask, lats, lons, margin }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !uncertaintyMask.length) return;
    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    const plotW = W - margin.l - margin.r;
    const plotH = H - margin.t - margin.b;
    const nRows = uncertaintyMask.length;
    const nCols = uncertaintyMask[0]?.length ?? 0;
    if (!nRows || !nCols) return;

    const cellW = plotW / nCols;
    const cellH = plotH / nRows;

    // Draw hatch pattern only over masked cells
    ctx.save();
    ctx.beginPath();
    for (let r = 0; r < nRows; r++) {
      for (let c = 0; c < nCols; c++) {
        if (uncertaintyMask[r][c] === 1) {
          const x = margin.l + c * cellW;
          const y = margin.t + r * cellH;
          ctx.rect(x, y, cellW, cellH);
        }
      }
    }
    ctx.clip();

    // Draw diagonal lines across the whole canvas (clipped to masked cells)
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 1.2;
    const step = 5;
    for (let i = -(H); i < W + H; i += step) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + H, H);
      ctx.stroke();
    }
    ctx.restore();
  }, [uncertaintyMask, margin]);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 3 }}
    />
  );
};

const MapDisplay = ({
  month,
  feature,
  netcdfUrl,
  onZoomedAreaChange,
  zoomedArea,
  fullTitle,
}) => {
  const [lats, setLats] = useState([]);
  const [lons, setLons] = useState([]);
  const [meanData, setMeanData] = useState([]);
  const [stdData, setStdData] = useState([]);
  const [minValue, setMinValue] = useState(null);
  const [maxValue, setMaxValue] = useState(null);
  const [sdMax, setSdMax] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isVertical, setIsVertical] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 900 : false
  );

  useEffect(() => {
    const handleResize = () => setIsVertical(window.innerWidth < 900);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Discrete colorscale: each color occupies an equal bin with hard edges
  const colorscale = useMemo(() => {
    const n = colors.length;
    const stops = [];
    colors.forEach((color, i) => {
      const pos = parseFloat((i / (n - 1)).toFixed(6));
      if (i > 0) stops.push([pos, colors[i - 1]]); // hard left edge of bin
      stops.push([pos, color]);
    });
    return stops;
  }, []);

  useEffect(() => {
    if (!feature || !netcdfUrl) return;
    const controller = new AbortController();

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ feature, timeIndex: month.toString(), file: netcdfUrl });
        const res = await fetch(`/api/diversity-map?${params}`, { signal: controller.signal });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json?.error ?? `HTTP ${res.status}`);
        }
        const json = await res.json();
        const rawSd = json.sd ?? [];
        const sdMaxV = json.sdMax ?? null;
        const sdPct = sdMaxV > 0
          ? rawSd.map(row => row.map(v => v === null ? null : Math.round(v / sdMaxV * 100 * 10) / 10))
          : rawSd;
        setLats(json.lats ?? []);
        setLons(json.lons ?? []);
        setMeanData(json.mean ?? []);
        setStdData(sdPct);
        setMinValue(json.minValue ?? null);
        setMaxValue(json.maxValue ?? null);
        setSdMax(sdMaxV);
      } catch (err) {
        if (err.name !== 'AbortError') setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    return () => controller.abort();
  }, [month, feature, netcdfUrl]);

  const { tickvals, ticktext } = useMemo(() => {
    if (minValue == null || maxValue == null) return { tickvals: [], ticktext: [] };
    return generateColorbarTicks(minValue, maxValue, colorscale.length);
  }, [minValue, maxValue, colorscale]);

  const sdThreshold = 50;

  const hasHighSD = useMemo(
    () => stdData.some(row => row.some(v => v !== null && v > sdThreshold)),
    [stdData, sdThreshold]
  );
  const uncertaintyMask = useMemo(
    () => stdData.map(row => row.map(v => (v !== null && v > sdThreshold ? 1 : 0))),
    [stdData, sdThreshold]
  );

  const colorbarBase = {
    tickcolor: 'white',
    tickfont: { color: 'white', size: 11 },
    ticks: 'outside',
    thickness: 18,
    len: 0.84,
    lenmode: 'fraction',
    yanchor: 'top',
    y: 1,
    xanchor: 'left',
    x: 1.01,
    outlinecolor: 'rgba(255,255,255,0.15)',
    outlinewidth: 1,
  };

  const sharedLayout = useMemo(() => ({
    margin: MARGIN,
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    autosize: true,
    dragmode: 'zoom',
    xaxis: {
      ...axisBase,
      ...(zoomedArea?.x ? { range: zoomedArea.x, autorange: false } : { autorange: true }),
    },
    yaxis: {
      ...axisBase,
      autorange: zoomedArea?.y ? false : 'reversed',
      ...(zoomedArea?.y ? { range: zoomedArea.y } : {}),
    },
  }), [zoomedArea]);

  const handleRelayout = useCallback(evt => {
    if (evt['xaxis.autorange'] || evt['yaxis.autorange']) {
      onZoomedAreaChange?.(null);
      return;
    }
    const xr = evt['xaxis.range'] ?? [evt['xaxis.range[0]'], evt['xaxis.range[1]']];
    const yr = evt['yaxis.range'] ?? [evt['yaxis.range[0]'], evt['yaxis.range[1]']];
    if (xr?.[0] != null && yr?.[0] != null) onZoomedAreaChange?.({ x: xr, y: yr });
  }, [onZoomedAreaChange]);

  const hasData = meanData.length > 0 && lats.length > 0 && lons.length > 0;

  const aspectBox = {
    position: 'relative',
    width: '100%',
    paddingTop: '56.25%',
  };
  const aspectInner = {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(18,18,18,0.6)',
    borderRadius: 6,
    overflow: 'hidden',
  };

  const subLabel = {
    position: 'absolute',
    top: 10,
    left: 0,
    width: '100%',
    textAlign: 'center',
    fontSize: 17,
    pointerEvents: 'none',
    zIndex: 2,
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>

      {loading && (
        <div style={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center', padding: '40px 0' }}>Loading…</div>
      )}
      {!loading && error && (
        <div style={{ color: '#ff6b6b', textAlign: 'center', padding: '40px 16px' }}>{error}</div>
      )}
      {!loading && !error && !hasData && (
        <div style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '40px 0' }}>No data available.</div>
      )}

      {!loading && !error && hasData && (
        <div style={{ display: 'flex', flexDirection: isVertical ? 'column' : 'row', gap: 8 }}>

          {/* Mean */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={aspectBox}>
              <div style={aspectInner}>
                <div style={subLabel}>{fullTitle} (Mean)</div>
                <Plot
                  data={[
                    {
                      type: 'heatmap',
                      z: meanData,
                      x: lons,
                      y: lats,
                      colorscale,
                      zauto: false,
                      zsmooth: false,
                      zmin: minValue,
                      zmax: maxValue,
                      colorbar: { ...colorbarBase, tickvals, ticktext },
                      hovertemplate: 'Lon: %{x}<br>Lat: %{y}<br>Mean: %{z}<extra></extra>',
                    },
                    // hatch overlay rendered via SVG below
                  ]}
                  layout={sharedLayout}
                  useResizeHandler
                  style={{ width: '100%', height: '100%' }}
                  onRelayout={handleRelayout}
                  onDoubleClick={() => onZoomedAreaChange?.(null)}
                  config={{ responsive: true, displayModeBar: false }}
                />
                {hasHighSD && (
                  <HatchOverlay
                    uncertaintyMask={uncertaintyMask}
                    lats={lats}
                    lons={lons}
                    margin={MARGIN}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Standard Deviation */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={aspectBox}>
              <div style={aspectInner}>
                <div style={subLabel}>{fullTitle} (Standard Deviation)</div>
                <Plot
                  data={[{
                    type: 'heatmap',
                    z: stdData,
                    x: lons,
                    y: lats,
                    colorscale: [
                      [0, '#ffffff'],
                      [0.5, '#ffffff'],
                      [0.5, '#ff2222'],
                      [1.0, '#cc0000'],
                    ],
                    zsmooth: false,
                    zmin: 0,
                    zmax: 100,
                    colorbar: {
                      ...colorbarBase,
                      tickvals: [0, 25, 50, 75, 100],
                      ticktext: ['0%', '25%', '50%', '75%', '100%'],
                    },
                    hovertemplate: 'Lon: %{x}<br>Lat: %{y}<br>SD: %{z}%<extra></extra>',
                  }]}
                  layout={sharedLayout}
                  useResizeHandler
                  style={{ width: '100%', height: '100%' }}
                  onRelayout={handleRelayout}
                  onDoubleClick={() => onZoomedAreaChange?.(null)}
                  config={{ responsive: true, displayModeBar: false }}
                />
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default MapDisplay;