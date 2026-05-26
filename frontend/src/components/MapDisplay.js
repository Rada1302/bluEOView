import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Plot from 'react-plotly.js';
import {
  colors,
  EARTH_TEXTURE,
  SD_COLORSCALE,
  SD_THRESHOLD,
} from '../constants';
import { generateColorbarTicks } from '../utils';


const axisBase = {
  showgrid: false,
  zeroline: false,
  showline: false,
  ticks: '',
  showticklabels: false,
};

const MARGIN = { l: 20, r: 70, t: 70, b: 20 };

const HatchOverlay = ({ uncertaintyMask, lats, lons, margin, zoomedArea }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !uncertaintyMask.length) return;
    // Canvas covers only the plot area, so W/H are already the plot dimensions
    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    const nRows = uncertaintyMask.length;
    const nCols = uncertaintyMask[0]?.length ?? 0;
    if (!nRows || !nCols) return;

    const lonMin = zoomedArea?.x?.[0] ?? lons[0];
    const lonMax = zoomedArea?.x?.[1] ?? lons[lons.length - 1];
    const latAtTopPx = zoomedArea?.y?.[1] ?? lats[0];
    const latAtBotPx = zoomedArea?.y?.[0] ?? lats[lats.length - 1];

    const lonRange = lonMax - lonMin;
    const latRange = latAtBotPx - latAtTopPx;

    // Coordinates are relative to the plot area (no margin offset needed)
    const lonToX = lon => ((lon - lonMin) / lonRange) * W;
    const latToY = lat => ((lat - latAtTopPx) / latRange) * H;

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
        if (lon + cellLonHalf < lonMin || lon - cellLonHalf > lonMax) continue;
        if (lat + cellLatHalf < latViewMin || lat - cellLatHalf > latViewMax) continue;

        const x0 = lonToX(lon - cellLonHalf);
        const x1 = lonToX(lon + cellLonHalf);
        const yA = latToY(lat - cellLatHalf);
        const yB = latToY(lat + cellLatHalf);
        ctx.rect(
          Math.min(x0, x1), Math.min(yA, yB),
          Math.abs(x1 - x0), Math.abs(yB - yA)
        );
      }
    }
    ctx.clip();

    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 1.0;
    const step = 6;
    for (let i = -H; i < W + H; i += step) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + H, H);
      ctx.stroke();
    }
    ctx.restore();
  }, [uncertaintyMask, lats, lons, margin, zoomedArea]);

  return (
    // Wrapper is inset to the plot area only, so the canvas can never reach the colorbar
    <div style={{
      position: 'absolute',
      top: margin.t, left: margin.l, right: margin.r, bottom: margin.b,
      pointerEvents: 'none', zIndex: 3,
      overflow: 'hidden',
    }}>
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
      />
    </div>
  );
};


const ZoomHint = ({ visible }) => (
  <div style={{
    position: 'absolute', bottom: 15, left: '50%',
    transform: `translateX(-50%) translateY(${visible ? 0 : 8}px)`,
    opacity: visible ? 1 : 0,
    transition: 'all 0.25s ease',
    pointerEvents: 'none', zIndex: 10,
    display: 'flex', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 20, padding: '6px 14px',
    color: 'white', fontSize: 12,
  }}>
    <span>Double-click to reset zoom</span>
  </div>
);

// Loading overlay with spinner shown over the existing figure while new data fetches
const LoadingOverlay = ({ visible }) => (
  <div style={{
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    opacity: visible ? 1 : 0,
    pointerEvents: visible ? 'all' : 'none',
    transition: 'opacity 0.2s ease',
    zIndex: 20,
    borderRadius: 6,
  }}>
    <div style={{
      width: 40, height: 40,
      border: '3px solid rgba(255,255,255,0.15)',
      borderTop: '3px solid rgba(255,255,255,0.85)',
      borderRadius: '50%',
      animation: 'mapdisplay-spin 0.75s linear infinite',
    }} />
    <style>{`@keyframes mapdisplay-spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

// Title area: shows committed title with a small inline spinner while loading
const PanelTitle = ({ title, loading, style }) => (
  <div style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
    <span>{title}</span>
    {loading && (
      <div style={{
        width: 14, height: 14, flexShrink: 0,
        border: '2px solid rgba(255,255,255,0.2)',
        borderTop: '2px solid rgba(255,255,255,0.85)',
        borderRadius: '50%',
        animation: 'mapdisplay-spin 0.75s linear infinite',
      }} />
    )}
  </div>
);

const varSubtitle = (varInfo, key) => {
  const info = varInfo?.[key];
  if (!info) return null;
  const parts = [info.standard_name, info.long_name].filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
};

const MapDisplay = ({
  mapData,
  onZoomedAreaChange,
  zoomedArea,
  fullTitle,
  baseTitle,
  titleLoading = false,
  showStd,
  showObs,
  varInfo = null,
  loading = false,
  error = null,
}) => {
  const [isVertical, setIsVertical] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 900 : false
  );

  useEffect(() => {
    const h = () => setIsVertical(window.innerWidth < 900);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  const {
    lats = [],
    lons = [],
    mean: meanData = [],
    sdPct: stdData = [],
    obs: obsData = [],
    obsMax = null,
    obsType = null,
    hasObs = false,
    minValue = null,
    maxValue = null,
  } = mapData ?? {};

  const colorscale = useMemo(() => {
    const n = colors.length;
    const stops = [];
    for (let i = 0; i < n; i++) {
      stops.push([i / n, colors[i]]);
      stops.push([(i + 1) / n, colors[i]]);
    }
    return stops;
  }, []);

  const { tickvals, ticktext, finalZMin, finalZMax } = useMemo(() => {
    if (minValue == null || maxValue == null) {
      return { tickvals: [], ticktext: [], finalZMin: minValue, finalZMax: maxValue };
    }
    const ticks = generateColorbarTicks(minValue, maxValue, colorscale.length);
    return { ...ticks, finalZMin: minValue, finalZMax: maxValue };
  }, [fullTitle, minValue, maxValue, colorscale.length]);

  const hasHighSD = useMemo(
    () => stdData.some(row => row.some(v => v !== null && v > SD_THRESHOLD)),
    [stdData]
  );
  const uncertaintyMask = useMemo(
    () => stdData.map(row => row.map(v => (v !== null && v > SD_THRESHOLD ? 1 : 0))),
    [stdData]
  );

  const meanHoverText = useMemo(
    () => meanData.map((row, ri) =>
      row.map((v, ci) => {
        const isUnknown = v === null || (typeof v === 'number' && isNaN(v));
        const valStr = isUnknown ? 'Unknown' : (typeof v === 'number' ? v.toFixed(3) : v);
        const highSD = uncertaintyMask[ri]?.[ci] === 1;
        return `Lon: ${lons[ci]}<br>Lat: ${lats[ri]}<br>Value: ${valStr}${highSD ? '<br>⚠ High uncertainty' : ''}`;
      })
    ),
    [meanData, uncertaintyMask, lats, lons]
  );

  const meanHoverBgColor = useMemo(
    () => meanData.map((row, ri) =>
      row.map((_, ci) =>
        uncertaintyMask[ri]?.[ci] === 1 ? 'rgba(160,0,0,0.9)' : 'rgba(30,30,30,0.85)'
      )
    ),
    [meanData, uncertaintyMask]
  );

  const meanHoverBorderColor = useMemo(
    () => meanData.map((row, ri) =>
      row.map((_, ci) =>
        uncertaintyMask[ri]?.[ci] === 1 ? '#ff2222' : 'rgba(255,255,255,0.2)'
      )
    ),
    [meanData, uncertaintyMask]
  );

  const obsDataLog = useMemo(() => {
    if (obsType === 'diversity' || !obsData.length) return obsData;
    return obsData.map(row => row.map(v => v == null ? null : Math.log10(v + 1)));
  }, [obsData, obsType]);

  const obsTicks = useMemo(() => {
    if (obsType === 'diversity') {
      return { tickvals: [0, 1], ticktext: ['Absent', 'Present'], zmin: 0, zmax: 1 };
    }
    const maxV = obsMax ?? 1;
    const logMax = Math.log10(maxV + 1);
    const tickvals = [0];
    const ticktext = ['0'];
    for (let exp = 0; Math.pow(10, exp) <= maxV; exp++) {
      const v = Math.pow(10, exp);
      tickvals.push(Math.log10(v + 1));
      ticktext.push(String(v));
    }
    if (Math.pow(10, Math.floor(Math.log10(maxV))) < maxV) {
      tickvals.push(logMax);
      ticktext.push(String(Math.round(maxV)));
    }
    return { tickvals, ticktext, zmin: 0, zmax: logMax };
  }, [obsType, obsMax]);

  const obsTitle = obsType === 'diversity'
    ? `${baseTitle} Observations`
    : `${baseTitle} Observation Density`;

  const isZoomed = zoomedArea != null;

  const colorbarBase = {
    tickcolor: 'white',
    tickfont: { color: 'white', size: 11 },
    ticks: 'outside',
    thickness: 18,
    len: 0.84,
    yanchor: 'top', y: 0.9,
    xanchor: 'left', x: 1.01,
    outlinecolor: 'rgba(255,255,255,0.15)',
  };

  const sharedLayout = useMemo(() => ({
    margin: MARGIN,
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    autosize: true,
    dragmode: 'zoom',
    images: [{
      source: EARTH_TEXTURE,
      xref: 'x', yref: 'y',
      x: -180, y: -90,
      sizex: 360, sizey: 180,
      sizing: 'stretch',
      layer: 'below',
    }],
    xaxis: { ...axisBase, range: zoomedArea?.x ?? undefined },
    yaxis: {
      ...axisBase,
      autorange: zoomedArea?.y ? false : 'reversed',
      range: zoomedArea?.y ?? undefined,
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

  const aspectBox = { position: 'relative', width: '100%', paddingTop: '56.25%' };
  const aspectInner = {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(18,18,18,0.8)', borderRadius: 6, overflow: 'hidden',
    cursor: loading ? 'wait' : 'default',
  };
  const titleStyle = {
    position: 'absolute', top: 10, left: 0, width: '100%',
    textAlign: 'center', fontSize: 19, color: 'white',
    pointerEvents: 'none', zIndex: 2,
  };
  const subTitleStyle = {
    position: 'absolute', top: 40, left: 0, width: '100%',
    textAlign: 'center', fontSize: 16, color: 'rgba(255,255,255,0.7)',
    pointerEvents: 'none', zIndex: 2,
  };

  const sdTickVals = [0, 10, 25, 40, 50, 60, 75, 90, 100];
  const sdTickText = sdTickVals.map(p => `${p}%`);

  const renderPanel = (title, subtitle, plotData, extraChildren) => (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={aspectBox}>
        <div style={aspectInner}>
          <PanelTitle title={title} loading={titleLoading} style={titleStyle} />
          <div style={subTitleStyle}>{subtitle}</div>
          <Plot
            data={plotData}
            layout={sharedLayout}
            useResizeHandler
            style={{ width: '100%', height: '100%' }}
            onRelayout={handleRelayout}
            onDoubleClick={() => onZoomedAreaChange?.(null)}
            config={{ responsive: true, displayModeBar: false, doubleClick: false, showTips: false }}
          />
          {extraChildren}
          <LoadingOverlay visible={loading} />
          <ZoomHint visible={isZoomed && !loading} />
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{
        display: 'flex',
        flexDirection: isVertical ? 'column' : 'row',
        gap: 8,
      }}>
        {/* Mean panel */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={aspectBox}>
            <div style={{ ...aspectInner, cursor: loading ? 'wait' : 'default' }}>
              <PanelTitle title={fullTitle} loading={titleLoading} style={titleStyle} />
              <div style={subTitleStyle}>{varSubtitle(varInfo, 'mean')}</div>
              <Plot
                data={meanData.length ? [{
                  type: 'heatmap',
                  z: meanData,
                  x: lons,
                  y: lats,
                  opacity: 0.7,
                  colorscale,
                  zauto: false,
                  zmin: finalZMin,
                  zmax: finalZMax,
                  colorbar: {
                    ...colorbarBase, tickvals, ticktext,
                    ...(varInfo?.mean?.unit && {
                      title: { text: varInfo.mean.unit, side: 'right', font: { color: 'rgba(255,255,255,0.7)', size: 10 } },
                    }),
                  },
                  text: meanHoverText,
                  hovertemplate: '%{text}<extra></extra>',
                  hoverlabel: {
                    bgcolor: meanHoverBgColor,
                    bordercolor: meanHoverBorderColor,
                    font: { color: 'white', size: 12 },
                  },
                }] : []}
                layout={sharedLayout}
                useResizeHandler
                style={{ width: '100%', height: '100%' }}
                onRelayout={handleRelayout}
                onDoubleClick={() => onZoomedAreaChange?.(null)}
                config={{ responsive: true, displayModeBar: false, doubleClick: false, showTips: false }}
              />
              {hasHighSD && (
                <HatchOverlay
                  uncertaintyMask={uncertaintyMask}
                  lats={lats} lons={lons}
                  margin={MARGIN}
                  zoomedArea={zoomedArea}
                />
              )}
              <LoadingOverlay visible={loading} />
              <ZoomHint visible={isZoomed && !loading} />
            </div>
          </div>
        </div>

        {/* SD panel */}
        {showStd && renderPanel(
          `${fullTitle} Standard Deviation`,
          varSubtitle(varInfo, 'sd'),
          stdData.length ? [{
            type: 'heatmap',
            z: stdData,
            x: lons,
            y: lats,
            colorscale: SD_COLORSCALE,
            zmin: 0, zmax: 100,
            colorbar: {
              ...colorbarBase,
              tickvals: sdTickVals,
              ticktext: sdTickText,
            },
            hovertemplate: 'Lon: %{x}<br>Lat: %{y}<br>SD: %{z}%<extra></extra>',
          }] : [],
          null,
        )}

        {/* Obs panel */}
        {showObs && hasObs && renderPanel(
          obsTitle,
          varSubtitle(varInfo, 'obs'),
          obsData.length ? [{
            type: 'heatmap',
            z: obsDataLog,
            x: lons,
            y: lats,
            colorscale: obsType === 'diversity' ? [[0, '#333333'], [1, '#fde725']] : colorscale,
            showscale: obsType !== 'diversity',
            zauto: false,
            zmin: obsTicks.zmin,
            zmax: obsTicks.zmax,
            ...(obsType !== 'diversity' && {
              colorbar: {
                ...colorbarBase,
                tickvals: obsTicks.tickvals,
                ticktext: obsTicks.ticktext,
                ...(varInfo?.obs?.unit && {
                  title: { text: varInfo.obs.unit, side: 'right', font: { color: 'rgba(255,255,255,0.7)', size: 10 } },
                }),
              },
            }),
            hovertemplate: obsType === 'diversity'
              ? 'Lon: %{x}<br>Lat: %{y}<br>Observed: %{z}<extra></extra>'
              : 'Lon: %{x}<br>Lat: %{y}<br>Obs count: %{z}<extra></extra>',
          }] : [],
          null,
        )}
      </div>

      {error && <div style={{ color: '#ff6b6b', textAlign: 'center' }}>{error}</div>}
    </div>
  );
};

export default MapDisplay;