import React from 'react';
import {
  Box,
  FormControl,
  MenuItem,
  Select,
  IconButton,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

const LabeledSelect = ({
  label,
  id,
  value,
  options,
  onChange,
  infoText,
  openInfoModal,
}) => (
  <Box sx={{ display: 'flex', flexDirection: 'row', mb: 1, gap: 1 }}>
    <FormControl
      variant="outlined"
      size="small"
      sx={{
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
        backdropFilter: 'blur(12px)',
        borderRadius: 2,
        flex: 1,
        maxWidth: 220,
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
            onClick={() => openInfoModal(label, infoText)}
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

    <IconButton
      onClick={() => openInfoModal(label, infoText)}
      size="small"
      sx={{ color: 'white', p: 0, m: 0 }}
    >
      <InfoOutlinedIcon fontSize="small" />
    </IconButton>
  </Box>
);

const ControlPanel = ({
  variable,
  onVariableChange,
  feature,
  onFeatureChange,
  openInfoModal,
  tutorialStep,
}) => {
  // Dropdown options
  const variableOptions = [
    { label: 'Mean Values', value: 'mean_values' },
    { label: 'Standard Deviation', value: 'sd_values' },
  ];

  const featureOptions = [
    { label: 'Feature 0', value: 0 },
    { label: 'Feature 1', value: 1 },
    { label: 'Feature 2', value: 2 },
    { label: 'Feature 3', value: 3 },
  ];

  return (
    <Box
      sx={{
        px: 2,
        py: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.25)',
        backdropFilter: 'blur(8px)',
        borderRadius: 1,
        position: 'relative',
      }}
    >
      {/* Variable (Mean or SD) */}
      <LabeledSelect
        label="Variable"
        id="variable"
        value={variable}
        options={variableOptions}
        onChange={onVariableChange}
        infoText="Select whether to view mean values or standard deviation."
        openInfoModal={openInfoModal}
      />

      {/* Feature (0–3) */}
      <LabeledSelect
        label="Feature"
        id="feature"
        value={feature}
        options={featureOptions}
        onChange={onFeatureChange}
        infoText="Choose which feature (0–3) to visualize."
        openInfoModal={openInfoModal}
      />
      
    </Box>
  );
};

export default ControlPanel;
