import React, { useEffect, useState, useMemo } from 'react';
import Plot from 'react-plotly.js';
import { Box, IconButton, Tooltip } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { featureNames } from '../constants';

// URL builder for monthly time axis
const buildUrl = (settings, point, startMonth, endMonth, zoomedArea = null) => {
  const featureQuery = `&feature=${settings.feature}`;
  const base = zoomedArea
    ? `/api/line-data?xMin=${zoomedArea.x[0]}&xMax=${zoomedArea.x[1]}&yMin=${zoomedArea.y[0]}&yMax=${zoomedArea.y[1]}`
    : `/api/line-data?x=${point.x}&y=${point.y}`;
  return `${base}${featureQuery}&startMonth=${startMonth}&endMonth=${endMonth}`;
};

// Extracts trace data from backend response
const getTrace = (data) => {
  if (!data || !data.variable) return null;
  return {
    x: data.months || [],
    y: data.variable.values || [],
    std: data.variable.std || [],
  };
};

const getName = (settings) => featureNames[settings.feature];

const CombinedLinePlot = ({
  point,
  leftSettings,
  rightSettings,
  startMonth,
  endMonth,
  zoomedArea,
}) => {
  const [leftData, setLeftData] = useState(null);
  const [rightData, setRightData] = useState(null);
  const [leftAreaData, setLeftAreaData] = useState(null);
  const [rightAreaData, setRightAreaData] = useState(null);
  const [error, setError] = useState(null);

  // Fetch data from backend
  useEffect(() => {
    if (point.x == null || point.y == null) return;
    const controller = new AbortController();
    const signal = controller.signal;

    const fetchData = async () => {
      try {
        setError(null);
        const requests = [
          fetch(buildUrl(leftSettings, point, startMonth, endMonth), { signal }),
          fetch(buildUrl(rightSettings, point, startMonth, endMonth), { signal }),
        ];
        if (zoomedArea) {
          requests.push(fetch(buildUrl(leftSettings, point, startMonth, endMonth, zoomedArea), { signal }));
          requests.push(fetch(buildUrl(rightSettings, point, startMonth, endMonth, zoomedArea), { signal }));
        }

        const responses = await Promise.all(requests);
        for (const r of responses) {
          if (r && !r.ok) {
            const text = await r.text();
            throw new Error(`Backend error: ${r.status} ${text}`);
          }
        }

        const jsons = await Promise.all(responses.map(r => (r ? r.json() : null)));

        const [leftRes, rightRes, leftAreaRes, rightAreaRes] = jsons;
        setLeftData(getTrace(leftRes));
        setRightData(getTrace(rightRes));
        if (zoomedArea) {
          setLeftAreaData(leftAreaRes ? getTrace(leftAreaRes) : null);
          setRightAreaData(rightAreaRes ? getTrace(rightAreaRes) : null);
        } else {
          setLeftAreaData(null);
          setRightAreaData(null);
        }
      } catch (err) {
        if (err.name === 'AbortError') return;
        setError(err.message || 'Error fetching data');
      }
    };

    fetchData();
    return () => controller.abort();
  }, [point, zoomedArea, leftSettings, rightSettings, startMonth, endMonth]);

  // CSV download handler
  const handleDownload = () => {
    if (!leftData || !rightData) return;

    const csvHeader = ['Month', getName(leftSettings), getName(rightSettings)].join(',');
    const csvRows = leftData.x.map((month, i) => {
      const leftVal = leftData.y[i] ?? '';
      const rightVal = rightData.y[i] ?? '';
      return `${month},${leftVal},${rightVal}`;
    });

    const csvContent = [csvHeader, ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `time_series_${point.x.toFixed(2)}_${point.y.toFixed(2)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Layout configuration
  const layout = useMemo(() => {
    const title = zoomedArea
      ? `Zoomed Area Mean (±1 SD) of ${getName(leftSettings)}<br> and ${getName(rightSettings)}`
      : `${getName(leftSettings)} and ${getName(rightSettings)}<br> at ${point.x.toFixed(2)}°E, ${point.y.toFixed(2)}°N`;

    return {
      margin: { l: 70, r: 70, t: 70, b: 50, pad: 2 },
      title: { text: title, font: { color: 'white' } },
      paper_bgcolor: 'rgba(18, 18, 18, 0.6)',
      plot_bgcolor: 'rgba(18, 18, 18, 0.6)',
      xaxis: {
        title: { text: 'Month', font: { color: 'white' } },
        tickfont: { color: 'white' },
        linecolor: 'white',
        tickcolor: 'white',
        gridcolor: '#444',
        zeroline: false,
      },
      yaxis: {
        title: getName(leftSettings),
        color: 'cyan',
        linecolor: 'cyan',
        tickcolor: 'cyan',
      },
      yaxis2: {
        title: getName(rightSettings),
        color: 'orange',
        side: 'right',
        overlaying: 'y',
        linecolor: 'orange',
        tickcolor: 'orange',
      },
      showlegend: false,
    };
  }, [leftSettings, rightSettings, point, zoomedArea]);

  // Render states
  if (error) return <div style={{ color: 'red' }}>Error loading chart: {error}</div>;
  if (!leftData || !rightData) return null;

  // Build Plot traces
  const leftTraceData = zoomedArea && leftAreaData ? leftAreaData : leftData;
  const rightTraceData = zoomedArea && rightAreaData ? rightAreaData : rightData;

  const plotData = [];

  // Left mean and std
  if (leftTraceData) {
    const yUpper = leftTraceData.y.map((v, i) => v + (leftTraceData.std?.[i] ?? 0));
    const yLower = leftTraceData.y.map((v, i) => v - (leftTraceData.std?.[i] ?? 0));

    if (zoomedArea) {
      // SD shaded region
      plotData.push({
        x: [...leftTraceData.x, ...leftTraceData.x.slice().reverse()],
        y: [...yUpper, ...yLower.slice().reverse()],
        fill: 'toself',
        fillcolor: 'rgba(0, 255, 255, 0.2)',
        line: { color: 'transparent' },
        type: 'scatter',
        hoverinfo: 'skip',
        showlegend: false,
      });
    }

    plotData.push({
      x: leftTraceData.x,
      y: leftTraceData.y,
      type: 'scatter',
      mode: 'lines+markers',
      line: { color: 'cyan' },
    });
  }

  // Right mean and std
  if (rightTraceData) {
    const yUpper = rightTraceData.y.map((v, i) => v + (rightTraceData.std?.[i] ?? 0));
    const yLower = rightTraceData.y.map((v, i) => v - (rightTraceData.std?.[i] ?? 0));

    if (zoomedArea) {
      // SD shaded region
      plotData.push({
        x: [...rightTraceData.x, ...rightTraceData.x.slice().reverse()],
        y: [...yUpper, ...yLower.slice().reverse()],
        fill: 'toself',
        fillcolor: 'rgba(255, 165, 0, 0.2)',
        line: { color: 'transparent' },
        type: 'scatter',
        yaxis: 'y2',
        hoverinfo: 'skip',
        showlegend: false,
      });
    }

    plotData.push({
      x: rightTraceData.x,
      y: rightTraceData.y,
      type: 'scatter',
      mode: 'lines+markers',
      line: { color: 'orange' },
      yaxis: 'y2',
    });
  }

  return (
    <Box
      sx={{
        p: 2,
        backgroundColor: 'rgba(0, 0, 0, 0.25)',
        borderRadius: 1,
        flex: 1,
        position: 'relative',
      }}
    >
      <Box sx={{ position: 'relative' }}>
        <Plot
          data={plotData}
          layout={layout}
          config={{ displayModeBar: false }}
          style={{ width: '100%' }}
          useResizeHandler={true}
        />

        {/* Download button */}
        <Tooltip title="Download CSV">
          <IconButton
            onClick={handleDownload}
            sx={{
              position: 'absolute',
              top: 4,
              right: 8,
              color: 'white',
              backgroundColor: 'rgba(0,0,0,0.4)',
              '&:hover': { backgroundColor: 'rgba(0,0,0,0.6)' },
              zIndex: 10,
            }}
          >
            <DownloadIcon />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
};

export default CombinedLinePlot;