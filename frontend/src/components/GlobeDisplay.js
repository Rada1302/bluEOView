import React, { useEffect, useMemo, useRef, useState } from 'react';
import Globe from 'react-globe.gl';
import {
  generateColorStops,
  getInterpolatedColorFromValue,
  getLegendFromColorscale,
  getLegendFromColorscaleLog,
} from '../utils';
import { colors, EARTH_TEXTURE, PanelTitle, SD_COLORSCALE, SD_THRESHOLD } from '../constants';

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

const varSubtitle = (varInfo, key) => {
  const info = varInfo?.[key];
  if (!info) return null;
  const parts = [info.standard_name, info.long_name].filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
};

const GlobeDisplay = ({
  mapData,
  fullTitle,
  baseTitle,
  showStd,
  showObs,
  varInfo = null,
  loading = false,
  titleLoading = false,
  error = null,
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

  const [isVertical, setIsVertical] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 900 : false
  );

  const colorscale = useMemo(() => generateColorStops(colors), []);

  const {
    lats = [],
    lons = [],
    mean,
    sdPct: sd,
    obs,
    obsMax = null,
    obsType = null,
    hasObs = false,
    minValue = null,
    maxValue = null,
  } = mapData ?? {};

  const pointsData = useMemo(() => {
    if (!mean?.length || !lats.length || !lons.length) {
      return { mean: [], std: [], obs: [] };
    }

    const meanPoints = [];
    const stdPoints = [];
    const obsPoints = [];
    const step = 3;

    for (let li = 0; li < lats.length; li += step) {
      const lat = lats[li];
      const dataRow = lats.length - 1 - li;

      for (let oi = 0; oi < lons.length; oi += step) {
        const lon = lons[oi] > 180 ? lons[oi] - 360 : lons[oi];
        const meanVal = mean?.[dataRow]?.[oi];
        const sdPctVal = sd?.[dataRow]?.[oi] ?? 0;
        const obsVal = obs?.[dataRow]?.[oi];

        if (meanVal === null || meanVal === undefined) continue;

        meanPoints.push({
          lat,
          lng: lon,
          val: meanVal,
          isUncertain: sdPctVal > SD_THRESHOLD,
        });

        if (sdPctVal !== null && sdPctVal !== undefined) {
          stdPoints.push({
            lat, lng: lon,
            sdPct: sdPctVal,
            color: interpolateSdColor(sdPctVal),
          });
        }

        if (hasObs && obsVal !== null && obsVal !== undefined) {
          const color = obsType === 'diversity'
            ? '#fde725'
            : getInterpolatedColorFromValue(Math.log10(obsVal + 1), 0, Math.log10((obsMax ?? 1) + 1), colorscale);
          obsPoints.push({ lat, lng: lon, color });
        }
      }
    }

    return { mean: meanPoints, std: stdPoints, obs: obsPoints };
  }, [lats, lons, mean, sd, obs, obsMax, obsType, hasObs, colorscale]);

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
    if (obsType === 'diversity' || obsMax == null) return null;
    return getLegendFromColorscaleLog(colorscale, obsMax);
  }, [obsType, obsMax, colorscale]);

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

  const titleStyle = {
    position: 'absolute', top: 10, left: 0, width: '100%',
    textAlign: 'center', fontSize: 19, color: 'white',
    pointerEvents: 'none', zIndex: 5,
  };

  const subTitleStyle = {
    position: 'absolute', top: 40, left: 0, width: '100%',
    textAlign: 'center', fontSize: 16, color: 'rgba(255,255,255,0.7)',
    pointerEvents: 'none', zIndex: 5,
  };

  const renderGlobe = (containerRef, globeRef, data, colorFn, legend, title, subtitle, dims, controls) => (
    <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%' }}>
        <div
          ref={containerRef}
          style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: '#0a0a0a', borderRadius: 6, overflow: 'hidden',
            cursor: loading ? 'wait' : 'default',
          }}
        >
          <PanelTitle title={title} loading={titleLoading} style={titleStyle} />
          <div style={subTitleStyle}>{subtitle}</div>
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
          <LoadingOverlay visible={loading} />
        </div>
      </div>
    </div>
  );

  const obsTitle = obsType === 'diversity'
    ? `${baseTitle} Observations`
    : `${baseTitle} Observation Density`;

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
          varSubtitle(varInfo, 'mean'),
          meanDims,
          null,
        )}

        {/* SD globe */}
        {showStd && renderGlobe(
          stdContainerRef, stdGlobeRef,
          pointsData.std,
          d => d.color,
          sdLegend,
          `${fullTitle} Standard Deviation`,
          varSubtitle(varInfo, 'sd'),
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
          varSubtitle(varInfo, 'obs'),
          obsDims,
          null,
        )}
      </div>

      {error && <div style={{ color: '#ff6b6b', textAlign: 'center', padding: '10px' }}>{error}</div>}
    </div>
  );
};

export default GlobeDisplay;
