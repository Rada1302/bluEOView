import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Plot from 'react-plotly.js';
import {
  colors,
  mapGlobeTitleStyle,
  featureNames,
  containerStyle,
  plotWrapperStyle,
} from '../constants';
import { generateColorStops, generateColorbarTicks } from '../utils';

const MapDisplay = ({
  month,
  feature,
  onPointClick,
  selectedPoint,
  selectedArea,
  onZoomedAreaChange,
  zoomedArea,
  fullTitle,
}) => {
  const [lats, setLats] = useState([]);
  const [lons, setLons] = useState([]);
  const [data, setData] = useState([]);
  const [minValue, setMinValue] = useState(null);
  const [maxValue, setMaxValue] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [colorscale, setColorscale] = useState(generateColorStops(colors));
  const [isZoomed, setIsZoomed] = useState(false);
  const [stdData, setStdData] = useState([]);

  const uiRevisionKey = useMemo(() => `${month}-${feature}`, [month, feature]);

  // Reset zoom when dataset changes
  useEffect(() => {
    setIsZoomed(false);
  }, [uiRevisionKey]);

  // Fetch diversity map data from backend
  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const url = `/api/diversity-map?feature=${feature}&timeIndex=${month}`;
        const response = await fetch(url, { signal });
        if (!response.ok) throw new Error('Network response was not ok');
        const json = await response.json();

        setLats(json.lats || []);
        setLons(json.lons || []);
        setData(json.mean || []);
        setStdData(json.sd || []);
        setMinValue(json.minValue ?? null);
        setMaxValue(json.maxValue ?? null);
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Error fetching map data:', err);
          setError('Failed to load data');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    return () => controller.abort();
  }, [month, feature]);

  // Colorbar ticks
  const { tickvals, ticktext } = useMemo(() => {
    if (minValue == null || maxValue == null || !colorscale.length)
      return { tickvals: [], ticktext: [] };
    return generateColorbarTicks(minValue, maxValue, colorscale.length / 2);
  }, [minValue, maxValue, colorscale]);

  // Plot data
  const plotData = useMemo(() => {
    const flippedMean = data.slice().reverse();
    const SD = stdData.slice();

    const meanHeatmap = {
      type: 'heatmap',
      z: flippedMean,
      x: lons,
      y: lats,
      colorscale,
      zsmooth: false,
      zmin: minValue,
      zmax: maxValue,
      colorbar: { title: 'Mean', tickcolor: 'white', tickfont: { color: 'white' } },
      hovertemplate: `Lon: %{x}<br>Lat: %{y}<br>Mean: %{z}<extra></extra>`,
      xaxis: 'x',
      yaxis: 'y',
    };

    const sdHeatmap = {
      type: 'heatmap',
      z: SD,
      x: lons,
      y: lats,
      colorscale,
      zsmooth: false,
      colorbar: { title: 'Std Dev', tickcolor: 'white', tickfont: { color: 'white' } },
      hovertemplate: `Lon: %{x}<br>Lat: %{y}<br>Std Dev: %{z}<extra></extra>`,
      xaxis: 'x2',
      yaxis: 'y2',
    };

    if (selectedPoint) {
      return [
        meanHeatmap,
        sdHeatmap,
        {
          type: 'scatter',
          mode: 'text',
          x: [selectedPoint.x],
          y: [selectedPoint.y],
          text: ['📍'],
          textposition: 'middle center',
          textfont: { size: 18 },
          hoverinfo: 'skip',
        },
      ];
    }
    return [meanHeatmap, sdHeatmap];
  }, [
    data,
    stdData,
    lons,
    lats,
    colorscale,
    minValue,
    maxValue,
    tickvals,
    ticktext,
    selectedPoint,
    feature,
  ]);

  // Layout
  const layout = useMemo(() => {
    const baseLayout = {
      grid: { rows: 2, columns: 1, pattern: 'independent' },
      margin: { l: 50, r: 50, t: 60, b: 50 },
      paper_bgcolor: 'rgba(18, 18, 18, 0.6)',
      plot_bgcolor: 'rgba(18, 18, 18, 0.6)',
      xaxis: { showgrid: false, zeroline: false, showticklabels: false },
      yaxis: { showgrid: false, zeroline: false, showticklabels: false, autorange: 'reversed' },
      xaxis2: { showgrid: false, zeroline: false, showticklabels: false },
      yaxis2: { showgrid: false, zeroline: false, showticklabels: false, autorange: 'reversed' },
    };

    if (zoomedArea?.x && zoomedArea?.y) {
      baseLayout.xaxis.range = zoomedArea.x;
      baseLayout.yaxis.range = zoomedArea.y;
      baseLayout.xaxis.autorange = false;
      baseLayout.yaxis.autorange = false;
    } else {
      baseLayout.xaxis.autorange = true;
      baseLayout.yaxis.autorange = true;
    }

    return baseLayout;
  }, [uiRevisionKey, zoomedArea]);

  // Handle zooming
  const parseRelayoutRanges = (eventData) => {
    const xr = eventData['xaxis.range'] || [
      eventData['xaxis.range[0]'],
      eventData['xaxis.range[1]'],
    ];
    const yr = eventData['yaxis.range'] || [
      eventData['yaxis.range[0]'],
      eventData['yaxis.range[1]'],
    ];
    if (xr?.[0] != null && xr?.[1] != null && yr?.[0] != null && yr?.[1] != null) {
      return { x: xr, y: yr };
    }
    return null;
  };

  const handleRelayout = (eventData) => {
    if (eventData['xaxis.autorange'] || eventData['yaxis.autorange']) {
      setIsZoomed(false);
      onZoomedAreaChange?.(null);
      return;
    }

    const ranges = parseRelayoutRanges(eventData);
    if (ranges) {
      setIsZoomed(true);
      onZoomedAreaChange?.(prev => {
        if (JSON.stringify(prev) !== JSON.stringify(ranges)) {
          return ranges;
        }
        return prev;
      });
    }
  };

  // Handle point click
  const handlePointClick = useCallback(
    (evt) => {
      if (!evt.points?.length) return;
      const { x, y } = evt.points[0];
      onPointClick?.(x, y);
    },
    [onPointClick]
  );

  return (
    <div style={containerStyle}>
      <div style={mapGlobeTitleStyle}>{fullTitle}</div>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {!loading && !error && data.length === 0 && (
        <div style={{ color: 'gray' }}>No data available for this selection</div>
      )}
      <div style={plotWrapperStyle}>
        <Plot
          data={plotData}
          layout={layout}
          useResizeHandler
          style={{ width: '100%', height: '100%' }}
          onRelayout={handleRelayout}
          onClick={handlePointClick}
          config={{
            displayModeBar: false,
            responsive: true,
            displaylogo: false,
            showTips: false,
          }}
        />
      </div>
    </div>
  );
};

export default MapDisplay;