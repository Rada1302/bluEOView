import React from 'react';
import {
  Box,
  FormControl,
  MenuItem,
  Select,
  IconButton,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

const ControlPanel = ({ feature, featureOptions = [], onFeatureChange, openInfoModal }) => {
  // Don't render until we have options and a valid selection
  if (!featureOptions.length || feature == null) {
    return (
      <Box sx={{
        height: 40,
        display: 'flex',
        alignItems: 'center',
        color: 'rgba(255,255,255,0.5)',
        fontSize: '0.9rem',
        pl: 1,
      }}>
        {featureOptions.length === 0 ? 'Loading features...' : 'Selecting feature...'}
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 1 }}>
      <IconButton
        onClick={() => {
          const found = featureOptions.find(f => f.value === feature);
          openInfoModal?.(found?.label ?? feature, feature);
        }}
        size="small"
        sx={{ color: 'white', flexShrink: 0 }}
      >
        <InfoOutlinedIcon fontSize="small" />
      </IconButton>

      <FormControl
        variant="outlined"
        size="small"
        sx={{
          flex: 1,
          backgroundColor: 'rgba(255, 255, 255, 0.12)',
          backdropFilter: 'blur(12px)',
          borderRadius: 2,
          border: '1px solid rgba(255, 255, 255, 0.25)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          '& .MuiInputBase-input': { color: '#FFFFFF' },
          '& .MuiSvgIcon-root': { color: '#FFFFFF' },
          '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
        }}
      >
        <Select
          value={feature}
          onChange={onFeatureChange}
          MenuProps={{
            PaperProps: {
              sx: {
                maxHeight: 400,
                backgroundColor: 'rgba(30, 30, 50, 0.97)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
                '& .MuiMenuItem-root': {
                  color: '#FFFFFF',
                  fontSize: '0.85rem',
                  '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.15)' },
                  '&.Mui-selected': { backgroundColor: 'rgba(255, 255, 255, 0.2)' },
                },
              },
            },
          }}
        >
          {featureOptions.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};

export default ControlPanel;