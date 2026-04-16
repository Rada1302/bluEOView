import React, { useState, useMemo } from 'react';
import {
  Box,
  FormControl,
  MenuItem,
  Select,
  IconButton,
  Typography,
  Button,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  TextField,
  ListSubheader,
  InputAdornment,
  Slider,
  Collapse,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import PublicIcon from '@mui/icons-material/Public';
import MapIcon from '@mui/icons-material/Map';
import SearchIcon from '@mui/icons-material/Search';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { MONTH_OPTIONS } from '../constants';

const glassSelect = {
  backgroundColor: 'rgba(255,255,255,0.12)',
  backdropFilter: 'blur(12px)',
  borderRadius: 2,
  border: '1px solid rgba(255,255,255,0.25)',
  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
  '& .MuiInputBase-input': { color: '#fff' },
  '& .MuiSvgIcon-root': { color: '#fff' },
  '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
};

const menuProps = {
  PaperProps: {
    sx: {
      backgroundColor: 'rgba(30, 30, 30, 0.9)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255,255,255,0.25)',
      boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      maxHeight: 400,
      '& .MuiMenuItem-root': {
        color: '#fff',
        '&:hover': { backgroundColor: 'rgba(255,255,255,0.15)' },
        '&.Mui-selected': { backgroundColor: 'rgba(255,255,255,0.2)' },
      },
      scrollbarWidth: 'thin',
      scrollbarColor: 'rgba(255,255,255,0.3) transparent',
    },
  },
};

const toggleGroupSx = {
  '& .MuiToggleButton-root': {
    color: 'rgba(255,255,255,0.6)',
    borderColor: 'rgba(255,255,255,0.25)',
    '&.Mui-selected': {
      color: '#fff',
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderColor: 'rgba(255,255,255,0.4)',
    },
    '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' },
  },
};

const RowLabel = ({ children }) => (
  <Typography
    sx={{
      width: 110,
      flexShrink: 0,
      color: 'white',
    }}
  >
    {children}
  </Typography>
);

const UrlControl = ({
  netcdfUrl, setNetcdfUrl,
  selectedDefault, setSelectedDefault,
  handleLoad, featuresLoading, featuresError, featureOptions, allUrls,
}) => {
  const [editing, setEditing] = useState(false);
  const isCustomUrl = !!netcdfUrl && !allUrls.find(u => u.value === netcdfUrl);

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
      {editing ? (
        <TextField
          autoFocus
          size="small"
          value={netcdfUrl}
          onChange={(e) => { setNetcdfUrl(e.target.value); setSelectedDefault(''); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { handleLoad(); setEditing(false); }
            if (e.key === 'Escape') setEditing(false);
          }}
          placeholder="https://…"
          sx={{
            flex: 1, minWidth: 0,
            '& .MuiInputBase-root': { ...glassSelect },
            '& .MuiInputBase-input': { color: '#fff' },
            '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
          }}
        />
      ) : (
        <FormControl size="small" sx={{ ...glassSelect, flex: 1 }}>
          <Select
            value={isCustomUrl ? '__custom__' : (selectedDefault || '')}
            displayEmpty
            renderValue={(value) => {
              if (!value) return '';

              const found = allUrls.find(u => u.value === value);

              if (found && found.label !== found.value) {
                return found.label;
              }

              return (
                <span style={{ fontFamily: 'monospace', fontSize: '0.85em' }}>
                  {value}
                </span>
              );
            }}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedDefault(val);
              setNetcdfUrl(val);
            }}
            MenuProps={menuProps}
          >
            {allUrls.map(opt => (
              <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
            ))}
            {isCustomUrl && (
              <MenuItem value="__custom__" disabled sx={{ fontStyle: 'italic', opacity: 0.6 }}>
                {netcdfUrl}
              </MenuItem>
            )}
          </Select>
        </FormControl>
      )}

      <Button
        size="small"
        sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.3)', '&:hover': { borderColor: '#fff' } }}
        variant="outlined"
        onClick={() => setEditing(v => !v)}
      >
        {editing ? 'Cancel' : 'Edit'}
      </Button>

      <Button
        size="small"
        variant="contained"
        onClick={() => { handleLoad(); setEditing(false); }}
        disabled={featuresLoading || !netcdfUrl.trim()}
      >
        {featuresLoading ? <CircularProgress size={14} /> : 'Load'}
      </Button>

      {featureOptions.length > 0 && !featuresError && (
        <Box sx={{
          width: 8, height: 8, borderRadius: '50%',
          backgroundColor: '#86efac', flexShrink: 0,
          boxShadow: '0 0 6px #86efac',
        }} />
      )}
    </Box>
  );
};

const ControlPanel = ({
  feature, featureOptions = [], onFeatureChange, openInfoModal,
  month, onMonthChange,
  view, onViewChange,
  netcdfUrl, setNetcdfUrl, selectedDefault, setSelectedDefault,
  handleLoad, featuresLoading, featuresError, allUrls = [],
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [open, setOpen] = useState(true);
  const featuresReady = featureOptions.length > 0 && feature != null;

  const displayedOptions = useMemo(() => {
    return [...featureOptions]
      .sort((a, b) => a.label.localeCompare(b.label))
      .filter((opt) => opt.label.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [featureOptions, searchTerm]);

  // Build marks for the slider from MONTH_OPTIONS
  const sliderMarks = MONTH_OPTIONS.map(opt => ({
    value: opt.value,
    label: opt.label.slice(0, 3),
  }));

  const currentMonthLabel = MONTH_OPTIONS.find(o => o.value === month)?.label ?? '';

  return (
    <Box sx={{
      width: '50%',
      backgroundColor: 'rgba(0,0,0,0.25)',
      backdropFilter: 'blur(8px)',
      borderRadius: 1,
      border: '1px solid rgba(255,255,255,0.15)',
      overflow: 'hidden',
    }}>

      {/* Collapsible header */}
      <Box
        onClick={() => setOpen(v => !v)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          px: 2,
          py: 1,
          cursor: 'pointer',
          borderBottom: open ? '1px solid rgba(255,255,255,0.08)' : 'none',
          '&:hover': { backgroundColor: 'rgba(255,255,255,0.04)' },
        }}
      >
        <IconButton sx={{ color: 'white', pr: 3 }}>
          {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
        <Typography sx={{ fontSize: 19 }}>
          Control Panel
        </Typography>
        <ToggleButtonGroup
          value={view}
          exclusive
          size="small"
          onChange={(_, val) => { if (val) onViewChange?.(val); }}
          sx={{ ...toggleGroupSx, ml: 'auto' }}
        >
          <ToggleButton value="map">
            <MapIcon sx={{ fontSize: 16, mr: 0.5 }} />Map
          </ToggleButton>
          <ToggleButton value="globe">
            <PublicIcon sx={{ fontSize: 16, mr: 0.5 }} />Globe
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Collapse in={open}>
        <Box sx={{ px: 2, py: 1.5, display: 'flex', flexDirection: 'column', gap: 2 }}>

          {/* Row 1: Source */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <RowLabel>Source</RowLabel>
            <UrlControl
              netcdfUrl={netcdfUrl} setNetcdfUrl={setNetcdfUrl}
              selectedDefault={selectedDefault} setSelectedDefault={setSelectedDefault}
              handleLoad={handleLoad} featuresLoading={featuresLoading}
              featuresError={featuresError} featureOptions={featureOptions}
              allUrls={allUrls}
            />
          </Box>

          {/* Row 2: Variable */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <RowLabel>Variable</RowLabel>
            {featuresReady ? (
              <FormControl size="small" sx={{ ...glassSelect, flex: 1, borderRadius: 2 }}>
                <Select
                  value={feature}
                  onChange={onFeatureChange}
                  onClose={() => setSearchTerm('')}
                  MenuProps={{ ...menuProps, autoFocus: false }}
                  startAdornment={
                    <IconButton
                      size="small"
                      sx={{ color: '#fff', mr: 0.5 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        const found = featureOptions.find(f => f.value === feature);
                        openInfoModal?.(found?.label ?? feature, feature);
                      }}
                    >
                      <InfoOutlinedIcon fontSize="small" />
                    </IconButton>
                  }
                >
                  <ListSubheader sx={{ bgcolor: 'rgb(45, 45, 45)', p: 1 }}>
                    <TextField
                      size="small"
                      autoFocus
                      placeholder="Search name..."
                      fullWidth
                      value={searchTerm}
                      onKeyDown={(e) => { if (e.key !== 'Escape') e.stopPropagation(); }}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon fontSize="small" sx={{ color: 'rgba(255,255,255,0.5)' }} />
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        '& .MuiInputBase-input': { color: '#fff', fontSize: '0.85rem' },
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
                        '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.4)' },
                      }}
                    />
                  </ListSubheader>
                  {displayedOptions.length > 0 ? (
                    displayedOptions.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                    ))
                  ) : (
                    <MenuItem disabled>No matches found</MenuItem>
                  )}
                </Select>
              </FormControl>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {featuresLoading && <CircularProgress size={14} sx={{ color: 'rgba(255,255,255,0.5)' }} />}
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                  {featuresLoading ? 'Loading…' : 'No variable'}
                </Typography>
              </Box>
            )}
          </Box>


          {/* Row 3: Time Frame */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <RowLabel>Time Frame</RowLabel>
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Slider
                value={month ?? 1}
                min={1}
                max={13}
                step={1}
                marks={sliderMarks}
                onChange={(_, val) => onMonthChange?.(val)}
                sx={{
                  flex: 1,
                  color: '#fff',
                  '& .MuiSlider-thumb': {
                    width: 16,
                    height: 16,
                    backgroundColor: '#fff',
                    '&:hover, &.Mui-focusVisible': { boxShadow: '0 0 0 6px rgba(255,255,255,0.16)' },
                  },
                  '& .MuiSlider-track': { backgroundColor: 'rgba(255,255,255,0.7)', border: 'none' },
                  '& .MuiSlider-rail': { backgroundColor: 'rgba(255,255,255,0.2)' },
                  '& .MuiSlider-markLabel': {
                    color: 'rgba(255,255,255,0.4)',
                    '&.MuiSlider-markLabelActive': { color: 'rgba(255,255,255,0.85)' },
                  },
                  '& .MuiSlider-mark': { backgroundColor: 'rgba(255,255,255,0.3)' },
                  mb: 1.5,
                }}
              />
              <Typography variant="body2" sx={{ color: '#fff', minWidth: 28, textAlign: 'right', fontWeight: 500, pl: 1 }}>
                {currentMonthLabel}
              </Typography>
            </Box>
          </Box>

        </Box>
      </Collapse>
    </Box>
  );
};

export default ControlPanel;