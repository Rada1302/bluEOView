import React, { useCallback, useEffect, useState } from 'react';
import { Box, Alert, Typography, CircularProgress } from '@mui/material';
import GlobeDisplay from './GlobeDisplay';
import MapDisplay from './MapDisplay';
import { monthNames, aboutMean, aboutSD, SD_THRESHOLD } from '../constants';
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

    const [mapData, setMapData] = useState(null);
    const [dataLoading, setDataLoading] = useState(false);
    const [dataError, setDataError] = useState(null);

    useEffect(() => { setShowObs(false); }, [netcdfUrl]);

    useEffect(() => {
        if (!featureOptions.length) {
            if (panel.feature !== null) setPanel(prev => ({ ...prev, feature: null }));
            return;
        }
        const exists = featureOptions.some(f => f.value === panel.feature);
        if (!exists) setPanel(prev => ({ ...prev, feature: featureOptions[0].value }));
    }, [featureOptions, panel.feature, setPanel]);

    useEffect(() => {
        if (!panel.feature || !netcdfUrl) return;

        const controller = new AbortController();

        const fetchData = async () => {
            setDataLoading(true);
            setDataError(null);
            try {
                const params = new URLSearchParams({
                    feature: panel.feature,
                    timeIndex: debouncedMonth.toString(),
                    file: netcdfUrl,
                });
                const res = await fetch(`/api/diversity-map?${params}`, {
                    signal: controller.signal,
                });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const json = await res.json();

                const sdGlobalMax = json.sdGlobalMax ?? json.sdMax ?? null;
                const sdPct = (sdGlobalMax > 0 && json.sd?.length)
                    ? json.sd.map(row =>
                        row.map(v => v === null ? null : Math.round(v / sdGlobalMax * 100 * 10) / 10)
                    )
                    : (json.sd ?? []);

                setMapData({
                    lats: json.lats ?? [],
                    lons: json.lons ?? [],
                    mean: json.mean ?? [],
                    sdPct,
                    obs: json.obs ?? [],
                    obsMax: json.obsMax ?? null,
                    obsType: json.obsType ?? null,
                    hasObs: json.hasObs ?? false,
                    minValue: json.minValue ?? null,
                    maxValue: json.maxValue ?? null,
                });
            } catch (err) {
                if (err.name !== 'AbortError') setDataError(err.message);
            } finally {
                setDataLoading(false);
            }
        };

        fetchData();
        return () => controller.abort();
    }, [debouncedMonth, panel.feature, netcdfUrl]);

    const isAnnual = panel.month === 13;
    const currentFeatureLabel =
        featureOptions.find(f => f.value === panel.feature)?.label ?? panel.feature ?? '';
    const fullTitle = `${currentFeatureLabel} ${isAnnual ? 'Annual' : 'in ' + monthNames[panel.month]}`;

    const handleMonthCommit = useCallback((val) => {
        setPanel(prev => ({ ...prev, month: val }));
        debouncedUpdateMonth(val);
        onMonthChange?.(val);
    }, [setPanel, debouncedUpdateMonth, onMonthChange]);

    const sharedDisplayProps = {
        fullTitle,
        featureOptions,
        mapData,
        showStd,
        onToggleStd: () => setShowStd(v => !v),
        showObs,
        onToggleObs: () => setShowObs(v => !v),
        subTitleMean: aboutMean,
        subTitleSD: aboutSD,
        loading: dataLoading,
        error: dataError,
    };

    return (
        <Box sx={{ p: 2, backgroundColor: 'rgba(0, 0, 0, 0.25)', borderRadius: 1, display: 'flex', flexDirection: 'column' }}>
            <Box sx={{
                display: 'flex',
                flexDirection: 'row',
                gap: 2,
                mb: 2,
                width: '100%',
                alignItems: 'stretch',
            }}>
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
                        {panel.view === 'globe' && (
                            <GlobeDisplay {...sharedDisplayProps} />
                        )}
                    </>
                ) : (
                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', p: 3 }}>
                        {(featuresLoading || dataLoading) ? (
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