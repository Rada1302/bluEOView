import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Link,
  Button,
} from '@mui/material';
// TODO: Fill in references content

const ReferencesModal = ({ open, onClose }) => (
  <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
    <DialogTitle>References &amp; Data Courtesy</DialogTitle>

    <DialogContent dividers>

    </DialogContent>

    <DialogActions>
      <Button onClick={onClose} color="primary">
        Close
      </Button>
    </DialogActions>
  </Dialog>
);

export default ReferencesModal;
