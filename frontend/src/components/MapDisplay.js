import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Plot from 'react-plotly.js';
import { colors, mapGlobeTitleStyle } from '../constants';
import { generateColorStops, generateColorbarTicks } from '../utils';

const containerStyle = {
  width: '100%',
  height: '100%',
  position: 'relative',
  backgroundColor: 'rgba(18, 18, 18, 0.6)',
};

const plotWrapperStyle = {
  position: 'absolute',
  top: 5,
  left: 0,
  width: '100%',
  height: '100%',
};

const MapDisplay = ({
  year,
  feature = 0,
  scenario,
  model,
  onPointClick,
  zoomedArea,
  onZoomedAreaChange,
  selectedPoint,
}) => {
  const [lats, setLats] = useState([]);
  const [lons, setLons] = useState([]);
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const colorscale = useMemo(() => generateColorStops(colors), []);

  const uiRevisionKey = useMemo(() => `${year}-${feature}-${scenario}-${model}`, [
    year,
    feature,
    scenario,
    model,
  ]);

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    const fetchData = async () => {
      setLoading(true);
      try {
        const url = `/api/globe-data?variable=mean_values&time=${year - 2012}&feature=${feature}`;
        const response = await fetch(url, { signal });
        if (!response.ok) throw new Error('Network response was not ok');

        const json = await response.json();
        setLats(json.lats || []);
        setLons(json.lons || []);
        setData(json.variable || []);
        setError(null);
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
  }, [year, feature, scenario, model]);

  const { tickvals, ticktext } = useMemo(() => {
    return generateColorbarTicks(0, 1, colors.length);
  }, []);

  const plotData = useMemo(() => {
    const heatmap = {
      type: 'heatmap',
      z: data,
      x: lons,
      y: lats,
      colorscale,
      zsmooth: false,
      zmin: 0,
      zmax: 1,
      hovertemplate: `Longitude: %{x}<br>Latitude: %{y}<br>Value: %{z}<extra></extra>`,
      colorbar: {
        tickcolor: 'white',
        tickfont: { color: 'white' },
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
  }, [data, lons, lats, colorscale, tickvals, ticktext, selectedPoint]);

  const layout = useMemo(() => {
    const baseLayout = {
      margin: { l: 10, r: 0, t: 60, b: 10 },
      paper_bgcolor: 'rgba(18, 18, 18, 0.6)',
      plot_bgcolor: 'rgba(18, 18, 18, 0.6)',
      autosize: true,
      uirevision: uiRevisionKey,
      dragmode: 'zoom',
      xaxis: { showgrid: false, zeroline: false, showticklabels: false },
      yaxis: { showgrid: false, zeroline: false, showticklabels: false },
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

  const parseRelayoutRanges = (eventData) => {
    const xr = eventData['xaxis.range'] || [eventData['xaxis.range[0]'], eventData['xaxis.range[1]']];
    const yr = eventData['yaxis.range'] || [eventData['yaxis.range[0]'], eventData['yaxis.range[1]']];
    if (xr?.[0] != null && xr?.[1] != null && yr?.[0] != null && yr?.[1] != null) {
      return { x: xr, y: yr };
    }
    return null;
  };

  const handleRelayout = (eventData) => {
    if (eventData['xaxis.autorange'] || eventData['yaxis.autorange']) {
      onZoomedAreaChange?.(null);
      return;
    }
    const ranges = parseRelayoutRanges(eventData);
    if (ranges) onZoomedAreaChange?.(ranges);
  };

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
      <div style={mapGlobeTitleStyle}>{feature}</div>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {!loading && !error && data.length === 0 && <div style={{ color: 'gray' }}>No data available</div>}
      <div style={plotWrapperStyle}>
        <Plot
          data={plotData}
          layout={layout}
          useResizeHandler
          style={{ width: '100%', height: '100%' }}
          onRelayout={handleRelayout}
          onClick={handlePointClick}
          config={{ displayModeBar: false, responsive: true, displaylogo: false, showTips: false }}
        />
      </div>
    </div>
  );
};

export default MapDisplay;
