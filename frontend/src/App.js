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

  const [selectedPoint, setSelectedPoint] = useState({ x: 0, y: 0 });
  const [area, setArea] = useState(null);
  const [sharedZoom, setSharedZoom] = useState(null);

  // Panel states
  const [panel1, setPanel1] = useState(() => ({ ...initialPanel }));
  const [panel2, setPanel2] = useState(() => ({ ...initialPanel, feature: 'a_evenness', view: 'globe' }));

  // Locks
  const [lockMonth, setLockMonth] = useState(true);

  // Debounced years (keep initial in sync with initialPanel.month)
  const [debouncedMonth1, setDebouncedMonth1] = useState(initialPanel.month);
  const [debouncedMonth2, setDebouncedMonth2] = useState(initialPanel.month);

  const debouncedUpdateMonth1 = useMemo(
    () => debounce((y) => setDebouncedMonth1(y), 500),
    []
  );
  const debouncedUpdateMonth2 = useMemo(
    () => debounce((y) => setDebouncedMonth2(y), 500),
    []
  );

  useEffect(() => {
    return () => {
      debouncedUpdateMonth1.cancel();
      debouncedUpdateMonth2.cancel();
    };
  }, [debouncedUpdateMonth1, debouncedUpdateMonth2]);

  // Info modal helpers
  const openInfoModal = (title, key) => {
    setInfoModalShortText(infoMessages[key] ?? 'No information available');
    setInfoModalTitle(title);
    setInfoModalOpen(true);
  };
  const closeInfoModal = () => setInfoModalOpen(false);

  const handleMonthChange = (panelSetter, otherPanelSetter, month) => {
    panelSetter(prev => ({ ...prev, month }));
    if (lockMonth) {
      otherPanelSetter(prev => ({ ...prev, month }));
    }
  };

  const handleMonthLockToggle = () => {
    const newLock = !lockMonth;
    setLockMonth(newLock);

    if (newLock) {
      // synchronize panel2 month to panel1 when enabling the lock
      setPanel2(prev => ({ ...prev, month: panel1.month }));
    }
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
          '@media (max-width: 1500px)': {
            flexDirection: 'column',
          },
        }}
      >
        <Box sx={{ flex: '1 1 500px', minWidth: 500 }}>
          {/* Left DataPanel */}
          <DataPanel
            panel={panel1}
            setPanel={setPanel1}
            debouncedMonth={debouncedMonth1}
            debouncedUpdateMonth={debouncedUpdateMonth1}
            setSelectedPoint={setSelectedPoint}
            setArea={setArea}
            selectedPoint={selectedPoint}
            selectedArea={area}
            lockMonth={lockMonth}
            onMonthChange={(y) => handleMonthChange(setPanel1, setPanel2, y)}
            onLockToggle={handleMonthLockToggle}
            sharedZoom={sharedZoom}
            onSharedZoomChange={setSharedZoom}
            openInfoModal={openInfoModal}
          />
        </Box>

        <Box sx={{ flex: '1 1 500px', minWidth: 500 }}>
          <DataPanel
            panel={panel2}
            setPanel={setPanel2}
            debouncedMonth={debouncedMonth2}
            debouncedUpdateMonth={debouncedUpdateMonth2}
            setSelectedPoint={setSelectedPoint}
            setArea={setArea}
            selectedPoint={selectedPoint}
            selectedArea={area}
            lockMonth={lockMonth}
            onMonthChange={(y) => handleMonthChange(setPanel2, setPanel1, y)}
            onLockToggle={handleMonthLockToggle}
            sharedZoom={sharedZoom}
            onSharedZoomChange={setSharedZoom}
            openInfoModal={openInfoModal}
          />
        </Box>
      </Box>

      <Divider sx={{ bgcolor: 'rgba(255,255,255,0.3)', my: 2 }} />

      <Footer />
    </Box >
  );
};

export default App;