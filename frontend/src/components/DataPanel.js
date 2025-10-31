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
}) => {

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
            {/* View Switch */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                <FormControl component="fieldset">
                    <RadioGroup
                        row
                        value={panel.view}
                        onChange={(e) => setPanel({ ...panel, view: e.target.value })}
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

            {/* Year Slider */}
            <Box sx={{ mb: 1, px: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 1 }}>
                    <Typography color="white" variant="subtitle">
                        Month: {panel.month}
                    </Typography>
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
                <MuiSlider
                    min={0}
                    max={12}
                    value={panel.month}
                    onChange={(e, v) => {
                        setPanel(prev => ({ ...prev, month: v }));
                        debouncedUpdateMonth(v);
                        if (onMonthChange) onMonthChange(v);
                    }}
                    valueLabelDisplay="auto"
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
                    />
                )}
                {panel.view === 'globe' && (
                    <GlobeDisplay
                        month={panel.month}
                        onPointClick={(x, y) => setSelectedPoint({ x, y })}
                        selectedPoint={selectedPoint}
                    />
                )}
            </Box>
        </Box>
    );
};

export default DataPanel;
