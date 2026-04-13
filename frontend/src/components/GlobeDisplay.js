import React, { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import Globe from 'react-globe.gl';
import {
  generateColorStops,
  getInterpolatedColorFromValue,
  getLegendFromColorscale
} from '../utils';

import { colors, EARTH_TEXTURE } from '../constants';

const SD_THRESHOLD = 50; // percent

const GlobeDisplay = ({ month, feature, netcdfUrl, fullTitle }) => {
  const meanContainerRef = useRef(null);
  const stdContainerRef = useRef(null);
  const meanGlobeRef = useRef();
  const stdGlobeRef = useRef();

  const [meanDims, setMeanDims] = useState({ width: 0, height: 0 });
  const [stdDims, setStdDims] = useState({ width: 0, height: 0 });
  const [pointsData, setPointsData] = useState({ mean: [], std: [], hatch: [] });
  const [minValue, setMinValue] = useState(null);
  const [maxValue, setMaxValue] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isVertical, setIsVertical] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 900 : false
  );

  const cacheRef = useRef({});
  const colorscale = useMemo(() => generateColorStops(colors), []);

  useEffect(() => {
    const measure = () => {
      setIsVertical(window.innerWidth < 900);
      if (meanContainerRef.current) {
        const { offsetWidth, offsetHeight } = meanContainerRef.current;
        setMeanDims({ width: offsetWidth, height: offsetHeight });
      }
      if (stdContainerRef.current) {
        const { offsetWidth, offsetHeight } = stdContainerRef.current;
        setStdDims({ width: offsetWidth, height: offsetHeight });
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
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ feature, timeIndex: month.toString(), file: netcdfUrl });
      const res = await fetch(`/api/diversity-map?${params}`, { signal });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? `Server error ${res.status}`);

      const { lats, lons, mean, sd, minValue: minVal, maxValue: maxVal, sdMax } = json;

      if (!lats?.length || !lons?.length || !mean?.length) throw new Error('API returned empty data');

      const step = 2;
      const meanPoints = [];
      const stdPoints = [];
      const hatchPoints = []; // dark dots over high-SD cells on the mean globe

      for (let li = 0; li < lats.length; li += step) {
        const lat = lats[li];
        const dataRow = lats.length - 1 - li;
        for (let oi = 0; oi < lons.length; oi += step) {
          const lon = lons[oi] > 180 ? lons[oi] - 360 : lons[oi];
          const meanVal = mean?.[dataRow]?.[oi];
          const sdVal = sd?.[dataRow]?.[oi];

          if (meanVal === null || meanVal === undefined) continue;

          meanPoints.push({
            lat, lng: lon,
            color: getInterpolatedColorFromValue(meanVal, minVal, maxVal, colorscale),
          });

          if (sdVal !== null && sdVal !== undefined) {
            // sdVal is raw, normalize to 0–100% using sdMax
            const sdPct = sdMax > 0 ? (sdVal / sdMax) * 100 : 0;

            // SD globe: white below 50%, red above
            stdPoints.push({
              lat, lng: lon,
              color: sdPct <= 50 ? '#ffffff' : '#ff2222',
            });

            if (sdPct > SD_THRESHOLD) {
              hatchPoints.push({ lat, lng: lon, color: 'rgba(0,0,0,0.55)' });
            }
          }
        }
      }

      const transformed = { mean: meanPoints, std: stdPoints, hatch: hatchPoints };
      cacheRef.current[cacheKey] = { pointsData: transformed, minValue: minVal, maxValue: maxVal };
      setPointsData(transformed);
      setMinValue(minVal);
      setMaxValue(maxVal);
      setError(null);

    } catch (err) {
      if (err.name === 'AbortError') return;
      setError(err.message ?? 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, [netcdfUrl, colorscale]);

  useEffect(() => {
    if (!netcdfUrl || !feature) return;
    const controller = new AbortController();
    fetchData(month, feature, controller.signal);
    return () => controller.abort();
  }, [month, feature, netcdfUrl, fetchData]);

  const meanLegend = useMemo(() => (
    minValue == null || maxValue == null ? null
      : getLegendFromColorscale(colorscale, minValue, maxValue)
  ), [minValue, maxValue, colorscale]);

  const stdLegend = useMemo(() => ({
    colors: ['#ffffff', '#ff2222'],
    labels: ['0%', '50%', '100%'],
  }), []);

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
    backgroundColor: 'rgba(18,18,18,0.6)', borderRadius: 6, overflow: 'hidden',
  };
  const subLabel = {
    position: 'absolute', top: 10, left: 0, width: '100%',
    textAlign: 'center', fontSize: 17, color: 'white',
    pointerEvents: 'none', zIndex: 5,
  };

  const renderGlobe = (containerRef, globeRef, data, hatchData, legend, title, dims) => (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={aspectBox}>
        <div ref={containerRef} style={aspectInner}>
          <div style={subLabel}>{title}</div>
          <Globe
            ref={globeRef}
            width={dims.width}
            height={dims.height}
            globeImageUrl={EARTH_TEXTURE}
            backgroundColor="rgba(0,0,0,0)"
            showAtmosphere={false}
            pointsData={[...data, ...(hatchData ?? [])]}
            pointAltitude={0}
            pointColor={d => d.color}
            pointRadius={1}
            pointsMerge={false}
            pointTransitionDuration={0}
          />
          {renderLegend(legend)}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
      {isLoading && (
        <div style={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center', padding: '40px 0' }}>Loading globe data…</div>
      )}
      {!isLoading && error && (
        <div style={{ color: '#ff6b6b', textAlign: 'center', padding: '40px 16px' }}>{error}</div>
      )}
      {!isLoading && !error && (
        <div style={{ display: 'flex', flexDirection: isVertical ? 'column' : 'row', gap: 8 }}>
          {renderGlobe(meanContainerRef, meanGlobeRef, pointsData.mean, pointsData.hatch, meanLegend, `${fullTitle}`, meanDims)}
          {renderGlobe(stdContainerRef, stdGlobeRef, pointsData.std, null, stdLegend, `${fullTitle} (Standard Deviation)`, stdDims)}
        </div>
      )}
    </div>
  );
};

export default GlobeDisplay;