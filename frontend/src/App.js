import React, { useState, useMemo, useEffect } from 'react';
import CombinedLinePlot from './components/CombinedLinePlot';
import ReferencesButton from './components/ReferencesButton';
import DataPanel from './components/DataPanel';
import Footer from './components/Footer';
import ControlPanel from './components/ControlPanel';
import InfoModal from './components/InfoModal';
import debounce from 'lodash/debounce';
import './App.css';
import { Box, Typography, Divider, IconButton, Collapse } from '@mui/material';
import {
  infoMessages,
  shortProjectDescription,
  projectDescription,
} from './constants';
import { ExpandLess, ExpandMore } from '@mui/icons-material';

const App = () => {
  // Initial panel definition
  const initialPanel = {
    month: 0,
    debouncedMonth: 0,
    view: 'map',
    feature: 'a_shannon',
  };

  // Top-level UI / modal state
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [infoModalShortText, setInfoModalShortText] = useState('');
  const [infoModalTitle, setInfoModalTitle] = useState('');
  const [projectModalOpen, setProjectModalOpen] = useState(() => {
    const hideModal = localStorage.getItem('hideProjectExplanation');
    return !hideModal;
  });

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

  //  Collapsible state
  const [panelsCollapsed, setPanelsCollapsed] = useState(false);

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
    <Box className="App" sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

      {/* Project Explanation Modal */}
      <InfoModal
        open={projectModalOpen}
        onClose={() => setProjectModalOpen(false)}
        title={"Welcome to bluEOView!"}
        shortText={shortProjectDescription}
        longText={projectDescription}
        showDontShowAgain={true}
      />

      {/* Header */}
      <Box component="header" sx={{ backgroundColor: 'transparent', mt: 2, px: 4, position: 'relative', textAlign: 'center' }}>
        <Typography variant="h1" sx={{ fontSize: '3.5rem', fontWeight: 'bold', color: 'white' }}>BluEOView</Typography>
        <Typography variant="h6" sx={{ fontSize: '1.25rem', color: 'white', mt: 1 }}>
          Visualisation of CEPHALOPOD
        </Typography>
        <ReferencesButton />
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
          />
        </Box>

        <Box sx={{ flex: '1 1 500px', minWidth: 500 }}>
          {/* Collapsible title */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'rgba(0, 0, 0, 0.25)',
              backdropFilter: 'blur(8px)',
              px: 2,
              py: 1,
              mb: 1,
              borderRadius: 1,
            }}
          >
            <Typography variant="h6" sx={{ color: 'white' }}>Control Panels</Typography>
            <IconButton
              onClick={() => setPanelsCollapsed(!panelsCollapsed)}
              sx={{
                color: '#fff',
                '&:hover': { color: '#4FC3F7', transform: 'scale(1.1)', transition: '0.2s' },
              }}
            >
              {panelsCollapsed ? <ExpandMore /> : <ExpandLess />}
            </IconButton>
          </Box>
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
            }}
          >
            {/* Collapsible content */}
            <Collapse in={!panelsCollapsed}>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'row',
                  flex: 1,
                  gap: 1,
                  justifyContent: 'space-between',
                  mb: 1,
                  zIndex: 'auto',
                  position: 'relative',
                }}
              >
                <Box sx={{ flex: 1, minWidth: 200 }}>
                  <ControlPanel
                    feature={panel1.feature}
                    onFeatureChange={(e) => setPanel1(prev => ({ ...prev, feature: e.target.value }))}
                    openInfoModal={openInfoModal}
                  />
                </Box>

                {/* Right Control Panel */}
                <Box sx={{ flex: 1, minWidth: 200 }}>
                  <ControlPanel
                    feature={panel2.feature}
                    onFeatureChange={(e) => setPanel2(prev => ({ ...prev, feature: e.target.value }))}
                    openInfoModal={openInfoModal}
                  />
                </Box>
              </Box>
            </Collapse>
          </Box>

          <Box
            sx={{
              flexShrink: 0,
              position: 'relative',
              zIndex: 'auto',
            }}
          >
            {/* Combined line plot */}
            <CombinedLinePlot
              point={selectedPoint}
              zoomedArea={area}
              leftSettings={{ feature: panel1.feature }}
              rightSettings={{ feature: panel2.feature, }}
              startMonth={0}
              endMonth={11}
            />
          </Box>
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
          />
        </Box>
      </Box>

      <Divider sx={{ bgcolor: 'rgba(255,255,255,0.3)', my: 2 }} />

      <Footer />
    </Box>
  );
};

export default App;