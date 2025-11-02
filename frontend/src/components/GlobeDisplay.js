import React, { useEffect, useState, useRef, useMemo } from 'react';
import Globe from 'react-globe.gl';
import {
  generateColorStops,
  getInterpolatedColorFromValue,
  getLegendFromColorscale,
} from '../utils';
import { mapGlobeTitleStyle, colors, monthNames, featureNames } from '../constants';

const GlobeDisplay = ({ month, feature, onPointClick, selectedPoint }) => {
  const containerRef = useRef(null);
  const globeRef = useRef();

  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [pointsData, setPointsData] = useState([]);
  const [error, setError] = useState(null);
  const [minValue, setMinValue] = useState(null);
  const [maxValue, setMaxValue] = useState(null);
  const [cachedData, setCachedData] = useState({});
  const [isHovered, setIsHovered] = useState(false);

  const readableFeature = featureNames[feature] || feature;
  const fullTitle = `${readableFeature} in ${monthNames[month]}`;
  const normalizedSelectedPoint = selectedPoint
    ? { lat: selectedPoint.y, lng: selectedPoint.x }
    : null;

  const colorscale = useMemo(() => generateColorStops(colors), []);

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

  // Handle resizing
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { offsetWidth, offsetHeight } = containerRef.current;
        setDimensions({ width: offsetWidth, height: offsetHeight });
      }
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Fetch map data from backend
  const fetchData = async (month, feature) => {
    const cacheKey = `${month}_${feature}`;
    if (cachedData[cacheKey]) {
      const cached = cachedData[cacheKey];
      setPointsData(cached.pointsData);
      setMinValue(cached.minValue);
      setMaxValue(cached.maxValue);
      return;
    }

    try {
      const params = new URLSearchParams({
        feature,
        timeIndex: month.toString(),
      });

      const response = await fetch(`/api/diversity-map?${params.toString()}`);
      if (!response.ok) throw new Error(`Server error ${response.status}`);
      const data = await response.json();

      const { lats, lons, mean, minValue: minVal, maxValue: maxVal } = data;

      const transformed = [];
      const step = 2; // Downsample for performance

      // Reverse points vertically (north on top)
      for (let latIdx = 0; latIdx < lats.length; latIdx += step) {
        const lat = -lats[latIdx]; // Flip vertically
        for (let lonIdx = 0; lonIdx < lons.length; lonIdx += step) {
          const lon = lons[lonIdx] > 180 ? lons[lonIdx] - 360 : lons[lonIdx];
          const value = mean[latIdx]?.[lonIdx];
          if (value == null || isNaN(value)) continue;

          transformed.push({
            lat,
            lng: lon,
            size: value !== 0 ? 0.01 : 0,
            color: getInterpolatedColorFromValue(value, minVal, maxVal, colorscale),
          });
        }
      }

      setCachedData((prev) => ({
        ...prev,
        [cacheKey]: { pointsData: transformed, minValue: minVal, maxValue: maxVal },
      }));

      setPointsData(transformed);
      setMinValue(minVal);
      setMaxValue(maxVal);
      setError(null);
    } catch (err) {
      console.error('Error fetching map data:', err);
      setError('Failed to load data');
    }
  };

  useEffect(() => {
    fetchData(month, feature);
  }, [month, feature]);

  useEffect(() => {
    if (globeRef.current) {
      const controls = globeRef.current.controls();
      controls.minDistance = 250;
      controls.maxDistance = 400;
      controls.autoRotate = false;
    }
  }, []);

  const legendData = useMemo(() => {
    if (minValue == null || maxValue == null) return { colors: [], labels: [] };
    return getLegendFromColorscale(colorscale, minValue, maxValue);
  }, [minValue, maxValue, colorscale]);

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
          {/* Color bar */}
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

          {/* Labels */}
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
