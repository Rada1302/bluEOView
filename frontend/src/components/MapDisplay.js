import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Plot from 'react-plotly.js';
import {
  colors, EARTH_TEXTURE
} from '../constants';
import { generateColorbarTicks } from '../utils';

const axisBase = {
  showgrid: false,
  zeroline: false,
  showline: false,
  ticks: '',
  showticklabels: false,
};

const MARGIN = { l: 20, r: 70, t: 50, b: 20 };

const HatchOverlay = ({ uncertaintyMask, lats, lons, margin, zoomedArea }) => {
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

    const lonMin = zoomedArea?.x?.[0] ?? lons[0];
    const lonMax = zoomedArea?.x?.[1] ?? lons[lons.length - 1];

    const latAtTopPx = zoomedArea?.y?.[1] ?? lats[0];
    const latAtBotPx = zoomedArea?.y?.[0] ?? lats[lats.length - 1];

    const lonRange = lonMax - lonMin;
    const latRange = latAtBotPx - latAtTopPx;

    const lonToX = (lon) => margin.l + ((lon - lonMin) / lonRange) * plotW;
    const latToY = (lat) => margin.t + ((lat - latAtTopPx) / latRange) * plotH;

    const cellLonHalf = lons.length > 1 ? Math.abs(lons[1] - lons[0]) / 2 : 0;
    const cellLatHalf = lats.length > 1 ? Math.abs(lats[1] - lats[0]) / 2 : 0;

    const latViewMin = Math.min(latAtTopPx, latAtBotPx);
    const latViewMax = Math.max(latAtTopPx, latAtBotPx);

    ctx.save();
    ctx.beginPath();
    for (let r = 0; r < nRows; r++) {
      for (let c = 0; c < nCols; c++) {
        if (uncertaintyMask[r][c] !== 1) continue;
        const lon = lons[c];
        const lat = lats[r];

        // Cull cells fully outside the visible viewport
        if (lon + cellLonHalf < lonMin || lon - cellLonHalf > lonMax) continue;
        if (lat + cellLatHalf < latViewMin || lat - cellLatHalf > latViewMax) continue;

        const x0 = lonToX(lon - cellLonHalf);
        const x1 = lonToX(lon + cellLonHalf);
        const yA = latToY(lat - cellLatHalf);
        const yB = latToY(lat + cellLatHalf);
        ctx.rect(Math.min(x0, x1), Math.min(yA, yB), Math.abs(x1 - x0), Math.abs(yB - yA));
      }
    }
    ctx.clip();

    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 1.2;
    const step = 5;
    for (let i = -H; i < W + H; i += step) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + H, H);
      ctx.stroke();
    }
    ctx.restore();
  }, [uncertaintyMask, lats, lons, margin, zoomedArea]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 3,
      }}
    />
  );
};

// Badge shown when the map is zoomed in
const ZoomHint = ({ visible }) => (
  <div
    style={{
      position: 'absolute',
      bottom: 10,
      left: '50%',
      transform: `translateX(-50%) translateY(${visible ? 0 : 8}px)`,
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.25s ease, transform 0.25s ease',
      pointerEvents: 'none',
      zIndex: 10,
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      backgroundColor: 'rgba(0,0,0,0.72)',
      border: '1px solid rgba(255,255,255,0.22)',
      borderRadius: 20,
      padding: '5px 13px 5px 9px',
      backdropFilter: 'blur(6px)',
      whiteSpace: 'nowrap',
      boxShadow: '0 2px 12px rgba(0,0,0,0.45)',
    }}
  >
    <svg width="14" height="20" viewBox="0 0 14 20" fill="none" style={{ flexShrink: 0 }}>
      <rect x="1" y="1" width="12" height="18" rx="6" stroke="rgba(255,255,255,0.75)" strokeWidth="1.5" fill="none" />
      <line x1="7" y1="1" x2="7" y2="8" stroke="rgba(255,255,255,0.75)" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="7" cy="5" r="1.5" fill="white" />
    </svg>
    <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: 500, letterSpacing: '0.01em' }}>
      Double-click to zoom out
    </span>
  </div>
);

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

  const colorscale = useMemo(() => {
    const n = colors.length;
    const stops = [];
    colors.forEach((color, i) => {
      const pos = parseFloat((i / (n - 1)).toFixed(6));
      if (i > 0) stops.push([pos, colors[i - 1]]);
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

  const isZoomed = zoomedArea != null;

  const colorbarBase = {
    tickcolor: 'white',
    tickfont: { color: 'white', size: 11 },
    ticks: 'outside',
    thickness: 18,
    len: 0.84,
    lenmode: 'fraction',
    yanchor: 'top',
    y: 0.9,
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

    images: [
      {
        source: EARTH_TEXTURE,
        xref: 'x',
        yref: 'y',
        x: -180,
        y: -90,
        sizex: 360,
        sizey: 180,
        sizing: 'stretch',
        layer: 'below',
      },
    ],

    xaxis: {
      ...axisBase,
      range: zoomedArea?.x ?? undefined,
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
                      opacity: 0.7,
                      colorscale,
                      zauto: false,
                      zsmooth: false,
                      zmin: minValue,
                      zmax: maxValue,
                      colorbar: { ...colorbarBase, tickvals, ticktext },
                      hovertemplate: 'Lon: %{x}<br>Lat: %{y}<br>Mean: %{z}<extra></extra>',
                    },
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
                    zoomedArea={zoomedArea}
                  />
                )}
                <ZoomHint visible={isZoomed} />
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
                <ZoomHint visible={isZoomed} />
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default MapDisplay;