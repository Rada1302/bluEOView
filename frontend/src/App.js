import React, { useState, useMemo, useEffect } from 'react';
import CombinedLinePlot from './components/CombinedLinePlot';
import ReferencesButton from './components/ReferencesButton';
import DataPanel from './components/DataPanel';
import Footer from './components/Footer';
import ControlPanel from './components/ControlPanel';
import InfoModal from './components/InfoModal';
import Tutorial from './components/Tutorial';
import debounce from 'lodash/debounce';
import './App.css';
import { Box, Typography, Divider, IconButton, Collapse, Button } from '@mui/material';
import {
  diversityIndices,
  environmentalParameters,
  planktonGroups,
  rcpScenarios,
  earthModels,
  infoMessages,
  infoMessagesShort,
  shortProjectDescription,
  projectDescription,
} from './constants';
import { Lock, LockOpen, ExpandLess, ExpandMore } from '@mui/icons-material';

const App = () => {
  // Initial panel definition
  const initialPanel = {
    year: 2025,
    debouncedYear: 2025,
    source: 'plankton',
    view: 'map',
    diversity: diversityIndices[1],
    envParam: environmentalParameters[0],
    group: planktonGroups[0],
    rcp: rcpScenarios[0],
    model: earthModels[0],
  };

  // Tutorial state
  const [tutorialActive, setTutorialActive] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);

  // Top-level UI / modal state
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [infoModalText, setInfoModalText] = useState('');
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
  const [panel2, setPanel2] = useState(() => ({ ...initialPanel, source: 'environmental', view: 'globe' }));

  // Locks
  const [lockScenario, setLockScenario] = useState(true);
  const [lockModel, setLockModel] = useState(true);
  const [lockYear, setLockYear] = useState(true);

  // Debounced years (keep initial in sync with initialPanel.year)
  const [debouncedYear1, setDebouncedYear1] = useState(initialPanel.year);
  const [debouncedYear2, setDebouncedYear2] = useState(initialPanel.year);

  const debouncedUpdateYear1 = useMemo(
    () => debounce((y) => setDebouncedYear1(y), 500),
    []
  );
  const debouncedUpdateYear2 = useMemo(
    () => debounce((y) => setDebouncedYear2(y), 500),
    []
  );

  useEffect(() => {
    return () => {
      debouncedUpdateYear1.cancel();
      debouncedUpdateYear2.cancel();
    };
  }, [debouncedUpdateYear1, debouncedUpdateYear2]);

  //  Collapsible state
  const [panelsCollapsed, setPanelsCollapsed] = useState(false);

  // Info modal helpers
  const openInfoModal = (title, key) => {
    setInfoModalShortText(infoMessagesShort[key] ?? 'No short description available');
    setInfoModalText(infoMessages[key] ?? 'No information available');
    setInfoModalTitle(title);
    setInfoModalOpen(true);
  };
  const closeInfoModal = () => setInfoModalOpen(false);

  // Filtering helper
  const filterBiomes = (diversity) => ({
    groups: diversity === 'Biomes' ? planktonGroups.slice(0, 1) : planktonGroups,
    rcp: diversity === 'Biomes' ? rcpScenarios.slice(0, 3) : rcpScenarios,
    models: diversity === 'Biomes' ? earthModels.slice(0, 1) : earthModels,
  });

  // Scenario & Model & Year handlers
  const handleRcpChange = (panelSetter, otherPanelSetter, value) => {
    panelSetter(prev => ({ ...prev, rcp: value }));
    if (lockScenario) {
      otherPanelSetter(prev => ({ ...prev, rcp: value }));
    }
  };

  const handleModelChange = (panelSetter, otherPanelSetter, value) => {
    panelSetter(prev => ({ ...prev, model: value }));
    if (lockModel) {
      otherPanelSetter(prev => ({ ...prev, model: value }));
    }
  };

  const handleYearChange = (panelSetter, otherPanelSetter, year) => {
    panelSetter(prev => ({ ...prev, year }));
    if (lockYear) {
      otherPanelSetter(prev => ({ ...prev, year }));
    }
  };

  const handleYearLockToggle = () => {
    const newLock = !lockYear;
    setLockYear(newLock);

    if (newLock) {
      // synchronize panel2 year to panel1 when enabling the lock
      setPanel2(prev => ({ ...prev, year: panel1.year }));
    }
  };

  return (
    <Box className="App" sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Tutorial Overlay */}
      <Tutorial
        start={tutorialActive}
        onFinish={() => {
          setTutorialActive(false);
          setTutorialStep(0);
        }}
        panel1Year={panel1.year}
        setPanel1Year={(y) => handleYearChange(setPanel1, setPanel2, y)}
        setTutorialStep={setTutorialStep}
      />

      {/* Project Explanation Modal */}
      <InfoModal
        open={projectModalOpen}
        onClose={() => setProjectModalOpen(false)}
        title={"Welcome to MAPMAKER!"}
        shortText={shortProjectDescription}
        longText={projectDescription}
        showDontShowAgain={true}
      />

      {/* Header */}
      <Box component="header" sx={{ backgroundColor: 'transparent', mt: 2, px: 4, position: 'relative', textAlign: 'center' }}>
        {/* Start Tutorial Button */}
        <Box sx={{ position: 'absolute', top: '30%', left: 16, zIndex: 1500, transform: 'translateY(-50%)' }}>
          <Button
            variant="outlined"
            color="white"
            onClick={() => setTutorialActive(true)}>Start Tutorial</Button>
        </Box>
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
        longText={infoModalText}
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
            tutorialStep={tutorialStep}
            debouncedYear={debouncedYear1}
            debouncedUpdateYear={debouncedUpdateYear1}
            setSelectedPoint={setSelectedPoint}
            setArea={setArea}
            selectedPoint={selectedPoint}
            selectedArea={area}
            lockYear={lockYear}
            onYearChange={(y) => handleYearChange(setPanel1, setPanel2, y)}
            onLockToggle={handleYearLockToggle}
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
                  border: [4, 5].includes(tutorialStep) ? '4px solid #4FC3F7' : 'none',
                  boxShadow: [4, 5].includes(tutorialStep) ? '0 0 30px 10px rgba(79,195,247,0.6)' : 'none',
                  animation: [4, 5].includes(tutorialStep) ? 'pulse 1.5s infinite' : 'none',
                  zIndex: [4, 5].includes(tutorialStep) ? 3000 : 'auto',
                  position: 'relative',
                }}
              >
                <Box sx={{ flex: 1, minWidth: 200 }}>
                  <ControlPanel
                    source={panel1.source}
                    onSourceChange={(e) => setPanel1(prev => ({ ...prev, source: e.target.value }))}
                    diversity={panel1.diversity}
                    onDiversityChange={(e) => setPanel1(prev => ({ ...prev, diversity: e.target.value }))}
                    envParam={panel1.envParam}
                    onEnvParamChange={(e) => setPanel1(prev => ({ ...prev, envParam: e.target.value }))}
                    group={panel1.group}
                    onGroupChange={(e) => setPanel1(prev => ({ ...prev, group: e.target.value }))}
                    rcp={panel1.rcp}
                    onRcpChange={(e) => handleRcpChange(setPanel1, setPanel2, e.target.value)}
                    model={panel1.model}
                    onModelChange={(e) => handleModelChange(setPanel1, setPanel2, e.target.value)}
                    filteredGroups={filterBiomes(panel1.diversity).groups}
                    filteredScenarios={filterBiomes(panel1.diversity).rcp}
                    filteredModels={filterBiomes(panel1.diversity).models}
                    diversityIndices={diversityIndices}
                    environmentalParameters={environmentalParameters}
                    openInfoModal={openInfoModal}
                    tutorialStep={tutorialStep}
                  />
                </Box>

                {/* Lock Icons */}
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'start',
                    gap: 3,
                    mt: 14,
                  }}
                >
                  {/* Scenario lock */}
                  <Box
                    sx={{ cursor: 'pointer', '&:hover': { color: '#1976d2' }, display: 'flex', alignItems: 'center' }}
                    onClick={() => {
                      const newLock = !lockScenario;
                      setLockScenario(newLock);
                      if (newLock) setPanel2(prev => ({ ...prev, rcp: panel1.rcp }));
                    }}
                  >
                    {lockScenario ? <Lock /> : <LockOpen />}
                  </Box>

                  {/* Model lock */}
                  <Box
                    sx={{ cursor: 'pointer', '&:hover': { color: '#1976d2' }, display: 'flex', alignItems: 'center' }}
                    onClick={() => {
                      const newLock = !lockModel;
                      setLockModel(newLock);
                      if (newLock) setPanel2(prev => ({ ...prev, model: panel1.model }));
                    }}
                  >
                    {lockModel ? <Lock /> : <LockOpen />}
                  </Box>
                </Box>

                {/* Right Control Panel */}
                <Box sx={{ flex: 1, minWidth: 200 }}>
                  <ControlPanel
                    source={panel2.source}
                    onSourceChange={(e) => setPanel2(prev => ({ ...prev, source: e.target.value }))}
                    diversity={panel2.diversity}
                    onDiversityChange={(e) => setPanel2(prev => ({ ...prev, diversity: e.target.value }))}
                    envParam={panel2.envParam}
                    onEnvParamChange={(e) => setPanel2(prev => ({ ...prev, envParam: e.target.value }))}
                    group={panel2.group}
                    onGroupChange={(e) => setPanel2(prev => ({ ...prev, group: e.target.value }))}
                    rcp={panel2.rcp}
                    onRcpChange={(e) => handleRcpChange(setPanel2, setPanel1, e.target.value)}
                    model={panel2.model}
                    onModelChange={(e) => handleModelChange(setPanel2, setPanel1, e.target.value)}
                    filteredGroups={filterBiomes(panel2.diversity).groups}
                    filteredScenarios={filterBiomes(panel2.diversity).rcp}
                    filteredModels={filterBiomes(panel2.diversity).models}
                    diversityIndices={diversityIndices}
                    environmentalParameters={environmentalParameters}
                    openInfoModal={openInfoModal}
                    tutorialStep={tutorialStep === 6 ? null : tutorialStep}
                  />
                </Box>
              </Box>
            </Collapse>
          </Box>

          <Box
            sx={{
              flexShrink: 0,
              border: [8].includes(tutorialStep) ? '4px solid #4FC3F7' : 'none',
              boxShadow: [8].includes(tutorialStep) ? '0 0 30px 10px rgba(79,195,247,0.6)' : 'none',
              animation: [8].includes(tutorialStep) ? 'pulse 1.5s infinite' : 'none',
              position: 'relative',
              zIndex: [8].includes(tutorialStep) ? 3000 : 'auto',
            }}
          >
            {/* Combined line plot */}
            <CombinedLinePlot
              point={selectedPoint}
              zoomedArea={area}
              leftSettings={{
                source: panel1.source,
                index: panel1.diversity,
                group: panel1.group,
                scenario: panel1.rcp,
                model: panel1.model,
                envParam: panel1.envParam,
              }}
              rightSettings={{
                source: panel2.source,
                index: panel2.diversity,
                group: panel2.group,
                scenario: panel2.rcp,
                model: panel2.model,
                envParam: panel2.envParam,
              }}
              startYear={2012}
              endYear={2100}
            />
          </Box>
        </Box>

        <Box sx={{ flex: '1 1 500px', minWidth: 500 }}>
          <DataPanel
            panel={panel2}
            setPanel={setPanel2}
            tutorialStep={tutorialStep === 1 ? 1 : null}
            debouncedYear={debouncedYear2}
            debouncedUpdateYear={debouncedUpdateYear2}
            setSelectedPoint={setSelectedPoint}
            setArea={setArea}
            selectedPoint={selectedPoint}
            selectedArea={area}
            lockYear={lockYear}
            onYearChange={(y) => handleYearChange(setPanel2, setPanel1, y)}
            onLockToggle={handleYearLockToggle}
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