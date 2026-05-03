import React, { useEffect, useState } from 'react';
import { Box, Alert, Typography, CircularProgress } from '@mui/material';
import GlobeDisplay from './GlobeDisplay';
import MapDisplay from './MapDisplay';
import { monthNames, aboutMean, aboutSD } from '../constants';
import ControlPanel from './ControlPanel';
import QualityPanel from './QualityPanel';

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
    const [showObs, setShowObs] = useState(false);

    useEffect(() => {
        if (!featureOptions.length) {
            if (panel.feature !== null) setPanel(prev => ({ ...prev, feature: null }));
            return;
        }
        const exists = featureOptions.some(f => f.value === panel.feature);
        if (!exists) setPanel(prev => ({ ...prev, feature: featureOptions[0].value }));
    }, [featureOptions, panel.feature, setPanel]);

    useEffect(() => { setShowObs(false); }, [netcdfUrl]);

    const isAnnual = panel.month === 13;
    const currentFeatureLabel = featureOptions.find(f => f.value === panel.feature)?.label ?? panel.feature ?? '';
    const fullTitle = `${currentFeatureLabel} ${isAnnual ? 'Annual' : 'in ' + monthNames[panel.month]}`;

    const handleMonthCommit = (val) => {
        setPanel(prev => ({ ...prev, month: val }));
        debouncedUpdateMonth(val);
        onMonthChange?.(val);
    };

    const sharedDisplayProps = {
        month: debouncedMonth,
        feature: panel.feature,
        netcdfUrl: netcdfUrl,
        fullTitle: fullTitle,
        featureOptions,
        showStd,
        onToggleStd: () => setShowStd(v => !v),
        showObs,
        onToggleObs: () => setShowObs(v => !v),
        subTitleMean: aboutMean,
        subTitleSD: aboutSD,
    };

    return (
        <Box sx={{ p: 2, backgroundColor: 'rgba(0, 0, 0, 0.25)', borderRadius: 1, display: 'flex', flexDirection: 'column' }}>
            {/* 50/50 Split Container */}
            <Box sx={{
                display: 'flex',
                flexDirection: 'row',
                gap: 2,
                mb: 2,
                width: '100%',
                alignItems: 'stretch'
            }}>
                {/* Each panel wrapped in a flex: 1 box */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
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

                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <QualityPanel
                        netcdfUrl={netcdfUrlInput}
                        obsType={panel.obsType}
                    />
                </Box>
            </Box>

            {/* Map / Globe display */}
            <Box sx={{ flex: '1 1 auto', position: 'relative', width: '100%', minHeight: '400px' }}>
                {panel.feature ? (
                    <>
                        {panel.view === 'map' && (
                            <MapDisplay
                                {...sharedDisplayProps}
                                selectedArea={selectedArea}
                                onZoomedAreaChange={(area) => { setArea(area); onSharedZoomChange?.(area); }}
                                zoomedArea={sharedZoom}
                            />
                        )}
                        {panel.view === 'globe' && <GlobeDisplay {...sharedDisplayProps} />}
                    </>
                ) : (
                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', p: 3 }}>
                        {featuresLoading ? (
                            <>
                                <CircularProgress color="primary" sx={{ mb: 2 }} />
                                <Typography variant="h6" color="white">Loading dataset features...</Typography>
                            </>
                        ) : (
                            <Alert severity="error" sx={{ maxWidth: '600px' }}>
                                File not found or not in the correct format.
                            </Alert>
                        )}
                    </Box>
                )}
            </Box>
        </Box>
    );
};

export default DataPanel;