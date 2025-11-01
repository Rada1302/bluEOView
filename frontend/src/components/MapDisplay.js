import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Plot from 'react-plotly.js';
import { colors, mapGlobeTitleStyle, featureNames, monthNames, containerStyle, plotWrapperStyle } from '../constants';
import { generateColorStops, generateColorbarTicks } from '../utils';

const MapDisplay = ({
  month,
  feature,
  onPointClick,
  selectedPoint,
  selectedArea,
  onZoomedAreaChange,
  zoomedArea,
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

  const uiRevisionKey = useMemo(
    () => `${month}-${feature}`,
    [month, feature]
  );

  // Reset zoom when dataset changes
  useEffect(() => {
    setIsZoomed(false);
  }, [uiRevisionKey]);

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    const fetchData = async () => {
      setLoading(true);
      try {
        const url = `/api/globe-data?variable=mean_values&time=${month}&feature=${feature}`;
        const response = await fetch(url, { signal });
        if (!response.ok) throw new Error('Network response was not ok');
        const json = await response.json();
        setLats(json.lats || []);
        setLons(json.lons || []);
        setData(json.variable || []);
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
    const flippedData = data.slice().reverse();

    const heatmap = {
      type: 'heatmap',
      z: flippedData,
      x: lons,
      y: lats,
      colorscale,
      zsmooth: false,
      zmin: minValue,
      zmax: maxValue,
      hovertemplate: `Longitude: %{x}<br>Latitude: %{y}<br>${featureNames[feature]}: %{z}<extra></extra>`,
      colorbar: {
        tickcolor: 'white',
        tickfont: { color: 'white' },
        tickmode: 'array',
        tickvals,
        ticktext,
      },
    };

    if (selectedPoint) {
      return [
        heatmap,
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
    return [heatmap];
  }, [
    data,
    lons,
    lats,
    colorscale,
    minValue,
    maxValue,
    tickvals,
    ticktext,
    selectedPoint,
    selectedArea,
    feature,
    isZoomed,
  ]);

  // Layout
  const layout = useMemo(() => {
    const baseLayout = {
      margin: { l: 10, r: 0, t: 60, b: 10 },
      paper_bgcolor: 'rgba(18, 18, 18, 0.6)',
      plot_bgcolor: 'rgba(18, 18, 18, 0.6)',
      autosize: true,
      uirevision: uiRevisionKey,
      dragmode: 'zoom',
      xaxis: {
        showgrid: false,
        zeroline: false,
        showticklabels: false,
      },
      yaxis: {
        showgrid: false,
        zeroline: false,
        showticklabels: false,
        autorange: 'reversed',
      },
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

  // Parse relayout ranges
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

  // Handle zoom/relayout
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

  const fullTitle = useMemo(() => {
    return `${featureNames[feature]} in ${monthNames[month]}`;
  }, [feature, month]);

  return (
    <div style={containerStyle}>
      <div style={mapGlobeTitleStyle}>{fullTitle}</div>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {!loading && !error && data.length === 0 && (
        <div style={{ color: 'gray' }}>
          No data available for this selection
        </div>
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