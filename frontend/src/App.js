import React, { useState, useMemo, useEffect } from 'react';
import ReferencesButton from './components/ReferencesButton';
import DataPanel from './components/DataPanel';
import Footer from './components/Footer';
import InfoModal from './components/InfoModal';
import debounce from 'lodash/debounce';
import './App.css';
import { Box, Typography, Divider } from '@mui/material';
import { BlueCloudLogo, DEFAULT_URLS } from './constants';
import { Paper, Button } from '@mui/material';
import { alpha } from '@mui/material/styles';

const App = () => {

  const initialPanel = {
    month: 1,
    view: 'map',
    feature: null,
  };

  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [infoModalShortText, setInfoModalShortText] = useState('');
  const [infoModalTitle, setInfoModalTitle] = useState('');

  const [area, setArea] = useState(null);
  const [sharedZoom, setSharedZoom] = useState(null);

  // URL loader state
  const [netcdfUrlInput, setNetcdfUrlInput] = useState(DEFAULT_URLS[0].value);
  const [loadedUrl, setLoadedUrl] = useState(DEFAULT_URLS[0].value);
  const [selectedDefault, setSelectedDefault] = useState(DEFAULT_URLS[0].value);
  const [customUrls, setCustomUrls] = useState([]);

  const allUrls = useMemo(() => {
    return [
      ...DEFAULT_URLS,
      ...customUrls.map(url => ({
        label: url,
        value: url,
      })),
    ];
  }, [customUrls]);

  const [featureOptions, setFeatureOptions] = useState([]);
  const [featuresLoading, setFeaturesLoading] = useState(false);
  const [featuresError, setFeaturesError] = useState(null);

  // Panel state
  const [panel, setPanel] = useState(() => ({ ...initialPanel }));
  const [debouncedMonth, setDebouncedMonth] = useState(initialPanel.month);

  const debouncedUpdateMonth = useMemo(
    () => debounce((v) => setDebouncedMonth(v), 500),
    []
  );
  useEffect(() => () => debouncedUpdateMonth.cancel(), [debouncedUpdateMonth]);

  // Info modal
  const openInfoModal = (title) => {
    setInfoModalShortText('No information available');
    setInfoModalTitle(title);
    setInfoModalOpen(true);
  };
  const closeInfoModal = () => setInfoModalOpen(false);

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
      .finally(() => { if (active) setFeaturesLoading(false); });

    return () => { active = false; };
  }, [loadedUrl]);

  const formatFeatureName = (name) =>
    name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const handleLoad = () => {
    const trimmed = netcdfUrlInput.trim();
    if (!trimmed) return;

    setLoadedUrl(trimmed);

    const matchingDefault = DEFAULT_URLS.find(u => u.value === trimmed);
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
        <Box sx={{ position: 'absolute', top: 25, left: 8, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
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
            Visualisation of CEPHALOPOD
          </Typography>
        </Box>

        <Box><ReferencesButton /></Box>

      </Box>

      <Divider sx={{ bgcolor: 'rgba(255,255,255,0.3)', mt: 1, mb: 2 }} />

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
        <Box sx={{ flexGrow: 1, minWidth: 500 }}>
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
          />
        </Box>
      </Box>

      <Divider sx={{ bgcolor: 'rgba(255,255,255,0.3)', my: 2 }} />
      <Footer />
    </Box>
  );
};

export default App;