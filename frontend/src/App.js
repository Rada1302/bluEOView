import React, { useState, useMemo, useEffect } from 'react';
import ReferencesButton from './components/ReferencesButton';
import DataPanel from './components/DataPanel';
import Footer from './components/Footer';
import InfoModal from './components/InfoModal';
import debounce from 'lodash/debounce';
import './App.css';
import { Box, Typography, Divider, Paper, Button, CircularProgress, Chip } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { BlueCloudLogo } from './constants';
import Tutorial from './components/Tutorial';

const App = () => {

  const initialPanel = {
    month: 1,
    debouncedMonth: 1,
    view: 'map',
    feature: null,
  };

  const [tutorialActive, setTutorialActive] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);

  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [infoModalShortText, setInfoModalShortText] = useState('');
  const [infoModalTitle, setInfoModalTitle] = useState('');

  const [area, setArea] = useState(null);
  const [sharedZoom, setSharedZoom] = useState(null);

  const DEFAULT_URLS = [
    {
      label: "Default (Blueoview Diversity Dataset)",
      value: "https://data.up.ethz.ch/shared/Blueoview_data/diversity_output.nc"
    },
  ];

  const [netcdfUrl, setNetcdfUrl] = useState(DEFAULT_URLS[0].value);
  const [loadedUrl, setLoadedUrl] = useState(DEFAULT_URLS[0].value);
  const [selectedDefault, setSelectedDefault] = useState(DEFAULT_URLS[0].value);

  const [featureOptions, setFeatureOptions] = useState([]);
  const [featuresLoading, setFeaturesLoading] = useState(false);
  const [featuresError, setFeaturesError] = useState(null);

  const [panel, setPanel] = useState(() => ({ ...initialPanel }));
  const [debouncedMonth, setDebouncedMonth] = useState(initialPanel.month);

  const debouncedUpdateMonth = useMemo(
    () => debounce((y) => setDebouncedMonth(y), 500),
    []
  );

  useEffect(() => () => debouncedUpdateMonth.cancel(), [debouncedUpdateMonth]);

  const openInfoModal = (title) => {
    setInfoModalShortText('No information available');
    setInfoModalTitle(title);
    setInfoModalOpen(true);
  };

  const closeInfoModal = () => setInfoModalOpen(false);

  const handleMonthChange = (panelSetter, month) => {
    panelSetter(prev => ({ ...prev, month }));
  };

  const formatFeatureName = (name) => {
    return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  // Fetch features whenever loadedUrl changes
  useEffect(() => {
    if (!loadedUrl) return;

    let active = true;

    setFeatureOptions([]);
    setFeaturesError(null);
    setFeaturesLoading(true);
    setPanel(prev => ({ ...prev, feature: null }));

    fetch(`/api/diversity-features?file=${encodeURIComponent(loadedUrl)}`)
      .then(res => {
        if (!res.ok) throw new Error(`Backend error ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (!active) return;

        if (data.error) throw new Error(data.error);

        if (data.features?.length > 0) {
          const options = data.features.map(f => ({
            label: f.label ?? formatFeatureName(f.value),
            value: f.value ?? f,
          }));
          setFeatureOptions(options);
          setPanel(prev => ({ ...prev, feature: options[0].value }));
        } else {
          setFeaturesError('No valid features found in this dataset.');
        }
      })
      .catch(err => {
        if (!active) return;
        console.error('Error fetching feature list:', err);
        setFeaturesError(`Failed to load dataset: ${err.message}`);
        setFeatureOptions([]);
        setPanel(prev => ({ ...prev, feature: null }));
      })
      .finally(() => {
        if (active) setFeaturesLoading(false);
      });

    return () => { active = false; };
  }, [loadedUrl]);

  const handleLoad = () => {
    const trimmed = netcdfUrl.trim();
    if (!trimmed) return;
    setLoadedUrl(trimmed);
    // Reset dropdown if URL doesn't match any preset
    const matchingDefault = DEFAULT_URLS.find(u => u.value === trimmed);
    setSelectedDefault(matchingDefault?.value ?? '');
  };

  return (
    <Box className="App" sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

      <Tutorial
        start={tutorialActive}
        onFinish={() => { setTutorialActive(false); setTutorialStep(0); }}
        setTutorialStep={setTutorialStep}
      />

      {/* Header */}
      <Box
        component="header"
        sx={{
          backgroundColor: 'transparent',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 3,
          textAlign: 'center',
        }}
      >
        <Box sx={{
          position: 'absolute',
          top: 25,
          left: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
        }}>
          <Paper
            component="a"
            href={BlueCloudLogo.href}
            target="_blank"
            rel="noopener noreferrer"
            elevation={2}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 350,
              height: 70,
              backgroundColor: 'rgba(0, 0, 0, 0.25)',
              borderRadius: 1,
              textDecoration: 'none',
              transition: 'box-shadow 0.2s ease-in-out',
              '&:hover': {
                boxShadow: (theme) => theme.shadows[6],
                backgroundColor: alpha('#000000', 0.03),
              },
            }}
          >
            <Box
              component="img"
              src={BlueCloudLogo.src}
              alt={BlueCloudLogo.alt}
              sx={{ maxWidth: '345px', maxHeight: '65px', objectFit: 'contain' }}
            />
          </Paper>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Typography variant="h1" sx={{ fontSize: '3.5rem', fontWeight: 'bold', color: 'white', lineHeight: 1, mt: 2 }}>
            BluEOView
          </Typography>
          <Typography variant="h6" sx={{ fontSize: '1.25rem', color: 'white', mt: 0.5 }}>
            Visualisation of CEPHALOPOD
          </Typography>
        </Box>

        <Box><ReferencesButton /></Box>

        <Box sx={{ position: 'absolute', top: '55%', right: 16 }}>
          <Button variant="outlined" onClick={() => setTutorialActive(true)}>
            Start Tutorial
          </Button>
        </Box>
      </Box>

      <Divider sx={{ bgcolor: 'rgba(255,255,255,0.3)', mt: 1, mb: 2 }} />

      {/* NetCDF Selector */}
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, px: 2, mb: 1, flexWrap: 'wrap' }}>
        <Typography sx={{ color: 'white', fontWeight: 500 }}>
          NetCDF Source:
        </Typography>

        <select
          value={selectedDefault}
          onChange={(e) => {
            const val = e.target.value;
            setSelectedDefault(val);
            setNetcdfUrl(val);
          }}
          style={{ padding: '6px 10px', borderRadius: 6, minWidth: 250 }}
        >
          <option value=""> Custom URL </option>
          {DEFAULT_URLS.map(opt =>
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          )}
        </select>

        <input
          type="text"
          value={netcdfUrl}
          onChange={(e) => {
            setNetcdfUrl(e.target.value);
            setSelectedDefault(''); // clear dropdown when typing custom URL
          }}
          onKeyDown={(e) => { if (e.key === 'Enter') handleLoad(); }}
          placeholder="Enter custom NetCDF URL..."
          style={{ padding: '6px 10px', borderRadius: 6, width: 400, maxWidth: '80vw' }}
        />

        <Button
          variant="contained"
          onClick={handleLoad}
          disabled={featuresLoading || !netcdfUrl.trim()}
        >
          {featuresLoading ? <CircularProgress size={20} sx={{ color: 'white' }} /> : 'Load'}
        </Button>

        {/* Status indicator */}
        {featuresLoading && (
          <Chip label="Downloading & indexing dataset…" sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)' }} variant="outlined" />
        )}
        {!featuresLoading && featuresError && (
          <Chip label={featuresError} color="error" variant="outlined" />
        )}
        {!featuresLoading && !featuresError && featureOptions.length > 0 && (
          <Chip
            label={`${featureOptions.length} features loaded`}
            sx={{ color: '#90ee90', borderColor: '#90ee90' }}
            variant="outlined"
          />
        )}
      </Box>

      <InfoModal
        open={infoModalOpen}
        onClose={closeInfoModal}
        title={infoModalTitle}
        shortText={infoModalShortText}
      />

      <Box sx={{
        flexGrow: 1,
        display: 'flex',
        flexDirection: 'row',
        gap: 1,
        px: 1,
        '@media (max-width: 1000px)': { flexDirection: 'column' }
      }}>
        <Box sx={{ flexGrow: 1, minWidth: 500 }}>
          <DataPanel
            panel={panel}
            setPanel={setPanel}
            debouncedMonth={debouncedMonth}
            debouncedUpdateMonth={debouncedUpdateMonth}
            setArea={setArea}
            selectedArea={area}
            onMonthChange={(y) => handleMonthChange(setPanel, y)}
            sharedZoom={sharedZoom}
            onSharedZoomChange={setSharedZoom}
            openInfoModal={openInfoModal}
            netcdfUrl={loadedUrl}
            featureOptions={featureOptions}
          />
        </Box>
      </Box>

      <Divider sx={{ bgcolor: 'rgba(255,255,255,0.3)', my: 2 }} />
      <Footer />
    </Box>
  );
};

export default App;