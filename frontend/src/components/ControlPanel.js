import React, { useState, useMemo, useEffect } from 'react';
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
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import PublicIcon from '@mui/icons-material/Public';
import MapIcon from '@mui/icons-material/Map';
import SearchIcon from '@mui/icons-material/Search';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import AddIcon from '@mui/icons-material/Add';
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
  <Typography sx={{ width: 110, flexShrink: 0, color: 'white' }}>
    {children}
  </Typography>
);

// Sentinel value used in the Select to trigger the "add new" flow
const ADD_NEW_SENTINEL = '__add_new__';

const UrlControl = ({
  netcdfUrl,
  selectedDefault,
  triggerLoad, allUrls,
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draftUrl, setDraftUrl] = useState('');
  const [sessionUrls, setSessionUrls] = useState(() => allUrls);

  const handleSelectChange = (e) => {
    const val = e.target.value;
    if (val === ADD_NEW_SENTINEL) {
      setDraftUrl('');
      setDialogOpen(true);
      return;
    }
    triggerLoad(val);
  };

  const handleConfirmNew = () => {
    const trimmed = draftUrl.trim();
    if (!trimmed) return;
    // Persist to session dropdown first
    if (!sessionUrls.find(u => u.value === trimmed)) {
      setSessionUrls(prev => [...prev, { value: trimmed, label: trimmed }]);
    }
    setDialogOpen(false);
    setDraftUrl('');
    triggerLoad(trimmed);
  };

  const handleCancelNew = () => {
    setDialogOpen(false);
    setDraftUrl('');
  };

  const selectedValue = selectedDefault || netcdfUrl || '';

  return (
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <FormControl size="small" sx={{ ...glassSelect, width: '100%' }}>
        <Select
          value={selectedValue}
          displayEmpty
          renderValue={(value) => {
            if (!value || value === '') {
              return <span style={{ opacity: 0.5 }}>Select a source…</span>;
            }
            const found = sessionUrls.find(u => u.value === value);
            if (found && found.label !== found.value) return found.label;
            return (
              <span style={{ fontFamily: 'monospace', fontSize: '0.85em' }}>
                {value}
              </span>
            );
          }}
          onChange={handleSelectChange}
          MenuProps={menuProps}
        >
          {sessionUrls.map(opt => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label !== opt.value
                ? opt.label
                : <span style={{ fontFamily: 'monospace', fontSize: '0.85em' }}>{opt.label}</span>}
            </MenuItem>
          ))}

          <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)', my: 0.5 }} />

          {/* Add new source option */}
          <MenuItem
            value={ADD_NEW_SENTINEL}
            sx={{
              color: 'rgba(255,255,255,0.7) !important',
              gap: 1,
              '&:hover': { color: '#fff !important' },
            }}
          >
            <AddIcon sx={{ fontSize: 16 }} />
            Add new source…
          </MenuItem>
        </Select>
      </FormControl>

      {/* Pop-up dialog for entering a custom URL */}
      <Dialog
        open={dialogOpen}
        onClose={handleCancelNew}
        PaperProps={{
          sx: {
            backgroundColor: 'rgba(20, 20, 20, 0.95)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.2)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            borderRadius: 2,
            minWidth: 420,
          },
        }}
        slotProps={{
          backdrop: { sx: { backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.4)' } },
        }}
      >
        <DialogTitle sx={{ color: '#fff', pb: 1, fontSize: '1rem', fontWeight: 600 }}>
          Add new source
        </DialogTitle>
        <DialogContent sx={{ pb: 1 }}>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', mb: 2 }}>
            Enter a URL to a NetCDF file or OPeNDAP endpoint.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            size="small"
            value={draftUrl}
            onChange={(e) => setDraftUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleConfirmNew();
              if (e.key === 'Escape') handleCancelNew();
            }}
            placeholder="https://…"
            sx={{
              '& .MuiInputBase-root': {
                backgroundColor: 'rgba(255,255,255,0.08)',
                borderRadius: 1.5,
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff',
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                '&:hover': { border: '1px solid rgba(255,255,255,0.35)' },
                '&.Mui-focused': { border: '1px solid rgba(255,255,255,0.5)' },
              },
              '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
              '& .MuiInputBase-input': { color: '#fff' },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button
            size="small"
            onClick={handleCancelNew}
            sx={{
              color: 'rgba(255,255,255,0.5)',
              '&:hover': { color: '#fff', backgroundColor: 'rgba(255,255,255,0.08)' },
            }}
          >
            Cancel
          </Button>
          <Button
            size="small"
            variant="contained"
            onClick={handleConfirmNew}
            disabled={!draftUrl.trim()}
            sx={{
              backgroundColor: 'rgba(255,255,255,0.15)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.3)',
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.25)' },
              '&.Mui-disabled': { color: 'rgba(255,255,255,0.3)', backgroundColor: 'transparent' },
            }}
          >
            Load
          </Button>
        </DialogActions>
      </Dialog>
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

  const [localMonth, setLocalMonth] = useState(month);

  useEffect(() => {
    setLocalMonth(month);
  }, [month]);

  const pendingUrl = React.useRef(null);

  useEffect(() => {
    if (pendingUrl.current !== null) {
      handleLoad(pendingUrl.current);
      pendingUrl.current = null;
    }
  }, [netcdfUrl]);

  const triggerLoad = React.useCallback((url) => {
    pendingUrl.current = url;
    setNetcdfUrl(url);
    setSelectedDefault(url);
  }, [setNetcdfUrl, setSelectedDefault]);

  const featuresReady = featureOptions.length > 0 && feature != null;

  const displayedOptions = useMemo(() => {
    return [...featureOptions]
      .sort((a, b) => a.label.localeCompare(b.label))
      .filter((opt) => opt.label.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [featureOptions, searchTerm]);

  const sliderMarks = MONTH_OPTIONS.map(opt => ({
    value: opt.value,
    label: opt.label.slice(0, 3),
  }));

  const currentMonthLabel = MONTH_OPTIONS.find(o => o.value === localMonth)?.label ?? '';

  return (
    <Box sx={{
      width: '50%',
      backgroundColor: 'rgba(0,0,0,0.25)',
      backdropFilter: 'blur(8px)',
      borderRadius: 1,
      border: '1px solid rgba(255,255,255,0.15)',
      overflow: 'hidden',
    }}>

      <Box
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
        <IconButton onClick={() => setOpen(v => !v)} sx={{ color: 'white', pr: 3 }}>
          {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
        <Typography sx={{ fontSize: 19 }}>Control Panel</Typography>
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

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <RowLabel>Source</RowLabel>
            <UrlControl
              netcdfUrl={netcdfUrl}
              selectedDefault={selectedDefault}
              triggerLoad={triggerLoad}
              allUrls={allUrls}
            />
          </Box>

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

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <RowLabel>Time Frame</RowLabel>
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Slider
                value={localMonth ?? 1}
                min={1}
                max={13}
                step={1}
                marks={sliderMarks}
                onChange={(_, val) => setLocalMonth(val)}
                onChangeCommitted={(_, val) => onMonthChange?.(val)}
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