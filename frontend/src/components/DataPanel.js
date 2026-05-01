import React, { useEffect, useState } from 'react';
import { Box, Alert, Typography, CircularProgress } from '@mui/material';
import GlobeDisplay from './GlobeDisplay';
import MapDisplay from './MapDisplay';
import { monthNames, aboutMean, aboutSD } from '../constants';
import ControlPanel from './ControlPanel';

const DataPanel = ({
    panel,
    setPanel,
    debouncedMonth,
    netcdfUrl,
    debouncedUpdateMonth,
    setArea,
    selectedArea,
    onMonthChange,
    sharedZoom,
    onSharedZoomChange,
    openInfoModal,
    featureOptions = [],
    netcdfUrlInput,
    setNetcdfUrlInput,
    selectedDefault,
    setSelectedDefault,
    handleLoad,
    featuresLoading,
    featuresError,
    allUrls,
}) => {
    const [showStd, setShowStd] = useState(false);

    // Keep feature in sync when featureOptions change
    useEffect(() => {
        if (!featureOptions.length) {
            if (panel.feature !== null) setPanel(prev => ({ ...prev, feature: null }));
            return;
        }
        const exists = featureOptions.some(f => f.value === panel.feature);
        if (!exists) setPanel(prev => ({ ...prev, feature: featureOptions[0].value }));
    }, [featureOptions, panel.feature, setPanel]);

    const isAnnualMean = panel.month === 13;
    const isSpecies = netcdfUrl?.toLowerCase().includes('species');
    const currentFeatureLabel =
        featureOptions.find(f => f.value === panel.feature)?.label ?? panel.feature ?? '';
    const titlePrefix = isSpecies ? 'Habitat Suitability Index ' : '';
    const fullTitle = `${titlePrefix}${currentFeatureLabel} ${isAnnualMean ? 'Annual Mean' : 'in ' + monthNames[panel.month]}`;

    const handleMonthCommit = (val) => {
        setPanel(prev => ({ ...prev, month: val }));
        debouncedUpdateMonth(val);
        onMonthChange?.(val);
    };

    return (
        <Box
            sx={{
                p: 2,
                backgroundColor: 'rgba(0, 0, 0, 0.25)',
                borderRadius: 1,
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                zIndex: 'auto',
            }}
        >
            {/* Control Panel */}
            <Box sx={{ flex: '0 0 auto', mb: 2, alignItems: 'center' }}>
                <ControlPanel
                    feature={panel.feature}
                    featureOptions={featureOptions}
                    onFeatureChange={(e) => setPanel(prev => ({ ...prev, feature: e.target.value }))}
                    openInfoModal={openInfoModal}
                    month={panel.month}
                    onMonthChange={handleMonthCommit}
                    view={panel.view}
                    onViewChange={(val) => setPanel(prev => ({ ...prev, view: val }))}
                    netcdfUrl={netcdfUrlInput}
                    setNetcdfUrl={setNetcdfUrlInput}
                    selectedDefault={selectedDefault}
                    setSelectedDefault={setSelectedDefault}
                    handleLoad={handleLoad}
                    featuresLoading={featuresLoading}
                    featuresError={featuresError}
                    allUrls={allUrls}
                />
            </Box>

            {/* Map / Globe display */}
            <Box
                sx={{
                    flex: '1 1 auto',
                    position: 'relative',
                    width: '100%',
                    minHeight: '400px',
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                {panel.feature ? (
                    <>
                        {panel.view === 'map' && (
                            <MapDisplay
                                month={debouncedMonth}
                                feature={panel.feature}
                                netcdfUrl={netcdfUrl}
                                selectedArea={selectedArea}
                                onZoomedAreaChange={(area) => {
                                    setArea(area);
                                    onSharedZoomChange?.(area);
                                }}
                                zoomedArea={sharedZoom}
                                fullTitle={fullTitle}
                                featureOptions={featureOptions}
                                showStd={showStd}
                                onToggleStd={() => setShowStd(v => !v)}
                                subTitleMean={aboutMean}
                                subTitleSD={aboutSD}
                            />
                        )}
                        {panel.view === 'globe' && (
                            <GlobeDisplay
                                month={debouncedMonth}
                                feature={panel.feature}
                                netcdfUrl={netcdfUrl}
                                fullTitle={fullTitle}
                                featureOptions={featureOptions}
                                showStd={showStd}
                                onToggleStd={() => setShowStd(v => !v)}
                                subTitleMean={aboutMean}
                                subTitleSD={aboutSD}
                            />
                        )}
                    </>
                ) : (
                    <Box
                        sx={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            textAlign: 'center',
                            p: 3
                        }}
                    >
                        {featuresLoading ? (
                            <>
                                <CircularProgress color="primary" sx={{ mb: 2 }} />
                                <Typography variant="h6" color="white">
                                    Loading dataset features...
                                </Typography>
                            </>
                        ) : (
                            <Alert
                                severity="error"
                                sx={{ maxWidth: '600px' }}
                            >
                                {"File not found or not in the correct format: No valid features available in this dataset."}
                            </Alert>
                        )}
                    </Box>
                )}
            </Box>
        </Box>
    );
};

export default DataPanel;