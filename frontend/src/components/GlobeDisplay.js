import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import Globe from 'react-globe.gl';

import {
  generateColorStops,
  getInterpolatedColorFromValue,
  getLegendFromColorscale
} from '../utils';

import {
  colors,
  stdColorscale,
  mapGlobeTitleStyle
} from '../constants';

const GlobeDisplay = ({ month, feature, netcdfUrl, fullTitle }) => {
  const containerRef = useRef(null);
  const meanGlobeRef = useRef();
  const stdGlobeRef = useRef();

  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [pointsData, setPointsData] = useState({ mean: [], std: [] });
  const [minValue, setMinValue] = useState(null);
  const [maxValue, setMaxValue] = useState(null);
  const [sdMax, setSdMax] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isVertical, setIsVertical] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 900 : false
  );

  const cacheRef = useRef({});
  const colorscale = useMemo(() => generateColorStops(colors), []);

  useEffect(() => {
    const handleResize = () => {
      setIsVertical(window.innerWidth < 900);
      if (containerRef.current) {
        const { offsetWidth, offsetHeight } = containerRef.current;
        setDimensions({ width: offsetWidth, height: offsetHeight });
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchData = useCallback(async (month, feature, signal) => {
    if (!feature || !netcdfUrl) return;

    const cacheKey = `${month}_${feature}_${netcdfUrl}`;
    if (cacheRef.current[cacheKey]) {
      const c = cacheRef.current[cacheKey];
      setPointsData(c.pointsData);
      setMinValue(c.minValue);
      setMaxValue(c.maxValue);
      setSdMax(c.sdMax ?? null);
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

      // lats is sorted ascending (-89.5 → 89.5) but the 2D array rows go north→south (index 0 = 90°)
      // So data row index = (lats.length - 1 - li)
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
            // Normalize to 0–1 (percent of max) for color mapping
            const sdPct = sdMax > 0 ? Math.min(sdVal / sdMax, 1) : 0;
            stdPoints.push({
              lat, lng: lon,
              color: getInterpolatedColorFromValue(sdPct, 0, 1, stdColorscale),
            });
          }
        }
      }

      const transformed = { mean: meanPoints, std: stdPoints };
      cacheRef.current[cacheKey] = { pointsData: transformed, minValue: minVal, maxValue: maxVal, sdMax };
      setPointsData(transformed);
      setMinValue(minVal);
      setMaxValue(maxVal);
      setSdMax(sdMax ?? null);
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

  // SD legend shows 0%–100%
  const stdLegend = useMemo(() => {
    const legend = getLegendFromColorscale(stdColorscale, 0, 100);
    return {
      ...legend,
      labels: legend.labels.map(l => `${l}%`),
    };
  }, []);

  const renderLegend = (legendData) => {
    if (!legendData) return null;
    return (
      <div style={{
        position: 'absolute', top: 60, right: 10,
        width: 70, height: 'calc(100% - 80px)',
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

  const renderGlobe = (ref, data, legend, title) => {
    const width = isVertical ? dimensions.width : Math.floor(dimensions.width / 2);
    const height = isVertical ? Math.floor(dimensions.height / 2) : dimensions.height;

    return (
      <div style={{ flex: 1, position: 'relative' }}>
        <div style={{
          position: 'absolute', top: 10, width: '100%',
          textAlign: 'center', color: 'white', fontSize: 16, zIndex: 5,
        }}>
          {title}
        </div>
        <Globe
          ref={ref}
          width={width}
          height={height}
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
          backgroundColor="rgba(0,0,0,0)"
          showAtmosphere={false}
          pointsData={data}
          pointAltitude={0}
          pointColor={d => d.color}
          pointRadius={1}
          pointsMerge={false}
          pointTransitionDuration={0}
        />
        {renderLegend(legend)}
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', position: 'relative', backgroundColor: 'transparent', overflow: 'hidden' }}
    >
      <div style={mapGlobeTitleStyle}>{fullTitle}</div>

      {isLoading && (
        <div style={{ color: 'white', textAlign: 'center', marginTop: 20 }}>Loading globe data...</div>
      )}
      {!isLoading && error && (
        <div style={{ color: '#ff6b6b', textAlign: 'center', marginTop: 20, padding: '0 16px' }}>{error}</div>
      )}
      {!isLoading && !error && (
        <div style={{ display: 'flex', flexDirection: isVertical ? 'column' : 'row', width: '100%', height: '100%' }}>
          {renderGlobe(meanGlobeRef, pointsData.mean, meanLegend, 'Mean')}
          {renderGlobe(stdGlobeRef, pointsData.std, stdLegend, 'Standard Deviation')}
        </div>
      )}
    </div>
  );
};

export default GlobeDisplay;