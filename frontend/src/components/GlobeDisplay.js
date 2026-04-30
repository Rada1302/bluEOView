import React, { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import Globe from 'react-globe.gl';
import {
  generateColorStops,
  getInterpolatedColorFromValue,
  getLegendFromColorscale
} from '../utils';

import { colors, EARTH_TEXTURE, SD_COLORSCALE } from '../constants';

const SD_THRESHOLD = 50;

const interpolateSdColor = (() => {
  const parseHex = (hex) => {
    const h = hex.replace('#', '');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  };
  return (pct) => {
    const t = Math.max(0, Math.min(100, pct)) / 100;
    let lo = SD_COLORSCALE[0];
    let hi = SD_COLORSCALE[SD_COLORSCALE.length - 1];
    for (let i = 0; i < SD_COLORSCALE.length - 1; i++) {
      if (t >= SD_COLORSCALE[i][0] && t <= SD_COLORSCALE[i + 1][0]) {
        lo = SD_COLORSCALE[i];
        hi = SD_COLORSCALE[i + 1];
        break;
      }
    }
    const range = hi[0] - lo[0];
    const f = range === 0 ? 0 : (t - lo[0]) / range;
    const [r0, g0, b0] = parseHex(lo[1]);
    const [r1, g1, b1] = parseHex(hi[1]);
    const r = Math.round(r0 + (r1 - r0) * f);
    const g = Math.round(g0 + (g1 - g0) * f);
    const b = Math.round(b0 + (b1 - b0) * f);
    return `rgb(${r},${g},${b})`;
  };
})();

const ToggleStdButton = ({ showStd, onToggle }) => (
  <button
    onClick={onToggle}
    style={{
      position: 'absolute',
      top: 10,
      right: 10,
      zIndex: 10,
      padding: '4px 10px',
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: '0.04em',
      borderRadius: 4,
      border: '1px solid rgba(255,255,255,0.25)',
      backgroundColor: 'rgba(30,30,30,0.75)',
      color: 'white',
      cursor: 'pointer',
      backdropFilter: 'blur(4px)',
      transition: 'all 0.2s ease',
    }}
  >
    {showStd ? '✕ Hide SD' : '+ Show SD'}
  </button>
);

const GlobeDisplay = ({ month, feature, netcdfUrl, fullTitle, showStd, onToggleStd }) => {
  const meanContainerRef = useRef(null);
  const stdContainerRef = useRef(null);
  const meanGlobeRef = useRef();
  const stdGlobeRef = useRef();

  const [meanDims, setMeanDims] = useState({ width: 0, height: 0 });
  const [stdDims, setStdDims] = useState({ width: 0, height: 0 });
  const [pointsData, setPointsData] = useState({ mean: [], std: [] });
  const [minValue, setMinValue] = useState(null);
  const [maxValue, setMaxValue] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isVertical, setIsVertical] = useState(typeof window !== 'undefined' ? window.innerWidth < 900 : false);

  const cacheRef = useRef({});
  const colorscale = useMemo(() => generateColorStops(colors), []);

  useEffect(() => {
    const measure = () => {
      setIsVertical(window.innerWidth < 900);
      if (meanContainerRef.current) {
        setMeanDims({
          width: meanContainerRef.current.offsetWidth,
          height: meanContainerRef.current.offsetHeight
        });
      }
      if (stdContainerRef.current) {
        setStdDims({
          width: stdContainerRef.current.offsetWidth,
          height: stdContainerRef.current.offsetHeight
        });
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const fetchData = useCallback(async (month, feature, signal) => {
    if (!feature || !netcdfUrl) return;
    const cacheKey = `${month}_${feature}_${netcdfUrl}`;
    if (cacheRef.current[cacheKey]) {
      const c = cacheRef.current[cacheKey];
      setPointsData(c.pointsData);
      setMinValue(c.minValue);
      setMaxValue(c.maxValue);
      setError(null);
      return;
    }

    setIsLoading(true);
    try {
      const params = new URLSearchParams({ feature, timeIndex: month.toString(), file: netcdfUrl });
      const res = await fetch(`/api/diversity-map?${params}`, { signal });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? `Server error ${res.status}`);

      const { lats, lons, mean, sd, minValue: minVal, maxValue: maxVal, sdMax } = json;

      const step = 3;
      const meanPoints = [];
      const stdPoints = [];

      for (let li = 0; li < lats.length; li += step) {
        const lat = lats[li];
        const dataRow = lats.length - 1 - li;
        for (let oi = 0; oi < lons.length; oi += step) {
          const lon = lons[oi] > 180 ? lons[oi] - 360 : lons[oi];
          const meanVal = mean?.[dataRow]?.[oi];
          const sdVal = sd?.[dataRow]?.[oi];

          if (meanVal === null || meanVal === undefined) continue;

          const sdPct = (sdMax > 0 && sdVal != null) ? (sdVal / sdMax) * 100 : 0;

          meanPoints.push({
            lat, lng: lon,
            val: meanVal,
            isUncertain: sdPct > SD_THRESHOLD,
          });

          if (sdVal !== null && sdVal !== undefined) {
            stdPoints.push({
              lat, lng: lon,
              sdPct,
              color: interpolateSdColor(sdPct),
            });
          }
        }
      }

      const transformed = { mean: meanPoints, std: stdPoints };
      cacheRef.current[cacheKey] = { pointsData: transformed, minValue: minVal, maxValue: maxVal };
      setPointsData(transformed);
      setMinValue(minVal);
      setMaxValue(maxVal);
      setError(null);
    } catch (err) {
      if (err.name !== 'AbortError') setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [netcdfUrl, colorscale]);

  useEffect(() => {
    const controller = new AbortController();
    fetchData(month, feature, controller.signal);
    return () => controller.abort();
  }, [month, feature, netcdfUrl, fetchData]);

  const meanLegend = useMemo(() => (
    minValue == null || maxValue == null ? null
      : getLegendFromColorscale(colorscale, minValue, maxValue)
  ), [minValue, maxValue, colorscale]);

  // SD legend derived from SD_COLORSCALE stops — matches the map's colorbar ticks exactly
  const sdLegend = useMemo(() => {
    const tickPcts = [0, 10, 25, 40, 50, 60, 75, 90, 100];
    return {
      colors: tickPcts.map(p => interpolateSdColor(p)),
      labels: tickPcts.map(p => `${p}%`),
    };
  }, []);

  const renderLegend = (legendData) => {
    if (!legendData) return null;
    return (
      <div style={{
        position: 'absolute', top: 50, right: 10,
        width: 70, height: 'calc(100% - 70px)',
        display: 'flex', flexDirection: 'row', alignItems: 'center',
        pointerEvents: 'none', zIndex: 10,
      }}>
        <div style={{ flex: 2, display: 'flex', flexDirection: 'column-reverse', height: '96%' }}>
          {legendData.colors.map((c, i) => (
            <div key={i} style={{ flex: 1, backgroundColor: c }} />
          ))}
        </div>
        <div style={{
          flex: 3, display: 'flex', flexDirection: 'column-reverse',
          justifyContent: 'space-between', marginLeft: 4, height: '97%',
        }}>
          {legendData.labels.map((lbl, i) => (
            <div key={i} style={{ color: 'white', fontSize: 12 }}>{lbl}</div>
          ))}
        </div>
      </div>
    );
  };

  const aspectBox = { position: 'relative', width: '100%', paddingTop: '56.25%' };
  const aspectInner = {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#0a0a0a', borderRadius: 6, overflow: 'hidden',
  };
  const subLabel = {
    position: 'absolute', top: 10, left: 0, width: '100%',
    textAlign: 'center', fontSize: 17, color: 'white',
    pointerEvents: 'none', zIndex: 5,
  };

  const renderGlobe = (containerRef, globeRef, data, isMean, legend, title, dims) => (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={aspectBox}>
        <div ref={containerRef} style={{ ...aspectInner, cursor: isLoading ? 'wait' : 'default' }}>
          <div style={subLabel}>{title}</div>
          <Globe
            ref={globeRef}
            width={dims.width}
            height={dims.height}
            globeImageUrl={EARTH_TEXTURE}
            backgroundColor="rgba(0,0,0,0)"
            pointsData={data}
            pointColor={d => isMean
              ? (d.isUncertain ? 'rgba(0,0,0,0.6)' : getInterpolatedColorFromValue(d.val, minValue, maxValue, colorscale))
              : d.color
            }
            pointRadius={1.2}
            pointAltitude={0.005}
            pointsMerge={true}
            pointTransitionDuration={0}
          />
          {renderLegend(legend)}
          {isMean && <ToggleStdButton showStd={showStd} onToggle={onToggleStd} />}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', flexDirection: isVertical ? 'column' : 'row', gap: 8 }}>
        {renderGlobe(meanContainerRef, meanGlobeRef, pointsData.mean, true, meanLegend, fullTitle, meanDims)}
        {showStd && renderGlobe(stdContainerRef, stdGlobeRef, pointsData.std, false, sdLegend, `${fullTitle} (Standard Deviation)`, stdDims)}
      </div>
      {error && <div style={{ color: '#ff6b6b', textAlign: 'center', padding: '10px' }}>{error}</div>}
    </div>
  );
};

export default GlobeDisplay;