import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Plot from 'react-plotly.js';
import {
  colors,
  mapGlobeTitleStyle,
  STD_THRESHOLD,
  stdColorscale,
} from '../constants';
import { generateColorStops, generateColorbarTicks } from '../utils';

const axisBase = {
  showgrid: false,
  zeroline: false,
  showline: false,
  ticks: '',
  showticklabels: false,
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

  const colorscale = useMemo(() => generateColorStops(colors), []);

  // Fetch
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

  const sdThreshold = sdMax != null ? sdMax * 0.5 : STD_THRESHOLD;

  const hasHighSD = useMemo(
    () => stdData.some(row => row.some(v => v !== null && v > sdThreshold)),
    [stdData, sdThreshold]
  );
  const uncertaintyMask = useMemo(
    () => stdData.map(row => row.map(v => (v !== null && v > sdThreshold ? 1 : 0))),
    [stdData, sdThreshold]
  );

  // Shared layout for both plots
  const sharedLayout = useMemo(() => ({
    margin: { l: 0, r: 60, t: 30, b: 0 },
    paper_bgcolor: 'rgba(0,0,0,0.5)',
    plot_bgcolor: '#0a1628',
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

  const plotStyle = { width: '100%', height: '100%' };
  const wrapStyle = {
    flex: 1,
    minWidth: 0,
    position: 'relative',
  };
  const labelStyle = {
    position: 'absolute',
    top: 6,
    left: 0,
    width: '100%',
    textAlign: 'center',
    color: 'white',
    fontSize: 15,
    pointerEvents: 'none',
    zIndex: 2,
  };

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Title */}
      <div style={mapGlobeTitleStyle}>{fullTitle}</div>

      {loading && (
        <div style={{ color: 'white', textAlign: 'center', paddingTop: 60 }}>Loading…</div>
      )}
      {!loading && error && (
        <div style={{ color: '#ff6b6b', textAlign: 'center', padding: '60px 16px' }}>{error}</div>
      )}

      {!loading && !error && hasData && (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: isVertical ? 'column' : 'row',
          gap: 4,
          paddingTop: 40, // space for title
        }}>
          {/* Mean */}
          <div style={wrapStyle}>
            <div style={labelStyle}>Mean</div>
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
                  colorbar: {
                    tickvals, ticktext,
                    tickcolor: 'white',
                    tickfont: { color: 'white' },
                    ticks: 'outside',
                    thickness: 15,
                  },
                  hovertemplate: 'Lon: %{x}<br>Lat: %{y}<br>Mean: %{z}<extra></extra>',
                },
                ...(hasHighSD ? [{
                  type: 'heatmap',
                  z: uncertaintyMask,
                  x: lons,
                  y: lats,
                  colorscale: [[0, 'rgba(0,0,0,0)'], [1, 'rgba(255,0,0,0.5)']],
                  zsmooth: false,
                  zmin: 0, zmax: 1,
                  showscale: false,
                  hoverinfo: 'skip',
                }] : []),
              ]}
              layout={sharedLayout}
              useResizeHandler
              style={plotStyle}
              onRelayout={handleRelayout}
              onDoubleClick={() => onZoomedAreaChange?.(null)}
              config={{ responsive: true, displayModeBar: false }}
            />
          </div>

          {/* Standard Deviation */}
          <div style={wrapStyle}>
            <div style={labelStyle}>Standard Deviation</div>
            <Plot
              data={[{
                type: 'heatmap',
                z: stdData,
                x: lons,
                y: lats,
                colorscale: stdColorscale,
                zsmooth: false,
                zmin: 0,
                zmax: 100,
                colorbar: {
                  tickvals: [0, 25, 50, 75, 100],
                  ticktext: ['0%', '25%', '50%', '75%', '100%'],
                  tickcolor: 'white',
                  tickfont: { color: 'white' },
                  ticks: 'outside',
                  thickness: 15,
                },
                hovertemplate: 'Lon: %{x}<br>Lat: %{y}<br>SD: %{z}%<extra></extra>',
              }]}
              layout={sharedLayout}
              useResizeHandler
              style={plotStyle}
              onRelayout={handleRelayout}
              onDoubleClick={() => onZoomedAreaChange?.(null)}
              config={{ responsive: true, displayModeBar: false }}
            />
          </div>
        </div>
      )}

      {!loading && !error && !hasData && (
        <div style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', paddingTop: 60 }}>
          No data available.
        </div>
      )}
    </div>
  );
};

export default MapDisplay;