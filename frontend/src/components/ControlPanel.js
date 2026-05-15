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
  Radio,
  RadioGroup,
  FormControlLabel,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import PublicIcon from '@mui/icons-material/Public';
import MapIcon from '@mui/icons-material/Map';
import SearchIcon from '@mui/icons-material/Search';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import AddIcon from '@mui/icons-material/Add';
import { MONTH_OPTIONS, aboutGeneration } from '../constants';

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

const ADD_NEW_SENTINEL = '__add_new__';

const UrlControl = ({ netcdfUrl, selectedDefault, triggerLoad, allUrls }) => {
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
            if (!value || value === '') return <span style={{ opacity: 0.5 }}>Select a source…</span>;
            const found = sessionUrls.find(u => u.value === value);
            if (found && found.label !== found.value) return found.label;
            return (
              <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', direction: 'rtl', textAlign: 'left', fontFamily: 'monospace', fontSize: '0.85em' }}>
                <bdi>{value}</bdi>
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
          <MenuItem
            value={ADD_NEW_SENTINEL}
            sx={{ color: 'rgba(255,255,255,0.7) !important', gap: 1, '&:hover': { color: '#fff !important' } }}
          >
            <AddIcon sx={{ fontSize: 16 }} /> Add new source…
          </MenuItem>
        </Select>
      </FormControl>

      <Dialog
        open={dialogOpen}
        onClose={handleCancelNew}
        maxWidth="sm"
        fullWidth
        sx={{
          '& .MuiPaper-root': {
            backgroundColor: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(4px)',
          },
        }}
      >
        <DialogTitle>Add new source</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Enter a URL to a NetCDF file.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            size="small"
            value={draftUrl}
            onChange={(e) => setDraftUrl(e.target.value)}
            placeholder="https://…"
            inputProps={{ style: { fontFamily: 'monospace' } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelNew}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleConfirmNew}
            disabled={!draftUrl.trim()}
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
  showStd = false, onToggleStd,
  showObs = false, onToggleObs,
  hasObs = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [open, setOpen] = useState(true);
  const [localMonth, setLocalMonth] = useState(month);

  useEffect(() => { setLocalMonth(month); }, [month]);

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

  const isAnnual = localMonth === 13;
  const sliderMarks = MONTH_OPTIONS
    .filter(opt => opt.value !== 13)
    .map(opt => ({ value: opt.value, label: opt.label.slice(0, 3) }));
  const currentMonthLabel = MONTH_OPTIONS.find(o => o.value === localMonth)?.label ?? '';

  const handleAnnualToggle = (toAnnual) => {
    const next = toAnnual ? 13 : 1;
    setLocalMonth(next);
    onMonthChange?.(next);
  };

  return (
    <Box sx={{
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0,0,0,0.25)',
      backdropFilter: 'blur(8px)',
      borderRadius: 1,
      border: '1px solid rgba(255,255,255,0.15)',
      overflow: 'hidden',
    }}>
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        px: 2,
        py: 1,
        cursor: 'pointer',
        borderBottom: open ? '1px solid rgba(255,255,255,0.08)' : 'none',
        '&:hover': { backgroundColor: 'rgba(255,255,255,0.04)' },
      }}>
        <IconButton onClick={() => setOpen(v => !v)} sx={{ color: 'white', pr: 3 }}>
          {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
        <Typography sx={{ fontSize: 19 }}>Control Panel</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto' }}>
          <Button
            size="small"
            onClick={onToggleStd}
            variant="outlined"
            sx={{
              color: '#fff',
              borderColor: 'rgba(255,255,255,0.25)',
              backgroundColor: showStd ? 'rgba(60,80,120,0.85)' : 'rgba(30,30,30,0.75)',
              backdropFilter: 'blur(4px)',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.04em',
              py: '9px',
              '&:hover': { borderColor: 'rgba(255,255,255,0.4)', backgroundColor: showStd ? 'rgba(70,90,140,0.9)' : 'rgba(50,50,50,0.85)' },
            }}
          >
            {showStd ? '✕ Hide SD' : '+ Show SD'}
          </Button>
          {hasObs && (
            <Button
              size="small"
              onClick={onToggleObs}
              variant="outlined"
              sx={{
                color: '#fff',
                borderColor: 'rgba(255,255,255,0.25)',
                backgroundColor: showObs ? 'rgba(60,80,120,0.85)' : 'rgba(30,30,30,0.75)',
                backdropFilter: 'blur(4px)',
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.04em',
                py: '9px',
                '&:hover': { borderColor: 'rgba(255,255,255,0.4)', backgroundColor: showObs ? 'rgba(70,90,140,0.9)' : 'rgba(50,50,50,0.85)' },
              }}
            >
              {showObs ? '✕ Hide Obs' : '+ Show Obs'}
            </Button>
          )}
          <ToggleButtonGroup
            value={view}
            exclusive
            size="small"
            onChange={(_, val) => { if (val) onViewChange?.(val); }}
            sx={{ ...toggleGroupSx }}
          >
            <ToggleButton value="map"><MapIcon sx={{ fontSize: 16, mr: 0.5 }} />Map</ToggleButton>
            <ToggleButton value="globe"><PublicIcon sx={{ fontSize: 16, mr: 0.5 }} />Globe</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      <Collapse in={open}>
        <Box sx={{ px: 2, py: 1.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography sx={{ fontSize: 16, color: 'rgba(255,255,255,0.7)' }}>{aboutGeneration}</Typography>

          {/* Source */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <RowLabel>Source</RowLabel>
            <UrlControl
              netcdfUrl={netcdfUrl}
              selectedDefault={selectedDefault}
              triggerLoad={triggerLoad}
              allUrls={allUrls}
            />
          </Box>

          {/* Variable */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <RowLabel>Variable</RowLabel>
            {featuresReady ? (
              <FormControl size="small" sx={{ ...glassSelect, flex: 1, borderRadius: 2 }}>
                <Select
                  value={feature}
                  onChange={onFeatureChange}
                  onClose={() => setSearchTerm('')}
                  MenuProps={{ ...menuProps, autoFocus: false }}
                  renderValue={(value) => {
                    const found = featureOptions.find(f => f.value === value);
                    if (!found) return <span style={{ opacity: 0.5 }}>Select a variable…</span>;
                    return (
                      <span>
                        {found.label}
                        {found.target_id != null && (
                          <span style={{ marginLeft: 6, opacity: 0.45, fontSize: '0.82em', fontFamily: 'monospace' }}>
                            [{found.target_id}]
                          </span>
                        )}
                      </span>
                    );
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
                  <ListSubheader sx={{ bgcolor: 'rgb(45, 45, 45)', p: 1 }}>
                    <TextField
                      size="small"
                      autoFocus
                      placeholder="Search name..."
                      fullWidth
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={(e) => e.stopPropagation()}
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
                      }}
                    />
                  </ListSubheader>

                  {displayedOptions.length > 0
                    ? displayedOptions.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        {opt.label}
                        {opt.target_id != null && (
                          <Typography component="span" sx={{ ml: 1, color: 'rgba(255,255,255,0.4)', fontSize: '0.78em', fontFamily: 'monospace' }}>
                            [{opt.target_id}]
                          </Typography>
                        )}
                      </MenuItem>
                    ))
                    : <MenuItem disabled>No matches found</MenuItem>
                  }
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

          {/* Time Frame */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <RowLabel>Time Frame</RowLabel>
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
              <RadioGroup
                value={isAnnual ? 'annual' : 'monthly'}
                onChange={(e) => handleAnnualToggle(e.target.value === 'annual')}
                sx={{ flexShrink: 0 }}
              >
                {['Annual', 'Monthly'].map((opt) => (
                  <FormControlLabel
                    key={opt}
                    value={opt.toLowerCase()}
                    control={
                      <Radio
                        size="small"
                        sx={{
                          color: 'rgba(255,255,255,0.5)',
                          '&.Mui-checked': { color: '#fff' },
                          py: 0.25,
                        }}
                      />
                    }
                    label={<Typography sx={{ color: '#fff', fontSize: '0.85rem' }}>{opt}</Typography>}
                  />
                ))}
              </RadioGroup>
              <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1, opacity: isAnnual ? 0.3 : 1, pointerEvents: isAnnual ? 'none' : 'auto' }}>
                <Slider
                  value={isAnnual ? 1 : (localMonth ?? 1)}
                  min={1}
                  max={12}
                  step={1}
                  marks={sliderMarks}
                  onChange={(_, val) => setLocalMonth(val)}
                  onChangeCommitted={(_, val) => onMonthChange?.(val)}
                  sx={{
                    flex: 1,
                    color: '#fff',
                    mb: 1.5,
                    '& .MuiSlider-markLabel': {
                      color: 'rgba(255,255,255,0.7)',
                      fontSize: '0.75rem',
                    },
                    '& .MuiSlider-markLabelActive': {
                      color: '#fff',
                      fontWeight: 'bold',
                    },
                  }}
                />
                <Typography
                  variant="body2"
                  sx={{ color: '#fff', minWidth: 28, textAlign: 'right', fontWeight: 500, pl: 1, mb: 1.5 }}
                >
                  {isAnnual ? '' : currentMonthLabel}
                </Typography>
              </Box>
            </Box>
          </Box>

        </Box>
      </Collapse>
    </Box>
  );
};

export default ControlPanel;