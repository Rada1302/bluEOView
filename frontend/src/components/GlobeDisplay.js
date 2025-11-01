import React, { useEffect, useState, useRef, useMemo } from 'react';
import Globe from 'react-globe.gl';
import {
  generateColorStops,
  getInterpolatedColorFromValue,
  getLegendFromColorscale,
} from '../utils';
import { mapGlobeTitleStyle, colors, monthNames, featureNames } from '../constants';

const GlobeDisplay = ({
  month,
  feature,
  onPointClick,
  selectedPoint,
}) => {
  const containerRef = useRef(null);
  const globeRef = useRef();

  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [pointsData, setPointsData] = useState([]);
  const [error, setError] = useState(null);
  const [minValue, setMinValue] = useState(0);
  const [maxValue, setMaxValue] = useState(1);
  const [cachedData, setCachedData] = useState({});
  const [isHovered, setIsHovered] = useState(false);

  const fullTitle = `${featureNames[feature]} in ${monthNames[month]}`;
  const normalizedSelectedPoint = selectedPoint
    ? { lat: selectedPoint.y, lng: selectedPoint.x }
    : null;

  const createHtmlElement = () => {
    const el = document.createElement('div');
    el.style.color = 'red';
    el.style.fontSize = '24px';
    el.style.pointerEvents = 'none';
    el.style.userSelect = 'none';
    el.style.transform = 'translate(-50%, -100%)';
    el.style.whiteSpace = 'nowrap';
    el.setAttribute('aria-label', 'Selected Point Pin');
    el.setAttribute('title', 'Selected Point');
    el.textContent = '📍';
    return el;
  };

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const fetchData = async (month, feature) => {
    const cacheKey = `${month}_${feature}`;

    if (cachedData[cacheKey]) {
      setPointsData(cachedData[cacheKey].pointsData);
      setMinValue(cachedData[cacheKey].minValue);
      setMaxValue(cachedData[cacheKey].maxValue);
      return;
    }

    const controller = new AbortController();
    const signal = controller.signal;

    try {
      const url = `/api/globe-data?variable=mean_values&time=${month}&feature=${feature}`;
      const response = await fetch(url, { signal });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Network response was not ok: ${response.status} ${text}`);
      }

      const data = await response.json();
      const minVal = data.minValue ?? null;
      const maxVal = data.maxValue ?? null;

      const lats = data.lats.slice();
      const vars = data.variable.slice();

      const step = 1; // downsample
      const transformed = [];

      for (let latIdx = 0; latIdx < lats.length; latIdx += step) {
        const lat = lats[latIdx];
        for (let lonIdx = 0; lonIdx < data.lons.length; lonIdx += step) {
          const rawLon = data.lons[lonIdx];
          const lon = rawLon > 180 ? rawLon - 360 : rawLon;

          const value = vars[latIdx]?.[lonIdx];
          if (value == null || isNaN(value)) continue;

          // Flip latitude for globe (north on top)
          transformed.push({
            lat: -lat, // Flip vertically
            lng: lon,
            size: value !== 0 ? 0.01 : 0,
            color: getInterpolatedColorFromValue(
              value,
              minVal,
              maxVal,
              generateColorStops(colors),
            ),
          });
        }
      }

      setCachedData(prev => ({
        ...prev,
        [cacheKey]: { pointsData: transformed, minValue: minVal, maxValue: maxVal },
      }));
      setPointsData(transformed);
      setMinValue(minVal);
      setMaxValue(maxVal);
      setError(null);
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('Error fetching globe data:', err);
      setError('Failed to load data');
    }
  };

  useEffect(() => {
    fetchData(month, feature);
  }, [month, feature]);

  useEffect(() => {
    if (globeRef.current) {
      globeRef.current.controls().minDistance = 250;
      globeRef.current.controls().maxDistance = 400;
      globeRef.current.controls().autoRotate = false;
    }
  }, []);

  const legendData = useMemo(() => {
    const colorscale = generateColorStops(colors);
    if (minValue == null || maxValue == null || colors.length === 0) {
      return { colors: [], labels: [] };
    }
    return getLegendFromColorscale(colorscale, minValue, maxValue);
  }, [minValue, maxValue]);

  const handlePointClick = (lng, lat) => {
    if (onPointClick) onPointClick(lng, lat);
  };

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        backgroundColor: 'rgba(18, 18, 18, 0.6)',
        overflow: 'hidden',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'rgba(18, 18, 18, 0.6)',
        }}
      >
        <div style={mapGlobeTitleStyle}>{fullTitle}</div>

        {error && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              color: 'red',
              zIndex: 11,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          <Globe
            ref={globeRef}
            width={dimensions.width}
            height={dimensions.height}
            globeImageUrl="//unpkg.com/three-globe/example/img/earth-water.png"
            showAtmosphere={false}
            backgroundColor="rgba(18, 18, 18, 0.6)"
            pointsData={pointsData}
            pointAltitude="size"
            pointColor="color"
            pointRadius={0.9}
            onPointClick={(pt) => handlePointClick(pt.lng, pt.lat)}
            htmlElementsData={normalizedSelectedPoint ? [normalizedSelectedPoint] : []}
            htmlElement={createHtmlElement}
          />
        </div>

        {/* Legend */}
        <div
          style={{
            position: 'absolute',
            top: 60,
            right: 10,
            width: 70,
            height: 'calc(100% - 80px)',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          <div
            style={{
              flex: 2,
              display: 'flex',
              flexDirection: 'column-reverse',
              height: '96%',
              borderRadius: 4,
              background: 'none',
            }}
          >
            {legendData.colors.map((color, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  backgroundColor: color,
                  width: '100%',
                }}
              />
            ))}
          </div>

          <div
            style={{
              flex: 3,
              display: 'flex',
              flexDirection: 'column-reverse',
              justifyContent: 'space-between',
              height: '100%',
              marginLeft: 4,
            }}
          >
            {legendData.labels.map((lbl, i) => (
              <div
                key={i}
                style={{
                  color: 'white',
                  fontSize: 13,
                  textAlign: 'left',
                }}
              >
                {`- ${lbl}`}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobeDisplay;