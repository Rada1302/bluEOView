import React, { useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import GlobeDisplay from './GlobeDisplay';
import MapDisplay from './MapDisplay';
import { monthNames } from '../constants';
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
    DEFAULT_URLS,
}) => {
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
    const currentFeatureLabel =
        featureOptions.find(f => f.value === panel.feature)?.label ?? panel.feature ?? '';
    const fullTitle = `${currentFeatureLabel} ${isAnnualMean ? 'Annual Mean' : 'in ' + monthNames[panel.month]}`;

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
            {/* Unified Control Panel */}
            <Box sx={{ flex: '0 0 auto', mb: 2 }}>
                <ControlPanel
                    // Feature
                    feature={panel.feature}
                    featureOptions={featureOptions}
                    onFeatureChange={(e) => setPanel(prev => ({ ...prev, feature: e.target.value }))}
                    openInfoModal={openInfoModal}
                    month={panel.month}
                    onMonthChange={handleMonthCommit}
                    // View
                    view={panel.view}
                    onViewChange={(val) => setPanel(prev => ({ ...prev, view: val }))}
                    // URL loader
                    netcdfUrl={netcdfUrlInput}
                    setNetcdfUrl={setNetcdfUrlInput}
                    selectedDefault={selectedDefault}
                    setSelectedDefault={setSelectedDefault}
                    handleLoad={handleLoad}
                    featuresLoading={featuresLoading}
                    featuresError={featuresError}
                    DEFAULT_URLS={DEFAULT_URLS}
                />
            </Box>

            {/* Map / Globe display */}
            <Box
                sx={{
                    flex: '1 1 auto',
                    position: 'relative',
                    width: '100%',
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
                            />
                        )}
                        {panel.view === 'globe' && (
                            <GlobeDisplay
                                month={debouncedMonth}
                                feature={panel.feature}
                                netcdfUrl={netcdfUrl}
                                fullTitle={fullTitle}
                                featureOptions={featureOptions}
                            />
                        )}
                    </>
                ) : (
                    <Typography color="white" sx={{ textAlign: 'center', mt: 5 }}>
                        No valid features available in this dataset.
                    </Typography>
                )}
            </Box>
        </Box>
    );
};

export default DataPanel;