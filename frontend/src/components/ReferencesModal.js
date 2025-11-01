import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Link,
  Button,
  List,
  ListItem,
} from '@mui/material';

const ReferencesModal = ({ open, onClose }) => (
  <Dialog open={open} onClose={onClose}>
    <DialogTitle>References &amp; Data Courtesy</DialogTitle>

    <DialogContent dividers>
      <Typography variant="body1">
        Schickele, A., Clerc, C., Benedetti, F., De Angelis, D., Hofmann Elizondo, U., Münnich, M.,
        Irisson, J.-O., &amp; Vogt, M. (2025).{<br></br>}
        <i>
          CEPHALOPOD: A package to standardize marine habitat-modelling practices and enhance
          inter-comparability across biological observations
        </i>.{' '}
        <em>Methods in Ecology and Evolution</em>.{' '}
        <Link
          href="https://doi.org/10.1111/2041-210X.70040"
          target="_blank"
          rel="noopener noreferrer"
        >
          https://doi.org/10.1111/2041-210X.70040
        </Link>
      </Typography>
    </DialogContent>

    <DialogActions>
      <Button onClick={onClose} color="primary">
        Close
      </Button>
    </DialogActions>
  </Dialog>
);

export default ReferencesModal;