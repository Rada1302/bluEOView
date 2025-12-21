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

  const colorscale = useMemo(() => generateColorStops(colors), []);

  // Fetch data
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

  // Colorbar ticks (mean)
  const { tickvals, ticktext } = useMemo(() => {
    if (minValue == null || maxValue == null) {
      return { tickvals: [], ticktext: [] };
    }
    const numBins = colorscale.length / 2;
    return generateColorbarTicks(minValue, maxValue, numBins);
  }, [minValue, maxValue, colorscale]);

  // Uncertainty mask
  const uncertaintyMask = useMemo(() => {
    return stdData.map(row =>
      row.map(v => (v > STD_THRESHOLD ? 1 : 0))
    );
  }, [stdData]);

  const hoverWarnings = useMemo(() => {
    return stdData.map(row =>
      row.map(v =>
        v > STD_THRESHOLD
          ? '<br> High uncertainty (SD > 0.5)'
          : ''
      )
    );
  }, [stdData]);

  const hasHighSD = useMemo(() => {
    return stdData.some(row => row.some(v => v > STD_THRESHOLD));
  }, [stdData]);

  // Plot data
  const plotData = useMemo(() => {
    const meanHeatmap = {
      type: 'heatmap',
      z: meanData,
      x: lons,
      y: lats,
      customdata: stdData.map((row, i) =>
        row.map((v, j) => [v, hoverWarnings[i][j]])
      ),
      colorscale,
      zmin: minValue,
      zmax: maxValue,
      xgap: 0,
      ygap: 0,
      colorbar: {
        tickvals,
        ticktext,
        ticks: 'outside',
        x: 0.46,
        y: 0.5,
        len: 0.95,
        tickfont: { color: 'white' },
      },
      hovertemplate: ` Lon: %{x}<br> Lat: %{y}<br> Mean: %{z}<b style="color:red">%{customdata[1]}</b><extra></extra>`,
      xaxis: 'x',
      yaxis: 'y',
    };

    const traces = [meanHeatmap];

    if (hasHighSD) {
      const uncertaintyOverlay = {
        type: 'heatmap',
        z: uncertaintyMask,
        x: lons,
        y: lats,
        colorscale: [
          [0, 'rgba(0,0,0,0)'],
          [1, '#ffffff'],
        ],
        zsmooth: false,
        showscale: false,
        xgap: 0,
        ygap: 0,
        hoverinfo: 'skip',
        xaxis: 'x',
        yaxis: 'y',
        autocolorscale: false,
      };
      traces.push(uncertaintyOverlay);
    }

    const stdHeatmap = {
      type: 'heatmap',
      z: stdData,
      x: lons,
      y: lats,
      colorscale: stdColorscale,
      zmin: 0,
      zmax: 1.0,
      xgap: 0,
      ygap: 0,
      colorbar: {
        tickvals: [0, 0.25, 0.5, 1.0],
        ticktext: ['0.00', '0.25', '0.5', '1.0'],
        ticks: 'outside',
        x: 1.02,
        y: 0.5,
        len: 0.95,
        tickfont: { color: 'white' },
      },
      hovertemplate:
        'Lon: %{x}<br>Lat: %{y}<br>Std Dev: %{z}<extra></extra>',
      xaxis: 'x2',
      yaxis: 'y2',
    };
    traces.push(stdHeatmap);

    return traces;
  }, [
    meanData,
    stdData,
    uncertaintyMask,
    lats,
    lons,
    colorscale,
    minValue,
    maxValue,
    tickvals,
    ticktext,
  ]);

  // Layout
  const layout = useMemo(() => {
    const base = {
      grid: { rows: 1, columns: 2, pattern: 'independent' },
      dragmode: 'zoom',
      margin: { l: 50, r: 120, t: 90, b: 70 },
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'rgba(18,18,18,0.6)',
      annotations: [
        {
          text: 'Mean',
          x: 0.2,
          y: 1.05,
          xref: 'paper',
          yref: 'paper',
          showarrow: false,
          font: { size: 16, color: 'white' },
        },
        {
          text: 'Standard Deviation',
          x: 0.82,
          y: 1.05,
          xref: 'paper',
          yref: 'paper',
          showarrow: false,
          font: { size: 16, color: 'white' },
        },
      ],
    };

    ['xaxis', 'xaxis2'].forEach(ax => {
      base[ax] = {
        showgrid: false,
        zeroline: false,
        showline: false,
        showticklabels: false,
      };
    });

    ['yaxis', 'yaxis2'].forEach(ax => {
      base[ax] = {
        showgrid: false,
        zeroline: false,
        showline: false,
        showticklabels: false,
        autorange: 'reversed',
      };
    });

    if (zoomedArea?.x && zoomedArea?.y) {
      ['xaxis', 'xaxis2'].forEach(ax => {
        base[ax].range = zoomedArea.x;
        base[ax].autorange = false;
      });
      ['yaxis', 'yaxis2'].forEach(ax => {
        base[ax].range = zoomedArea.y;
        base[ax].autorange = false;
      });
    }

    return base;
  }, [zoomedArea]);

  // Events
  const handleRelayout = useCallback(
    evt => {
      const xr =
        evt['xaxis.range'] ||
        [evt['xaxis.range[0]'], evt['xaxis.range[1]']];
      const yr =
        evt['yaxis.range'] ||
        [evt['yaxis.range[0]'], evt['yaxis.range[1]']];

      if (xr?.[0] != null && yr?.[0] != null) {
        onZoomedAreaChange?.({ x: xr, y: yr });
      } else if (evt['xaxis.autorange']) {
        onZoomedAreaChange?.(null);
      }
    },
    [onZoomedAreaChange]
  );

  const handleDoubleClick = useCallback(() => {
    // Only reset zoom if currently zoomed in
    if (zoomedArea) {
      onZoomedAreaChange?.(null);
    }
  }, [zoomedArea, onZoomedAreaChange]);

  // Rendering
  return (
    <div style={containerStyle}>
      <div style={mapGlobeTitleStyle}>{fullTitle}</div>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <div style={plotWrapperStyle}>
        <Plot
          data={plotData}
          layout={layout}
          useResizeHandler
          style={{ width: '100%', height: '100%' }}
          onRelayout={handleRelayout}
          onDoubleClick={handleDoubleClick}
          config={{
            responsive: true,
            scrollZoom: false,
            displayModeBar: false,
            displaylogo: false,
            doubleClick: false,
          }}
        />
      </div>
    </div>
  );
};

export default MapDisplay;
