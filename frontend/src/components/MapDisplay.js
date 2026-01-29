import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Plot from 'react-plotly.js';
import {
  colors,
  mapGlobeTitleStyle,
  containerStyle,
  plotWrapperStyle,
  STD_THRESHOLD,
  stdColorscale
} from '../constants';
import {
  generateColorStops,
  generateColorbarTicks,
} from '../utils';

const MapDisplay = ({
  month,
  feature,
  onZoomedAreaChange,
  zoomedArea,
  fullTitle,
}) => {
  const [lats, setLats] = useState([]);
  const [lons, setLons] = useState([]);
  const [meanData, setMeanData] = useState([]);
  const [stdData, setStdData] = useState([]);
  const [minValue, setMinValue] = useState(null);
  const [maxValue, setMaxValue] = useState(null);
  const [error, setError] = useState(null);

  // Track screen size for vertical stacking
  const [isVertical, setIsVertical] = useState(typeof window !== 'undefined' ? window.innerWidth < 900 : false);

  useEffect(() => {
    const handleResize = () => setIsVertical(window.innerWidth < 900);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const colorscale = useMemo(() => generateColorStops(colors), []);

  useEffect(() => {
    const controller = new AbortController();
    const fetchData = async () => {
      try {
        const res = await fetch(
          `/api/diversity-map?feature=${feature}&timeIndex=${month}`,
          { signal: controller.signal }
        );
        if (!res.ok) throw new Error('Fetch failed');
        const json = await res.json();
        setLats(json.lats ?? []);
        setLons(json.lons ?? []);
        setMeanData(json.mean ?? []);
        setStdData(json.sd ?? []);
        setMinValue(json.minValue ?? null);
        setMaxValue(json.maxValue ?? null);
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error(err);
          setError('Failed to load data');
        }
      }
    };
    fetchData();
    return () => controller.abort();
  }, [month, feature]);

  const { tickvals, ticktext } = useMemo(() => {
    if (minValue == null || maxValue == null) return { tickvals: [], ticktext: [] };
    const numBins = colorscale.length / 2;
    return generateColorbarTicks(minValue, maxValue, numBins);
  }, [minValue, maxValue, colorscale]);

  const uncertaintyMask = useMemo(() => {
    return stdData.map(row => row.map(v => (v > STD_THRESHOLD ? 1 : 0)));
  }, [stdData]);

  const hoverWarnings = useMemo(() => {
    return stdData.map(row =>
      row.map(v => v > STD_THRESHOLD ? '<br> High uncertainty (SD > 0.5)' : '')
    );
  }, [stdData]);

  const hasHighSD = useMemo(() => {
    return stdData.some(row => row.some(v => v > STD_THRESHOLD));
  }, [stdData]);

  const plotData = useMemo(() => {
    const meanHeatmap = {
      type: 'heatmap',
      z: meanData,
      x: lons,
      y: lats,
      customdata: stdData.map((row, i) =>
        row.map((v, j) => [v === null ? "Unknown" : v.toFixed(3), hoverWarnings[i][j]])
      ),
      colorscale,
      zmin: minValue,
      zmax: maxValue,
      colorbar: {
        tickvals,
        ticktext,
        ticks: 'outside',
        // Position colorbar in the middle gap on desktop, on the right on mobile
        x: isVertical ? 1.02 : 0.46,
        y: isVertical ? 0.78 : 0.5,
        len: isVertical ? 0.5 : 0.7,
        tickfont: { color: 'white' },
      },
      hovertemplate: ` Lon: %{x}<br> Lat: %{y}<br> Mean: %{customdata[0]}<b style="color:red">%{customdata[1]}</b><extra></extra>`,
      xaxis: 'x',
      yaxis: 'y',
    };

    const traces = [meanHeatmap];

    if (hasHighSD) {
      traces.push({
        type: 'heatmap',
        z: uncertaintyMask,
        x: lons,
        y: lats,
        colorscale: [[0, 'rgba(0,0,0,0)'], [1, 'red']],
        zsmooth: false,
        showscale: false,
        hoverinfo: 'skip',
        xaxis: 'x',
        yaxis: 'y',
      });
    }

    const stdHeatmap = {
      type: 'heatmap',
      z: stdData,
      x: lons,
      y: lats,
      customdata: stdData.map(row => row.map(v => (v === null ? 'Unknown' : v.toFixed(2)))),
      colorscale: stdColorscale,
      zmin: 0,
      zmax: 0.6,
      colorbar: {
        tickvals: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6],
        ticktext: ['0.0', '0.1', '0.2', '0.3', '0.4', '0.5', 'Max'],
        ticks: 'outside',
        x: 1.02,
        y: isVertical ? 0.22 : 0.5,
        len: isVertical ? 0.5 : 0.7,
        tickfont: { color: 'white' },
      },
      hovertemplate: 'Lon: %{x}<br>Lat: %{y}<br>Std Dev: %{customdata}<extra></extra>',
      xaxis: 'x2',
      yaxis: 'y2',
    };
    traces.push(stdHeatmap);

    return traces;
  }, [meanData, stdData, uncertaintyMask, lats, lons, colorscale, minValue, maxValue, tickvals, ticktext, isVertical]);
  const layout = useMemo(() => {
    const base = {
      grid: { rows: isVertical ? 2 : 1, columns: isVertical ? 1 : 2, pattern: 'independent' },
      dragmode: 'zoom',
      // Reduced margins to eliminate wasted space
      margin: { l: 20, r: 80, t: 60, b: 20 },
      paper_bgcolor: 'transparent',
      // The plot area itself is transparent so no "box" shows
      plot_bgcolor: 'transparent',
      annotations: [
        {
          text: 'Mean',
          x: isVertical ? 0.5 : 0.22,
          y: isVertical ? 1.02 : 0.95,
          xref: 'paper', yref: 'paper',
          showarrow: false,
          font: { size: 16, color: 'white' },
          xanchor: 'center'
        },
        {
          text: 'Standard Deviation',
          x: isVertical ? 0.5 : 0.78,
          y: isVertical ? 0.48 : 0.95,
          xref: 'paper', yref: 'paper',
          showarrow: false,
          font: { size: 16, color: 'white' },
          xanchor: 'center'
        },
      ],
    };

    const axisTemplate = {
      showgrid: false,      // No grid lines
      zeroline: false,      // No 0,0 lines
      showline: false,      // No axis border lines
      ticks: '',            // No tick marks
      showticklabels: false,
      constrain: 'domain',
      scaleanchor: 'y',     // Keep aspect ratio 1:1
      scaleratio: 1,
    };

    // Axis 1: Mean
    base.xaxis = {
      ...axisTemplate,
      domain: isVertical ? [0, 1] : [0, 0.44],
    };
    base.yaxis = {
      ...axisTemplate,
      domain: isVertical ? [0.56, 1] : [0, 1],
      autorange: 'reversed',
    };

    // Axis 2: STD
    base.xaxis2 = {
      ...axisTemplate,
      domain: isVertical ? [0, 1] : [0.56, 1],
    };
    base.yaxis2 = {
      ...axisTemplate,
      domain: isVertical ? [0, 0.44] : [0, 1],
      autorange: 'reversed',
      anchor: 'x2'
    };

    // Apply zoom ranges if they exist
    if (zoomedArea?.x && zoomedArea?.y) {
      ['xaxis', 'xaxis2'].forEach(ax => { base[ax].range = zoomedArea.x; base[ax].autorange = false; });
      ['yaxis', 'yaxis2'].forEach(ax => { base[ax].range = zoomedArea.y; base[ax].autorange = false; });
    }

    return base;
  }, [zoomedArea, isVertical]);

  const handleRelayout = useCallback(evt => {
    const xr = evt['xaxis.range'] || [evt['xaxis.range[0]'], evt['xaxis.range[1]']];
    const yr = evt['yaxis.range'] || [evt['yaxis.range[0]'], evt['yaxis.range[1]']];
    if (xr?.[0] != null && yr?.[0] != null) onZoomedAreaChange?.({ x: xr, y: yr });
    else if (evt['xaxis.autorange']) onZoomedAreaChange?.(null);
  }, [onZoomedAreaChange]);

  return (
    <div style={containerStyle}>
      <div style={mapGlobeTitleStyle}>{fullTitle}</div>
      {error && <div style={{ color: 'red', textAlign: 'center' }}>{error}</div>}
      <div style={plotWrapperStyle}>
        <Plot
          data={plotData}
          layout={layout}
          useResizeHandler
          style={{ width: '100%', height: '100%' }}
          onRelayout={handleRelayout}
          onDoubleClick={() => onZoomedAreaChange?.(null)}
          config={{ responsive: true, displayModeBar: false }}
        />
      </div>
    </div>
  );
};

export default MapDisplay;