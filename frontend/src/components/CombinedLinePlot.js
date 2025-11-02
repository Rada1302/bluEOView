import React, { useEffect, useState, useMemo } from 'react';
import Plot from 'react-plotly.js';
import { Box, IconButton, Tooltip } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { featureNames } from '../constants';

const buildUrl = (feature, point) => {
  return `/api/diversity-line?feature=${feature}&x=${point.x}&y=${point.y}`;
};

const getTrace = (data) => {
  if (!data || !data.time) return null;
  return {
    x: data.time,
    y: data.mean,
    std: data.sd,
  };
};

const getName = (feature) => featureNames[feature] || feature;

const CombinedLinePlot = ({ point, leftSettings, rightSettings }) => {
  const [leftData, setLeftData] = useState(null);
  const [rightData, setRightData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (point.x == null || point.y == null) return;
    const controller = new AbortController();
    const signal = controller.signal;

    const fetchData = async () => {
      try {
        setError(null);
        const [leftRes, rightRes] = await Promise.all([
          fetch(buildUrl(leftSettings.feature, point), { signal }),
          fetch(buildUrl(rightSettings.feature, point), { signal }),
        ]);

        if (!leftRes.ok || !rightRes.ok) {
          throw new Error(`Backend error: ${leftRes.status} / ${rightRes.status}`);
        }

        const [leftJson, rightJson] = await Promise.all([
          leftRes.json(),
          rightRes.json(),
        ]);

        setLeftData(getTrace(leftJson));
        setRightData(getTrace(rightJson));
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Error fetching data');
        }
      }
    };

    fetchData();
    return () => controller.abort();
  }, [point, leftSettings, rightSettings]);

  const handleDownload = () => {
    if (!leftData || !rightData) return;

    const csvHeader = ['Time', getName(leftSettings.feature), getName(rightSettings.feature)].join(',');
    const csvRows = leftData.x.map((t, i) => {
      const leftVal = leftData.y[i] ?? '';
      const rightVal = rightData.y[i] ?? '';
      return `${t},${leftVal},${rightVal}`;
    });

    const csvContent = [csvHeader, ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diversity_timeseries_${point.x.toFixed(2)}_${point.y.toFixed(2)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const layout = useMemo(() => ({
    title: {
      text: `${getName(leftSettings.feature)} and ${getName(rightSettings.feature)}<br>at (${point.x.toFixed(2)}°E, ${point.y.toFixed(2)}°N)`,
      font: { color: 'white' },
    },
    paper_bgcolor: 'rgba(18, 18, 18, 0.6)',
    plot_bgcolor: 'rgba(18, 18, 18, 0.6)',
    xaxis: {
      title: { text: 'Time', font: { color: 'white' } },
      tickfont: { color: 'white' },
      gridcolor: '#444',
      linecolor: 'white',
    },
    yaxis: {
      title: getName(leftSettings.feature),
      color: 'cyan',
      linecolor: 'cyan',
      tickcolor: 'cyan',
    },
    yaxis2: {
      title: getName(rightSettings.feature),
      color: 'orange',
      overlaying: 'y',
      side: 'right',
      linecolor: 'orange',
      tickcolor: 'orange',
    },
    showlegend: false,
  }), [leftSettings, rightSettings, point]);

  if (error) return <div style={{ color: 'red' }}>Error loading chart: {error}</div>;
  if (!leftData || !rightData) return null;

  const plotData = [
    {
      x: leftData.x,
      y: leftData.y,
      type: 'scatter',
      mode: 'lines+markers',
      line: { color: 'cyan' },
    },
    {
      x: rightData.x,
      y: rightData.y,
      type: 'scatter',
      mode: 'lines+markers',
      line: { color: 'orange' },
      yaxis: 'y2',
    },
  ];

  return (
    <Box sx={{ borderRadius: 1, position: 'relative' }}>
      <Plot
        data={plotData}
        layout={layout}
        config={{ displayModeBar: false }}
        style={{ width: '100%', height: '100%' }}
        useResizeHandler
      />
      <Tooltip title="Download CSV">
        <IconButton
          onClick={handleDownload}
          sx={{
            position: 'absolute',
            top: 20,
            right: 20,
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
  );
};

export default CombinedLinePlot;
