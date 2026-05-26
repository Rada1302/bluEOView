import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Link,
  Button,
  Divider,
  Box,
  Chip,
  Collapse,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { about } from '../constants';

const MetaRow = ({ label, children }) => (
  <Box sx={{ mb: 1 }}>
    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
      {label}
    </Typography>
    <Typography variant="body2" component="div">
      {children}
    </Typography>
  </Box>
);

const ReferencesModal = ({ open, onClose, metadata = {} }) => {
  const [learnMoreOpen, setLearnMoreOpen] = useState(false);
  const hasMeta = Object.keys(metadata).length > 0;

  // Collect extra_attributes separately
  const extra = metadata.extra_attributes || {};

  // Geospatial bounds
  const hasGeospatial = ['geospatial_lat_min', 'geospatial_lat_max', 'geospatial_lon_min', 'geospatial_lon_max']
    .some(k => metadata[k] != null);

  // Time coverage, only show if at least one is present
  const hasTimeCoverage = metadata.time_coverage_start || metadata.time_coverage_end;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>References &amp; Data Courtesy</DialogTitle>

      <DialogContent dividers>

        {/* Hardcoded method paper citation */}
        {about}

        {/* Dataset metadata from backend */}
        {hasMeta && (
          <Box sx={{ mb: 2 }}>
            <Divider sx={{ my: 2 }} />

            {metadata.title && (
              <MetaRow label="Title">{metadata.title}</MetaRow>
            )}

            {metadata.summary && (
              <MetaRow label="Summary">{metadata.summary}</MetaRow>
            )}

            {metadata.description && (
              <MetaRow label="Description">{metadata.description}</MetaRow>
            )}

            {metadata.author && (
              <MetaRow label="Author / Creator">{metadata.author}</MetaRow>
            )}

            {metadata.institution && (
              <MetaRow label="Institution">{metadata.institution}</MetaRow>
            )}

            {metadata.project && (
              <MetaRow label="Project">{metadata.project}</MetaRow>
            )}

            {metadata.source && (
              <MetaRow label="Source">{metadata.source}</MetaRow>
            )}

            {/* Paper / DOI */}
            {(metadata.paper || metadata.doi) && (
              <MetaRow label="Publication">
                {metadata.paper && <span>{metadata.paper} </span>}
                {metadata.doi && (
                  <Link
                    href={metadata.doi.startsWith('http') ? metadata.doi : `https://doi.org/${metadata.doi}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ display: 'block', wordBreak: 'break-all' }}
                  >
                    {metadata.doi}
                  </Link>
                )}
              </MetaRow>
            )}

            {metadata.version && (
              <MetaRow label="Version">{metadata.version}</MetaRow>
            )}

            {metadata.date_created && (
              <MetaRow label="Date Created">{metadata.date_created}</MetaRow>
            )}

            {metadata.license && (
              <MetaRow label="License">{metadata.license}</MetaRow>
            )}

            {metadata.keywords && (
              <MetaRow label="Keywords">
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.25 }}>
                  {metadata.keywords.split(/[,;]+/).map(kw => kw.trim()).filter(Boolean).map(kw => (
                    <Chip key={kw} label={kw} size="small" variant="outlined" />
                  ))}
                </Box>
              </MetaRow>
            )}

            {hasGeospatial && (
              <MetaRow label="Spatial Extent">
                {[
                  metadata.geospatial_lat_min != null && `Lat: ${metadata.geospatial_lat_min} – ${metadata.geospatial_lat_max ?? '?'}`,
                  metadata.geospatial_lon_min != null && `Lon: ${metadata.geospatial_lon_min} – ${metadata.geospatial_lon_max ?? '?'}`,
                ].filter(Boolean).join('   |   ')}
              </MetaRow>
            )}

            {hasTimeCoverage && (
              <MetaRow label="Time Coverage">
                {[metadata.time_coverage_start, metadata.time_coverage_end].filter(Boolean).join(' – ')}
              </MetaRow>
            )}

            {metadata.comment && (
              <MetaRow label="Comment">{metadata.comment}</MetaRow>
            )}

            {metadata.history && (
              <MetaRow label="History">
                <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', fontSize: '0.75rem' }}>
                  {metadata.history}
                </Typography>
              </MetaRow>
            )}

            <MetaRow label="Software Development">
              Backend & Frontend: Rada Kamysheva
            </MetaRow>

            {/* Extra / unrecognised attributes — collapsed under Learn More */}
            {Object.keys(extra).length > 0 && (
              <Box sx={{ mt: 1 }}>
                <Button
                  size="small"
                  onClick={() => setLearnMoreOpen(prev => !prev)}
                  endIcon={learnMoreOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  sx={{ textTransform: 'none', px: 0 }}
                >
                  Learn more
                </Button>
                <Collapse in={learnMoreOpen}>
                  <Box component="dl" sx={{ m: 0, mt: 1, display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 1.5, rowGap: 0.25 }}>
                    {Object.entries(extra).map(([k, v]) => (
                      <React.Fragment key={k}>
                        <Typography component="dt" variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                          {k}
                        </Typography>
                        <Typography component="dd" variant="body2" sx={{ m: 0, wordBreak: 'break-word' }}>
                          {v}
                        </Typography>
                      </React.Fragment>
                    ))}
                  </Box>
                </Collapse>
              </Box>
            )}

          </Box>
        )}

      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReferencesModal;