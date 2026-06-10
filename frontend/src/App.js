import React, { useState, useMemo, useEffect } from 'react';
import ReferencesButton from './components/ReferencesButton';
import DataPanel from './components/DataPanel';
import Footer from './components/Footer';
import InfoModal from './components/InfoModal';
import debounce from 'lodash/debounce';
import './App.css';
import { Box, Typography, Divider, CircularProgress } from '@mui/material';
import { BlueCloudLogo, welcomeShortText, welcomeLongText } from './constants'; // Removed static DEFAULT_URLS
import { Paper } from '@mui/material';
import { alpha } from '@mui/material/styles';

const App = () => {

  const initialPanel = {
    month: 13,
    view: 'map',
    feature: null,
  };

  const [welcomeOpen, setWelcomeOpen] = useState(
    !localStorage.getItem('hideProjectExplanation')
  );

  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [infoModalShortText, setInfoModalShortText] = useState('');
  const [infoModalTitle, setInfoModalTitle] = useState('');

  const [area, setArea] = useState(null);
  const [sharedZoom, setSharedZoom] = useState(null);

  // --- Dynamic URLs System ---
  const [defaultUrls, setDefaultUrls] = useState([]); // Dynamic container replacing the static list
  const [backendLoading, setBackendLoading] = useState(true);
  const [backendError, setBackendError] = useState(null);

  // URL loader state initialized to safe empty values
  const [netcdfUrlInput, setNetcdfUrlInput] = useState('');
  const [loadedUrl, setLoadedUrl] = useState('');
  const [selectedDefault, setSelectedDefault] = useState('');
  const [customUrls, setCustomUrls] = useState([]);

  // Fetch file directory array from Flask on app startup
  useEffect(() => {
    fetch('/api/datasets') // Update this with your actual Flask domain/port if needed
      .then(res => {
        if (!res.ok) throw new Error(`Server returned status ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (data && data.length > 0) {
          setDefaultUrls(data);

          // Seed the initial parameters with the very first file found in the directory
          const initialFile = data[0].value;
          setNetcdfUrlInput(initialFile);
          setLoadedUrl(initialFile);
          setSelectedDefault(initialFile);
        } else {
          throw new Error("No NetCDF datasets (.nc) found in the target directory.");
        }
      })
      .catch(err => {
        console.error("Error connecting to Flask directory API:", err);
        setBackendError(err.message);
      })
      .finally(() => {
        setBackendLoading(false);
      });
  }, []);

  const allUrls = useMemo(() => {
    const uniqueCustoms = customUrls.filter(
      (url) => !defaultUrls.some((def) => def.value === url)
    );

    return [
      ...defaultUrls,
      ...uniqueCustoms.map(url => ({ label: url, value: url }))
    ];
  }, [customUrls, defaultUrls]); // Added defaultUrls dependency mapping
  // ----------------------------

  const [featureOptions, setFeatureOptions] = useState([]);
  const [featuresLoading, setFeaturesLoading] = useState(false);
  const [featuresError, setFeaturesError] = useState(null);
  const [metaData, setMetaData] = useState([]);
  const [timeLongName, setTimeLongName] = useState(null);
  const [varInfo, setVarInfo] = useState(null);

  // Panel state
  const [panel, setPanel] = useState(() => ({ ...initialPanel }));
  const [debouncedMonth, setDebouncedMonth] = useState(initialPanel.month);
  const debouncedUpdateMonth = useMemo(
    () => debounce((v) => setDebouncedMonth(v), 500),
    []
  );
  useEffect(() => () => debouncedUpdateMonth.cancel(), [debouncedUpdateMonth]);

  // Info modal
  const openInfoModal = (title, shortText) => {
    setInfoModalShortText(shortText || 'No information available');
    setInfoModalTitle(title);
    setInfoModalOpen(true);
  };
  const closeInfoModal = () => setInfoModalOpen(false);

  // Fetch features whenever loadedUrl changes
  useEffect(() => {
    if (!loadedUrl) return; // Safely guards against firing before the Flask hook loads data
    let active = true;

    setFeatureOptions([]);
    setFeaturesError(null);
    setFeaturesLoading(true);
    setTimeLongName(null);
    setVarInfo(null);
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
            target_id: f.target_id ?? null,
            standard_name: f.standard_name ?? null,
            long_name: f.long_name ?? null,
          }));
          setFeatureOptions(options);
          setPanel(prev => ({ ...prev, feature: options[0].value }));
          setMetaData(data.metadata);
          setTimeLongName(data.timeLongName ?? null);
          setVarInfo(data.varInfo ?? null);
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
      .finally(() => { if (active) setFeaturesLoading(false); });

    return () => { active = false; };
  }, [loadedUrl]);

  const formatFeatureName = (name) =>
    name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const handleLoad = () => {
    const trimmed = netcdfUrlInput.trim();
    if (!trimmed) return;

    setLoadedUrl(trimmed);

    const matchingDefault = defaultUrls.find(u => u.value === trimmed);
    setSelectedDefault(matchingDefault?.value ?? '');

    setCustomUrls(prev => {
      if (prev.includes(trimmed)) return prev;
      return [trimmed, ...prev];
    });
  };

  return (
    <Box className="App" sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

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
        <Box sx={{ position: 'absolute', top: 25, left: 8, display: { xs: 'none', sm: 'flex' }, flexDirection: 'column', alignItems: 'flex-start' }}>
          <Paper
            component="a"
            href={BlueCloudLogo.href}
            target="_blank"
            rel="noopener noreferrer"
            elevation={2}
            sx={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 350, height: 70,
              backgroundColor: 'rgba(0, 0, 0, 0.25)',
              borderRadius: 1, textDecoration: 'none',
              transition: 'box-shadow 0.2s ease-in-out',
              '&:hover': { boxShadow: (theme) => theme.shadows[6], backgroundColor: alpha('#000000', 0.03) },
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
            CEPHALOView
          </Typography>
          <Typography variant="h6" sx={{ fontSize: '1.25rem', color: 'white', mt: 0.5 }}>
            Visualisation of <img src="/assets/cephalopod_logo.png" alt="C" style={{ height: '1.2em', verticalAlign: 'middle' }} />EPHALOPOD
          </Typography>
        </Box>

        <Box><ReferencesButton metadata={metaData} /></Box>

      </Box>

      <Divider sx={{ bgcolor: 'rgba(255,255,255,0.3)', mt: 1, mb: 2 }} />

      <InfoModal
        open={welcomeOpen}
        onClose={() => setWelcomeOpen(false)}
        title="Welcome to CEPHALOView"
        shortText={welcomeShortText}
        longText={welcomeLongText}
        buttonText="Get Started"
        showDontShowAgain
      />

      <InfoModal
        open={infoModalOpen}
        onClose={closeInfoModal}
        title={infoModalTitle}
        shortText={infoModalShortText}
      />

      {/* Main content */}
      <Box sx={{
        flexGrow: 1, display: 'flex', flexDirection: 'row', gap: 1, px: 1,
        '@media (max-width: 1000px)': { flexDirection: 'column' }
      }}>
        <Box sx={{ flexGrow: 1, minWidth: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          {backendLoading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, color: 'white' }}>
              <CircularProgress color="inherit" />
              <Typography>Synchronizing dataset structure...</Typography>
            </Box>
          ) : backendError ? (
            <Typography sx={{ color: '#ff6b6b', fontWeight: 'bold' }}>
              Error establishing handshake with file manager: {backendError}
            </Typography>
          ) : (
            <DataPanel
              panel={panel}
              setPanel={setPanel}
              debouncedMonth={debouncedMonth}
              debouncedUpdateMonth={debouncedUpdateMonth}
              setArea={setArea}
              selectedArea={area}
              onMonthChange={(v) => {
                setPanel(prev => ({ ...prev, month: v }));
                debouncedUpdateMonth(v);
              }}
              sharedZoom={sharedZoom}
              onSharedZoomChange={setSharedZoom}
              openInfoModal={openInfoModal}
              netcdfUrl={loadedUrl}
              featureOptions={featureOptions}
              netcdfUrlInput={netcdfUrlInput}
              setNetcdfUrlInput={setNetcdfUrlInput}
              selectedDefault={selectedDefault}
              setSelectedDefault={setSelectedDefault}
              handleLoad={handleLoad}
              featuresLoading={featuresLoading}
              featuresError={featuresError}
              allUrls={allUrls}
              timeLongName={timeLongName}
              varInfo={varInfo}
            />
          )}
        </Box>
      </Box>

      <Divider sx={{ bgcolor: 'rgba(255,255,255,0.3)', my: 2 }} />
      <Footer />
    </Box>
  );
};

export default App;
