import React, { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import Globe from 'react-globe.gl';
import {
  generateColorStops,
  getInterpolatedColorFromValue,
  getLegendFromColorscale,
} from '../utils';
import { colors, EARTH_TEXTURE, SD_COLORSCALE, SD_THRESHOLD } from '../constants';

// colour interpolators
const parseHex = hex => {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};

const makeInterpolator = (scale) => (pct) => {
  const t = Math.max(0, Math.min(100, pct)) / 100;
  let lo = scale[0];
  let hi = scale[scale.length - 1];
  for (let i = 0; i < scale.length - 1; i++) {
    if (t >= scale[i][0] && t <= scale[i + 1][0]) {
      lo = scale[i];
      hi = scale[i + 1];
      break;
    }
  }
  const range = hi[0] - lo[0];
  const f = range === 0 ? 0 : (t - lo[0]) / range;
  const [r0, g0, b0] = parseHex(lo[1]);
  const [r1, g1, b1] = parseHex(hi[1]);
  return `rgb(${Math.round(r0 + (r1 - r0) * f)},${Math.round(g0 + (g1 - g0) * f)},${Math.round(b0 + (b1 - b0) * f)})`;
};

const interpolateSdColor = makeInterpolator(SD_COLORSCALE);

const OBS_COLORSCALE_GLOBE = [
  [0.00, '#ffffcc'],
  [0.10, '#ffeda0'],
  [0.25, '#feb24c'],
  [0.50, '#f03b20'],
  [0.75, '#bd0026'],
  [1.00, '#67000d'],
];
const interpolateObsColor = makeInterpolator(OBS_COLORSCALE_GLOBE);

// sub-components
const PanelToggleBar = ({ panels }) => (
  <div style={{
    position: 'absolute', top: 10, right: 10, zIndex: 10,
    display: 'flex', gap: 6,
  }}>
    {panels.map(({ id, label, active, onToggle }) => (
      <button
        key={id}
        onClick={onToggle}
        style={{
          padding: '4px 10px',
          fontSize: 11, fontWeight: 600, letterSpacing: '0.04em',
          borderRadius: 4,
          border: '1px solid rgba(255,255,255,0.25)',
          backgroundColor: active ? 'rgba(60,80,120,0.85)' : 'rgba(30,30,30,0.75)',
          color: 'white', cursor: 'pointer',
          backdropFilter: 'blur(4px)',
          transition: 'all 0.2s ease',
        }}
      >
        {active ? `✕ Hide ${label}` : `+ Show ${label}`}
      </button>
    ))}
  </div>
);

// main component
const GlobeDisplay = ({
  month,
  feature,
  netcdfUrl,
  fullTitle,
  showStd,
  onToggleStd,
  showObs,
  onToggleObs,
}) => {
  const meanContainerRef = useRef(null);
  const stdContainerRef = useRef(null);
  const obsContainerRef = useRef(null);
  const meanGlobeRef = useRef();
  const stdGlobeRef = useRef();
  const obsGlobeRef = useRef();

  const [meanDims, setMeanDims] = useState({ width: 0, height: 0 });
  const [stdDims, setStdDims] = useState({ width: 0, height: 0 });
  const [obsDims, setObsDims] = useState({ width: 0, height: 0 });

  const [pointsData, setPointsData] = useState({ mean: [], std: [], obs: [] });
  const [minValue, setMinValue] = useState(null);
  const [maxValue, setMaxValue] = useState(null);
  const [hasObs, setHasObs] = useState(false);
  const [obsType, setObsType] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isVertical, setIsVertical] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 900 : false
  );

  const cacheRef = useRef({});
  const colorscale = useMemo(() => generateColorStops(colors), []);

  // measure containers
  useEffect(() => {
    const measure = () => {
      setIsVertical(window.innerWidth < 900);
      if (meanContainerRef.current)
        setMeanDims({ width: meanContainerRef.current.offsetWidth, height: meanContainerRef.current.offsetHeight });
      if (stdContainerRef.current)
        setStdDims({ width: stdContainerRef.current.offsetWidth, height: stdContainerRef.current.offsetHeight });
      if (obsContainerRef.current)
        setObsDims({ width: obsContainerRef.current.offsetWidth, height: obsContainerRef.current.offsetHeight });
    };

    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [showStd, showObs]);

  // fetch
  const fetchData = useCallback(async (month, feature, signal) => {
    if (!feature || !netcdfUrl) return;
    const cacheKey = `${month}_${feature}_${netcdfUrl}`;
    if (cacheRef.current[cacheKey]) {
      const c = cacheRef.current[cacheKey];
      setPointsData(c.pointsData);
      setMinValue(c.minValue);
      setMaxValue(c.maxValue);
      setHasObs(c.hasObs);
      setObsType(c.obsType);
      setError(null);
      return;
    }

    setIsLoading(true);
    try {
      const params = new URLSearchParams({ feature, timeIndex: month.toString(), file: netcdfUrl });
      const res = await fetch(`/api/diversity-map?${params}`, { signal });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? `Server error ${res.status}`);

      const { lats, lons, mean, sd, obs, obsMax, obsType: oType, hasObs: hObs } = json;
      const sdGlobalMax = json.sdGlobalMax ?? json.sdMax ?? null;

      const step = 3;
      const meanPoints = [];
      const stdPoints = [];
      const obsPoints = [];

      for (let li = 0; li < lats.length; li += step) {
        const lat = lats[li];
        const dataRow = lats.length - 1 - li;

        for (let oi = 0; oi < lons.length; oi += step) {
          const lon = lons[oi] > 180 ? lons[oi] - 360 : lons[oi];
          const meanVal = mean?.[dataRow]?.[oi];
          const sdVal = sd?.[dataRow]?.[oi];
          const obsVal = obs?.[dataRow]?.[oi];

          if (meanVal === null || meanVal === undefined) continue;

          const sdPct = (sdGlobalMax > 0 && sdVal != null) ? (sdVal / sdGlobalMax) * 100 : 0;

          meanPoints.push({
            lat, lng: lon,
            val: meanVal,
            isUncertain: sdPct > SD_THRESHOLD,
          });

          if (sdVal !== null && sdVal !== undefined) {
            stdPoints.push({ lat, lng: lon, sdPct, color: interpolateSdColor(sdPct) });
          }

          if (hObs && obsVal !== null && obsVal !== undefined) {
            // "diversity" → binary presence/absence (values are 0 or 1)
            // "taxa"      → continuous density, normalise against obsMax
            const obsPct = oType === 'diversity'
              ? (obsVal > 0 ? 100 : 0)
              : (obsMax > 0 ? (obsVal / obsMax) * 100 : 0);
            obsPoints.push({ lat, lng: lon, obsPct, color: interpolateObsColor(obsPct) });
          }
        }
      }

      const transformed = { mean: meanPoints, std: stdPoints, obs: obsPoints };
      cacheRef.current[cacheKey] = {
        pointsData: transformed,
        minValue: json.minValue,
        maxValue: json.maxValue,
        hasObs: hObs ?? false,
        obsType: oType ?? null,
      };

      setPointsData(transformed);
      setMinValue(json.minValue);
      setMaxValue(json.maxValue);
      setHasObs(hObs ?? false);
      setObsType(oType ?? null);
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

  // legends
  const meanLegend = useMemo(
    () => minValue == null || maxValue == null
      ? null
      : getLegendFromColorscale(colorscale, minValue, maxValue),
    [minValue, maxValue, colorscale]
  );

  const sdLegend = useMemo(() => {
    const ticks = [0, 10, 25, 40, 50, 60, 75, 90, 100];
    return { colors: ticks.map(p => interpolateSdColor(p)), labels: ticks.map(p => `${p}%`) };
  }, []);

  const obsLegend = useMemo(() => {
    if (obsType === 'diversity') {
      return { colors: ['#ffffcc', '#67000d'], labels: ['Absent', 'Present'] };
    }
    const ticks = [0, 25, 50, 75, 100];
    return { colors: ticks.map(p => interpolateObsColor(p)), labels: ticks.map(p => `${p}%`) };
  }, [obsType]);

  // legend renderer
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

  const subLabel = {
    position: 'absolute', top: 10, left: 0, width: '100%',
    textAlign: 'center', fontSize: 17, color: 'white',
    pointerEvents: 'none', zIndex: 5,
  };

  const renderGlobe = (containerRef, globeRef, data, colorFn, legend, title, dims, controls) => (
    <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%' }}>
        <div
          ref={containerRef}
          style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: '#0a0a0a', borderRadius: 6, overflow: 'hidden',
            cursor: isLoading ? 'wait' : 'default',
          }}
        >
          <div style={subLabel}>{title}</div>
          <Globe
            ref={globeRef}
            width={dims.width}
            height={dims.height}
            globeImageUrl={EARTH_TEXTURE}
            backgroundColor="rgba(0,0,0,0)"
            pointsData={data}
            pointColor={colorFn}
            pointRadius={1.2}
            pointAltitude={0.005}
            pointsMerge={true}
            pointTransitionDuration={0}
          />
          {renderLegend(legend)}
          {controls}
        </div>
      </div>
    </div>
  );

  const obsTitle = obsType === 'diversity'
    ? `${fullTitle} Observations`
    : `${fullTitle} Observation Density`;

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{
        display: 'flex',
        flexDirection: isVertical ? 'column' : 'row',
        gap: 8,
        alignItems: 'stretch',
      }}>

        {/* Mean globe */}
        {renderGlobe(
          meanContainerRef, meanGlobeRef,
          pointsData.mean,
          d => d.isUncertain
            ? 'rgba(0,0,0,0.6)'
            : getInterpolatedColorFromValue(d.val, minValue, maxValue, colorscale),
          meanLegend,
          fullTitle,
          meanDims,
          <PanelToggleBar panels={[
            { id: 'sd', label: 'SD', active: showStd, onToggle: onToggleStd },
            ...(hasObs ? [{ id: 'obs', label: 'Obs', active: showObs, onToggle: onToggleObs }] : []),
          ]} />,
        )}

        {/* SD globe */}
        {showStd && renderGlobe(
          stdContainerRef, stdGlobeRef,
          pointsData.std,
          d => d.color,
          sdLegend,
          `${fullTitle} Standard Deviation`,
          stdDims,
          null,
        )}

        {/* Obs globe */}
        {showObs && hasObs && renderGlobe(
          obsContainerRef, obsGlobeRef,
          pointsData.obs,
          d => d.color,
          obsLegend,
          obsTitle,
          obsDims,
          null,
        )}
      </div>

      {error && <div style={{ color: '#ff6b6b', textAlign: 'center', padding: '10px' }}>{error}</div>}
    </div>
  );
};

export default GlobeDisplay;