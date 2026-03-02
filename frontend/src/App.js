import React, { useState, useMemo, useEffect } from 'react';
import ReferencesButton from './components/ReferencesButton';
import DataPanel from './components/DataPanel';
import Footer from './components/Footer';
import InfoModal from './components/InfoModal';
import debounce from 'lodash/debounce';
import './App.css';
import { Box, Typography, Divider, Paper, Button } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { infoMessages, BlueCloudLogo } from './constants';
import Tutorial from './components/Tutorial'

const App = () => {
  // Initial panel definition
  const initialPanel = {
    month: 1,
    debouncedMonth: 1,
    view: 'map',
    feature: 'a_shannon',
  };
  // Tutorial state
  const [tutorialActive, setTutorialActive] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);

  // Top-level UI / modal state
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [infoModalShortText, setInfoModalShortText] = useState('');
  const [infoModalTitle, setInfoModalTitle] = useState('');

  const [area, setArea] = useState(null);
  const [sharedZoom, setSharedZoom] = useState(null);

  // NetCDF source state
  const DEFAULT_URLS = [
    {
      label: "Default (ETH Diversity Dataset)",
      value: "https://data.up.ethz.ch/shared/mapmaker/output_diversity.nc"
    },
  ];

  const [netcdfUrl, setNetcdfUrl] = useState(DEFAULT_URLS[0].value);
  const [loadedUrl, setLoadedUrl] = useState(DEFAULT_URLS[0].value);
  const [selectedDefault, setSelectedDefault] = useState(DEFAULT_URLS[0].value);

  // Panel states
  const [panel, setPanel] = useState(() => ({ ...initialPanel }));

  // Debounced months (keep initial in sync with initialPanel.month)
  const [debouncedMonth, setDebouncedMonth] = useState(initialPanel.month);

  const debouncedUpdateMonth = useMemo(
    () => debounce((y) => setDebouncedMonth(y), 500),
    []
  );

  useEffect(() => {
    return () => {
      debouncedUpdateMonth.cancel();
    };
  }, [debouncedUpdateMonth]);

  // Info modal helpers
  const openInfoModal = (title, key) => {
    setInfoModalShortText(infoMessages[key] ?? 'No information available');
    setInfoModalTitle(title);
    setInfoModalOpen(true);
  };
  const closeInfoModal = () => setInfoModalOpen(false);

  const handleMonthChange = (panelSetter, month) => {
    panelSetter(prev => ({ ...prev, month }));
  };

  return (
    <Box className="App" sx={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
    }}>
      {/* Tutorial Overlay */}
      <Tutorial
        start={tutorialActive}
        onFinish={() => {
          setTutorialActive(false);
          setTutorialStep(0);
        }}
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
        {/* Logo */}
        <Box sx={{
          position: 'absolute',
          top: 25,
          left: 8,
          gap: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
        }}>
          <Paper
            key={BlueCloudLogo.alt}
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
              sx={{
                maxWidth: '345px',
                maxHeight: '65px',
                objectFit: 'contain',
              }}
            />
          </Paper>
        </Box>

        {/* Title + Subtitle grouped together */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Typography
            variant="h1"
            sx={{
              fontSize: '3.5rem',
              fontWeight: 'bold',
              color: 'white',
              lineHeight: 1,
              mt: 2,
            }}
          >
            BluEOView
          </Typography>
          <Typography
            variant="h6"
            sx={{
              fontSize: '1.25rem',
              color: 'white',
              mt: 0.5,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            Visualisation of{' '}
            <Box
              component="span"
              sx={{ display: 'flex', alignItems: 'center', height: '1em' }}
            >
              <Box
                component="img"
                src="/assets/cephalopod_logo.png"
                alt="C"
                sx={{
                  height: '2em',
                  width: 'auto',
                  verticalAlign: 'middle',
                  ml: 1,
                }}
              />
            </Box>
            EPHALOPOD
          </Typography>
        </Box>

        {/* References Button */}
        <Box>
          <ReferencesButton />
        </Box>

        {/* Start Tutorial Button */}
        <Box sx={{ position: 'absolute', top: '55%', right: 16, zIndex: 1500 }}>
          <Button
            variant="outlined"
            color="white"
            onClick={() => setTutorialActive(true)}>Start Tutorial</Button>
        </Box>
      </Box>

      <Divider sx={{ bgcolor: 'rgba(255,255,255,0.3)', mt: 1, mb: 2 }} />

      {/* NetCDF URL Selector */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 2,
          px: 2,
          mb: 2,
          flexWrap: 'wrap'
        }}
      >
        <Typography sx={{ color: 'white', fontWeight: 500 }}>
          NetCDF Source:
        </Typography>

        {/* Dropdown */}
        <select
          value={selectedDefault}
          onChange={(e) => {
            setSelectedDefault(e.target.value);
            setNetcdfUrl(e.target.value);
          }}
          style={{
            padding: '6px 10px',
            borderRadius: 6,
            minWidth: 250
          }}
        >
          {DEFAULT_URLS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Custom URL input */}
        <input
          type="text"
          value={netcdfUrl}
          onChange={(e) => setNetcdfUrl(e.target.value)}
          placeholder="Enter custom NetCDF URL..."
          style={{
            padding: '6px 10px',
            borderRadius: 6,
            width: 400,
            maxWidth: '80vw'
          }}
        />

        <Button
          variant="contained"
          onClick={() => {
            console.log("Using NetCDF:", netcdfUrl);
            setLoadedUrl(netcdfUrl);
          }}
        >
          Load
        </Button>
      </Box>

      {/* Info Modal */}
      <InfoModal
        open={infoModalOpen}
        onClose={closeInfoModal}
        title={infoModalTitle}
        shortText={infoModalShortText}
      />

      <Box
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'row',
          gap: 1,
          px: 1,
          '@media (max-width: 1000px)': {
            flexDirection: 'column',
          },
        }}
      >
        <Box sx={{ flexGrow: 1, minWidth: 500 }}>
          {/* DataPanel */}
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
          />

        </Box>
      </Box>

      <Divider sx={{ bgcolor: 'rgba(255,255,255,0.3)', my: 2 }} />

      <Footer />
    </Box >
  );
};

export default App;