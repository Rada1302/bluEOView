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
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import PublicIcon from '@mui/icons-material/Public';
import MapIcon from '@mui/icons-material/Map';
import SearchIcon from '@mui/icons-material/Search';
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

const RowLabel = ({ children }) => (
  <Typography variant="caption" sx={{ width: 80, flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.5)' }}>
    {children}
  </Typography>
);

const UrlControl = ({
  netcdfUrl, setNetcdfUrl,
  selectedDefault, setSelectedDefault,
  handleLoad, featuresLoading, featuresError, featureOptions, DEFAULT_URLS,
}) => {
  const [editing, setEditing] = useState(false);
  const isCustomUrl = !!netcdfUrl && !DEFAULT_URLS.find(u => u.value === netcdfUrl);

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
        <FormControl size="small" sx={{ ...glassSelect, flex: 1, minWidth: 0 }}>
          <Select
            value={isCustomUrl ? '__custom__' : (selectedDefault || '')}
            displayEmpty
            renderValue={() => {
              if (isCustomUrl) return <span style={{ fontFamily: 'monospace', fontSize: '0.85em' }}>{netcdfUrl}</span>;
              const found = DEFAULT_URLS.find(u => u.value === selectedDefault);
              return found?.label ?? '';
            }}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedDefault(val);
              setNetcdfUrl(val);
            }}
            MenuProps={menuProps}
          >
            {DEFAULT_URLS.map(opt => (
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

      <Button size="small" sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.3)', '&:hover': { borderColor: '#fff' } }} variant="outlined" onClick={() => setEditing(v => !v)}>
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
        <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#86efac', flexShrink: 0, boxShadow: '0 0 6px #86efac' }} />
      )}
    </Box>
  );
};

const ControlPanel = ({
  feature, featureOptions = [], onFeatureChange, openInfoModal,
  month, onMonthChange,
  view, onViewChange,
  netcdfUrl, setNetcdfUrl, selectedDefault, setSelectedDefault,
  handleLoad, featuresLoading, featuresError, DEFAULT_URLS = [],
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const featuresReady = featureOptions.length > 0 && feature != null;

  // Sort alphabetically and Filter by search term
  const displayedOptions = useMemo(() => {
    return [...featureOptions]
      .sort((a, b) => a.label.localeCompare(b.label))
      .filter((opt) => opt.label.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [featureOptions, searchTerm]);

  return (
    <Box sx={{
      px: 2, py: 1.5,
      display: 'flex', flexDirection: 'column', gap: 1,
      width: '65%',
      backgroundColor: 'rgba(0,0,0,0.25)',
      backdropFilter: 'blur(8px)',
      borderRadius: 1,
      border: '1px solid rgba(255,255,255,0.15)',
    }}>

      {/* Row 1: Source */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <RowLabel>Source</RowLabel>
        <UrlControl
          netcdfUrl={netcdfUrl} setNetcdfUrl={setNetcdfUrl}
          selectedDefault={selectedDefault} setSelectedDefault={setSelectedDefault}
          handleLoad={handleLoad} featuresLoading={featuresLoading}
          featuresError={featuresError} featureOptions={featureOptions}
          DEFAULT_URLS={DEFAULT_URLS}
        />
        <ToggleButtonGroup
          value={view} exclusive size="small"
          onChange={(_, val) => { if (val) onViewChange?.(val); }}
          sx={{
            '& .MuiToggleButton-root': {
              color: 'rgba(255,255,255,0.6)',
              borderColor: 'rgba(255,255,255,0.25)',
              '&.Mui-selected': { color: '#fff', backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.4)' },
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' },
            },
          }}
        >
          <ToggleButton value="map"><MapIcon sx={{ fontSize: 16, mr: 0.5 }} />Map</ToggleButton>
          <ToggleButton value="globe"><PublicIcon sx={{ fontSize: 16, mr: 0.5 }} />Globe</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Row 2: Time Frame */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <RowLabel>Time Frame</RowLabel>
        <FormControl size="small" sx={{ ...glassSelect, minWidth: 160, borderRadius: 2 }}>
          <Select value={month ?? 1} onChange={(e) => onMonthChange?.(e.target.value)} MenuProps={menuProps}>
            {MONTH_OPTIONS.map(opt => (
              <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Row 3: Variable */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <RowLabel>Variable</RowLabel>
        {featuresReady ? (
          <FormControl size="small" sx={{ ...glassSelect, minWidth: 180, borderRadius: 2 }}>
            <Select
              value={feature}
              onChange={onFeatureChange}
              onClose={() => setSearchTerm("")}
              MenuProps={{
                ...menuProps,
                autoFocus: false,
              }}
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
              {/* Search Header */}
              <ListSubheader sx={{ bgcolor: 'rgb(45, 45, 45)', p: 1 }}>
                <TextField
                  size="small"
                  autoFocus
                  placeholder="Search name..."
                  fullWidth
                  value={searchTerm}
                  onKeyDown={(e) => {
                    if (e.key !== 'Escape') {
                      // Prevents Select from closing when user presses Space
                      e.stopPropagation();
                    }
                  }}
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
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
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

    </Box>
  );
};

export default ControlPanel;