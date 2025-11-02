import React from 'react';
import {
  Box,
  FormControl,
  MenuItem,
  Select,
  IconButton,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import { featureOptions, featureNames } from '../constants';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

const LabeledSelect = ({
  label,
  id,
  value,
  options,
  onChange,
  infoText,
  openInfoModal,
  useSegmented = true,
}) => (
  <Box sx={{ display: 'flex', flexDirection: 'row', mb: 1, gap: 1 }}>
    {useSegmented ? (
      <Box
        sx={{
          backgroundColor: 'rgba(255, 255, 255, 0.12)',
          backdropFilter: 'blur(12px)',
          borderRadius: 2,
          flex: 1,
          mr: 0.5,
          border: '1px solid rgba(255, 255, 255, 0.25)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
        }}
      >
        <IconButton
          onClick={() => openInfoModal(featureNames[value], value)}
          size="small"
          sx={{ color: 'white', ml: 0.5 }}
        >
          <InfoOutlinedIcon fontSize="small" />
        </IconButton>

        <ToggleButtonGroup
          exclusive
          value={value}
          onChange={(e, newValue) => {
            if (newValue !== null) onChange({ target: { value: newValue } });
          }}
          sx={{
            flex: 1,
            '& .MuiToggleButton-root': {
              color: 'white',
              borderColor: 'rgba(255, 255, 255, 0.2)',
              textTransform: 'none',
              flex: 1,
              fontSize: '0.85rem',
              '&.Mui-selected': {
                backgroundColor: 'rgba(255, 255, 255, 0.25)',
                color: 'white',
              },
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
              },
            },
          }}
        >
          {options.map((opt) => (
            <ToggleButton key={opt.value} value={opt.value}>
              {opt.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>
    ) : (
      <FormControl
        variant="outlined"
        size="small"
        sx={{
          backgroundColor: 'rgba(255, 255, 255, 0.12)',
          backdropFilter: 'blur(12px)',
          borderRadius: 2,
          flex: 1,
          mr: 0.5,
          border: '1px solid rgba(255, 255, 255, 0.25)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          '& .MuiInputBase-input': { color: '#FFFFFF' },
          '& .MuiSvgIcon-root': { color: '#FFFFFF' },
        }}
      >
        <Select
          id={id}
          value={value}
          onChange={onChange}
          startAdornment={
            <IconButton
              onClick={() => openInfoModal(featureNames[value], value)}
              size="small"
              sx={{ color: 'white' }}
            >
              <InfoOutlinedIcon fontSize="small" />
            </IconButton>
          }
          MenuProps={{
            PaperProps: {
              sx: {
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
                '& .MuiMenuItem-root': {
                  color: '#FFFFFF',
                  '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.15)' },
                },
              },
            },
          }}
        >
          {options.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    )}
  </Box>
);

const ControlPanel = ({ feature, onFeatureChange, openInfoModal }) => {
  return (
    <Box
      sx={{
        borderRadius: 1,
        position: 'relative',
      }}
    >
      {/* Feature Selection */}
      <LabeledSelect
        label="Feature"
        id="feature"
        value={feature}
        options={featureOptions}
        onChange={onFeatureChange}
        infoText="Feature general"
        openInfoModal={openInfoModal}
        useSegmented={true}
      />
    </Box>
  );
};

export default ControlPanel;
