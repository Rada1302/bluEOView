import React, { useEffect, useState } from 'react';
import {
    Box,
    Typography,
    FormControl,
    RadioGroup,
    FormControlLabel,
    Radio,
    Slider as MuiSlider,
} from '@mui/material';
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
}) => {
    const [localMonth, setLocalMonth] = useState(panel.month);

    useEffect(() => {
        setLocalMonth(panel.month);
    }, [panel.month]);

    useEffect(() => {
        if (!featureOptions.length) {
            if (panel.feature !== null) {
                setPanel(prev => ({ ...prev, feature: null }));
            }
            return;
        }
        const exists = featureOptions.some(f => f.value === panel.feature);
        if (!exists) {
            setPanel(prev => ({ ...prev, feature: featureOptions[0].value }));
        }
    }, [featureOptions, panel.feature, setPanel]);

    const isAnnualMean = panel.month === 13;
    const currentFeatureLabel =
        featureOptions.find(f => f.value === panel.feature)?.label ?? panel.feature ?? '';
    const fullTitle = `${currentFeatureLabel} ${isAnnualMean ? '(Annual Mean)' : 'in ' + monthNames[panel.month]}`;
    const lockTitle = isAnnualMean ? 'Annual Mean' : 'Month: ' + monthNames[panel.month];

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
            {/* Feature Selector */}
            <Box sx={{ flex: '0 0 auto', minWidth: 200, mb: 2 }}>
                <ControlPanel
                    feature={panel.feature}
                    featureOptions={featureOptions}
                    onFeatureChange={(e) =>
                        setPanel(prev => ({ ...prev, feature: e.target.value }))
                    }
                    openInfoModal={openInfoModal}
                />
            </Box>

            {/* Month Slider + View Switch */}
            <Box sx={{ flex: '0 0 auto', mb: 2, px: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, gap: 2 }}>
                    <Typography color="white" variant="subtitle1">{lockTitle}</Typography>
                    <FormControl component="fieldset">
                        <RadioGroup
                            row
                            value={panel.view}
                            onChange={(e) => setPanel(prev => ({ ...prev, view: e.target.value }))}
                        >
                            <FormControlLabel
                                value="map"
                                control={<Radio sx={{ color: 'white', '&.Mui-checked': { color: 'white' } }} />}
                                label={<Typography color="white">Map</Typography>}
                            />
                            <FormControlLabel
                                value="globe"
                                control={<Radio sx={{ color: 'white', '&.Mui-checked': { color: 'white' } }} />}
                                label={<Typography color="white">Globe</Typography>}
                            />
                        </RadioGroup>
                    </FormControl>
                </Box>

                <MuiSlider
                    min={1}
                    max={13}
                    value={localMonth}
                    onChange={(e, v) => setLocalMonth(v)}
                    onChangeCommitted={(e, v) => {
                        setPanel(prev => ({ ...prev, month: v }));
                        debouncedUpdateMonth(v);
                        if (onMonthChange) onMonthChange(v);
                    }}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(v) => monthNames[v]}
                    sx={{ color: '#1976d2' }}
                />
            </Box>

            {/* Map or Globe — explicit height so children can use position:absolute */}
            <Box
                sx={{
                    flex: '1 1 auto',
                    position: 'relative',
                    width: '100%',
                    height: 'calc(100vh - 280px)',
                    minHeight: 400,
                }}
            >
                {panel.feature ? (
                    <>
                        {panel.view === 'map' && (
                            <MapDisplay
                                month={panel.month}
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
                                month={panel.month}
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