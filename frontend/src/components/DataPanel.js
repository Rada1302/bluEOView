import React from 'react';
import {
    Box,
    Typography,
    FormControl,
    RadioGroup,
    FormControlLabel,
    Radio,
    Slider as MuiSlider,
} from '@mui/material';
import { Lock, LockOpen } from '@mui/icons-material';
import GlobeDisplay from './GlobeDisplay';
import MapDisplay from './MapDisplay';
import { monthNames, featureNames } from '../constants';
import ControlPanel from './ControlPanel';

const DataPanel = ({
    panel,
    setPanel,
    debouncedMonth,
    debouncedUpdateMonth,
    setSelectedPoint,
    setArea,
    selectedPoint,
    selectedArea,
    lockMonth,
    onMonthChange,
    onLockToggle,
    sharedZoom,
    onSharedZoomChange,
    openInfoModal,
}) => {

    const [localMonth, setLocalMonth] = React.useState(panel.month);
    const isAnnualMean = panel.month === 13;
    const fullTitle = `${featureNames[panel.feature]} ${isAnnualMean ? (" (Annual Mean)") : "in " + monthNames[panel.month]}`;
    const lockTitle = `${isAnnualMean ? "Annual Mean" : "Month: " + monthNames[panel.month]}`;

    React.useEffect(() => {
        setLocalMonth(panel.month);
    }, [panel.month]);

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
            <Box sx={{ flex: 1, minWidth: 200 }}>
                <ControlPanel
                    feature={panel.feature}
                    onFeatureChange={(e) => setPanel(prev => ({ ...prev, feature: e.target.value }))}
                    openInfoModal={openInfoModal}
                />
            </Box>

            {/* Month Slider */}
            <Box sx={{ mb: 1, px: 1 }}>
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        mb: 1,
                        gap: 2,
                    }}
                >
                    {/* Month + Lock */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography color="white" variant="subtitle"> {lockTitle} </Typography>
                        <Box
                            sx={{
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                color: 'white',
                                '&:hover': { color: '#1976d2' },
                            }}
                            onClick={() => onLockToggle && onLockToggle()}
                        >
                            {lockMonth ? <Lock /> : <LockOpen />}
                        </Box>
                    </Box>

                    {/* Map/Globe View Switch */}
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <FormControl component="fieldset">
                            <RadioGroup
                                row
                                value={panel.view}
                                onChange={(e) => setPanel({ ...panel, view: e.target.value })}
                            >
                                <FormControlLabel
                                    value="map"
                                    control={
                                        <Radio
                                            sx={{
                                                color: 'white',
                                                '&.Mui-checked': { color: 'white' },
                                            }}
                                        />
                                    }
                                    label={<Typography color="white">Map</Typography>}
                                />
                                <FormControlLabel
                                    value="globe"
                                    control={
                                        <Radio
                                            sx={{
                                                color: 'white',
                                                '&.Mui-checked': { color: 'white' },
                                            }}
                                        />
                                    }
                                    label={<Typography color="white">Globe</Typography>}
                                />
                            </RadioGroup>
                        </FormControl>
                    </Box>
                </Box>
                <MuiSlider
                    min={1}
                    max={13}
                    value={localMonth}
                    onChange={(e, v) => {
                        setLocalMonth(v);
                    }}
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

            {/* Display Map or Globe */}
            <Box sx={{ width: '100%', height: 400, position: 'relative' }}>
                {panel.view === 'map' && (
                    <MapDisplay
                        month={panel.month}
                        feature={panel.feature}
                        onPointClick={(x, y) => setSelectedPoint({ x, y })}
                        selectedPoint={selectedPoint}
                        selectedArea={selectedArea}
                        onZoomedAreaChange={(area) => {
                            setArea(area);
                            onSharedZoomChange?.(area);
                        }}
                        zoomedArea={sharedZoom}
                        fullTitle={fullTitle}
                    />
                )}
                {panel.view === 'globe' && (
                    <GlobeDisplay
                        month={panel.month}
                        feature={panel.feature}
                        onPointClick={(x, y) => setSelectedPoint({ x, y })}
                        selectedPoint={selectedPoint}
                        fullTitle={fullTitle}
                    />
                )}
            </Box>
        </Box >
    );
};

export default DataPanel;
