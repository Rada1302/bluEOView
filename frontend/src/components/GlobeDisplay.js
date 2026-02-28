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
  STD_THRESHOLD,
  mapGlobeTitleStyle
} from '../constants';

const GlobeDisplay = ({
  month,
  feature,
  onPointClick,
  selectedPoint,
  fullTitle
}) => {

  const containerRef = useRef(null);

  const meanGlobeRef = useRef();
  const stdGlobeRef = useRef();

  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const [pointsData, setPointsData] = useState({
    mean: [],
    std: [],
    uncertainty: []
  });

  const [minValue, setMinValue] = useState(null);
  const [maxValue, setMaxValue] = useState(null);

  const [error, setError] = useState(null);
  const [cachedData, setCachedData] = useState({});

  const [cameraState, setCameraState] = useState(null);

  const [isVertical, setIsVertical] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 900 : false
  );

  const colorscale = useMemo(() => generateColorStops(colors), []);

  const normalizedSelectedPoint = selectedPoint
    ? { lat: selectedPoint.y, lng: selectedPoint.x }
    : null;

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

  // Camera synchronization
  const syncCamera = useCallback((sourceRef) => {
    if (!sourceRef.current) return;

    const pov = sourceRef.current.pointOfView();

    setCameraState(pov);
  }, []);

  useEffect(() => {
    if (!cameraState) return;

    if (meanGlobeRef.current) {
      meanGlobeRef.current.pointOfView(cameraState, 0);
    }

    if (stdGlobeRef.current) {
      stdGlobeRef.current.pointOfView(cameraState, 0);
    }
  }, [cameraState]);

  // Stop autorotate on interaction
  const stopAutoRotate = (ref) => {
    if (!ref.current) return;

    const controls = ref.current.controls();
    controls.autoRotate = false;
  };

  // Configure controls
  const setupControls = (ref) => {
    if (!ref.current) return;

    const controls = ref.current.controls();

    controls.minDistance = 250;
    controls.maxDistance = 400;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.6;
  };

  // Fetch + transform data
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
        timeIndex: month.toString()
      });

      const res = await fetch(`/api/diversity-map?${params.toString()}`);

      if (!res.ok) throw new Error(`Server error ${res.status}`);

      const data = await res.json();

      const {
        lats,
        lons,
        mean,
        sd,
        minValue: minVal,
        maxValue: maxVal
      } = data;

      const step = 2; // performance downsample

      const meanPoints = [];
      const stdPoints = [];
      const uncertaintyPoints = [];

      for (let latIdx = 0; latIdx < lats.length; latIdx += step) {

        const lat = -lats[latIdx];

        for (let lonIdx = 0; lonIdx < lons.length; lonIdx += step) {

          const lonRaw = lons[lonIdx];
          const lon = lonRaw > 180 ? lonRaw - 360 : lonRaw;

          const meanVal = mean?.[latIdx]?.[lonIdx];
          const sdVal = sd?.[latIdx]?.[lonIdx];

          if (meanVal == null || isNaN(meanVal)) continue;

          // Mean globe
          meanPoints.push({
            lat,
            lng: lon,
            size: 0.01,
            color: getInterpolatedColorFromValue(
              meanVal,
              minVal,
              maxVal,
              colorscale
            )
          });

          // Std globe
          if (sdVal != null && !isNaN(sdVal)) {

            stdPoints.push({
              lat,
              lng: lon,
              size: 0.01,
              color: getInterpolatedColorFromValue(
                sdVal,
                0,
                0.6,
                stdColorscale
              )
            });

            // Uncertainty mask
            if (sdVal > STD_THRESHOLD) {
              uncertaintyPoints.push({
                lat,
                lng: lon,
                size: 0.012,
                color: 'red'
              });
            }
          }
        }
      }

      const transformed = {
        mean: meanPoints,
        std: stdPoints,
        uncertainty: uncertaintyPoints
      };

      setCachedData(prev => ({
        ...prev,
        [cacheKey]: {
          pointsData: transformed,
          minValue: minVal,
          maxValue: maxVal
        }
      }));

      setPointsData(transformed);
      setMinValue(minVal);
      setMaxValue(maxVal);
      setError(null);

    } catch (err) {
      console.error(err);
      setError('Failed to load data');
    }
  };

  useEffect(() => {
    fetchData(month, feature);
  }, [month, feature]);

  // Legends
  const meanLegend = useMemo(() => {
    if (minValue == null || maxValue == null) return null;
    return getLegendFromColorscale(colorscale, minValue, maxValue);
  }, [minValue, maxValue, colorscale]);

  const stdLegend = useMemo(() => {
    return getLegendFromColorscale(stdColorscale, 0, 0.6);
  }, []);

  const renderLegend = (legendData) => {

    if (!legendData) return null;

    return (
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
          zIndex: 10
        }}
      >
        <div
          style={{
            flex: 2,
            display: 'flex',
            flexDirection: 'column-reverse',
            height: '96%'
          }}
        >
          {legendData.colors.map((c, i) => (
            <div key={i} style={{ flex: 1, backgroundColor: c }} />
          ))}
        </div>

        <div
          style={{
            flex: 3,
            display: 'flex',
            flexDirection: 'column-reverse',
            justifyContent: 'space-between',
            marginLeft: 4,
            height: '97%'
          }}
        >
          {legendData.labels.map((lbl, i) => (
            <div key={i} style={{ color: 'white', fontSize: 12 }}>
              {`${lbl}`}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Globe renderer
  const renderGlobe = (ref, data, legend, title, showUncertainty = false) => {

    const width = isVertical
      ? dimensions.width
      : dimensions.width / 2;

    const height = isVertical
      ? dimensions.height / 2
      : dimensions.height;

    return (
      <div style={{ flex: 1, position: 'relative' }}>

        <div
          style={{
            position: 'absolute',
            top: 10,
            width: '100%',
            textAlign: 'center',
            color: 'white',
            fontSize: 16,
            zIndex: 5
          }}
        >
          {title}
        </div>

        <Globe
          ref={ref}
          width={width}
          height={height}
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-water.png"
          backgroundColor="rgba(0,0,0,0)"
          showAtmosphere={false}

          pointsData={data}
          pointAltitude="size"
          pointColor="color"
          pointRadius={1.4}
          pointsMerge={true}
          pointTransitionDuration={0}

          onGlobeReady={() => setupControls(ref)}

          onZoom={() => {
            stopAutoRotate(ref);
            syncCamera(ref);
          }}

          onRotate={() => {
            stopAutoRotate(ref);
            syncCamera(ref);
          }}
        />

        {showUncertainty && (
          <Globe
            width={width}
            height={height}
            globeImageUrl="//unpkg.com/three-globe/example/img/earth-water.png"
            backgroundColor="rgba(0,0,0,0)"
            showAtmosphere={false}
            pointsData={pointsData.uncertainty}
            pointAltitude="size"
            pointColor="color"
            pointRadius={1.6}
            pointsMerge={true}
            pointTransitionDuration={0}
          />
        )}

        {renderLegend(legend)}
      </div>
    );
  };

  // Render
  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        backgroundColor: 'transparent',
        overflow: 'hidden'
      }}
    >

      <div style={mapGlobeTitleStyle}>{fullTitle}</div>

      {error && (
        <div style={{ color: 'red', position: 'absolute', top: 0 }}>
          {error}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          flexDirection: isVertical ? 'column' : 'row',
          width: '100%',
          height: '100%'
        }}
      >

        {renderGlobe(
          meanGlobeRef,
          pointsData.mean,
          meanLegend,
          'Mean',
          true
        )}

        {renderGlobe(
          stdGlobeRef,
          pointsData.std,
          stdLegend,
          'Standard Deviation',
          false
        )}

      </div>
    </div>
  );
};

export default GlobeDisplay;
