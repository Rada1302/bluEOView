import React, { useState } from 'react';
import { Button, Box } from '@mui/material';
import ReferencesModal from './ReferencesModal';

const ReferencesButton = ({ sx, ...buttonProps }) => {
  const [open, setOpen] = useState(false);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  return (
    <Box sx={{
      position: 'absolute',
      top: '15%',
      right: 16,
      gap: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      flexWrap: 'wrap',
    }}>
      <Button
        onClick={handleOpen}
        sx={{
          color: 'white',
          textTransform: 'none',
          p: 0,
          fontSize: 17,
          '&:hover': {
            backgroundColor: 'transparent',
            textDecoration: 'underline',
          },
          ...sx,
        }}
        {...buttonProps}
      >
        References&nbsp;&amp;&nbsp;Data&nbsp;Courtesy
      </Button>
      <ReferencesModal open={open} onClose={handleClose} />
    </Box>
  );
};

export default ReferencesButton;
