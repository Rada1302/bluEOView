import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  IconButton, 
  Typography, 
  Box,
  CircularProgress
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LaunchIcon from '@mui/icons-material/Launch';

const WormsModal = ({ open, onClose, wormsId, speciesName, clickPosition }) => {
  const [loading, setLoading] = useState(false);
  const [classification, setClassification] = useState([]);
  const [error, setError] = useState(null);

  // Secure HTTPS link to the WoRMS portal
  const wormsUrl = `https://www.marinespecies.org/aphia.php?p=taxdetails&id=${wormsId}`;

  // Function to open the link in a dedicated browser pop-up window
  const handleOpenPopup = (event) => {
    event.preventDefault();
    
    // Define the popup window dimensions and features
    const width = 1000;
    const height = 800;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    window.open(
      wormsUrl,
      `worms_popup_${wormsId}`,
      `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes,status=yes`
    );
  };

  useEffect(() => {
    if (!open || !wormsId) return;

    const fetchWormsData = async () => {
      setLoading(true);
      setError(null);
      setClassification([]);

      try {
        const secureUrl = `https://www.marinespecies.org/rest/AphiaClassificationByAphiaID/${wormsId}`;
        
        const response = await fetch(secureUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Registry returned status code: ${response.status}`);
        }

        const data = await response.json();
        
        if (data && typeof data === 'object') {
          const flatTree = [];
          let current = data;
          
          while (current && current.rank) {
            flatTree.unshift({ 
              rank: current.rank, 
              scientificname: current.scientificname 
            });
            current = current.child;
          }
          
          setClassification(flatTree);
        } else {
          setError("Taxon details or classification not found in WoRMS registry.");
        }
      } catch (err) {
        console.error("Direct connection to secure WoRMS database failed:", err);
        setError("Failed to retrieve data from the WoRMS API backend.");
      } finally {
        setLoading(false);
      }
    };

    fetchWormsData();
  }, [open, wormsId]);

  if (!wormsId) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: {
          position: 'absolute',
          top: clickPosition ? `${clickPosition.y}px` : '50%',
          left: clickPosition ? `${clickPosition.x}px` : '50%',
          transform: clickPosition ? 'none' : 'translate(-50%, -50%)', 
          margin: 0,
          maxHeight: '40vh', 
          backgroundColor: '#ffffff', 
          color: 'text.primary',      
          borderRadius: 2,
          boxShadow: 3,                
        },
      }}
    >
      {/* Modal Header */}
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="subtitle1" component="div" sx={{ fontWeight: 'bold', lineHeight: 1.2, color: 'text.primary' }}>
            WoRMS ID: {` ${wormsId}`}
          </Typography>
          <Typography 
            component="a" 
            href={wormsUrl} 
            onClick={handleOpenPopup} // 🌟 Triggers the pop-up window configuration
            sx={{ 
              fontSize: '0.75rem', 
              color: '#1976d2', 
              textDecoration: 'none', 
              cursor: 'pointer',
              '&:hover': { textDecoration: 'underline' }, 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: 0.5, 
              mt: 0.5 
            }}
          >
            WoRMS web entry <LaunchIcon sx={{ fontSize: '0.75rem' }} />
          </Typography>
        </Box>
        
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ color: 'text.secondary', '&:hover': { color: '#d32f2f' }, p: 0.5 }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      {/* Main Content Layout */}
      <DialogContent dividers sx={{ p: 2, borderColor: 'rgba(0, 0, 0, 0.12)', overflowY: 'auto' }}>
        {loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 2, gap: 2 }}>
            <CircularProgress size={24} sx={{ color: '#1976d2' }} />
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>Querying Marine Registry...</Typography>
          </Box>
        )}

        {error && !loading && (
          <Typography variant="body2" sx={{ color: '#d32f2f', textAlign: 'center', py: 1 }}>{error}</Typography>
        )}

        {!loading && !error && (
          <Box>
            {classification.length > 0 ? (
              <Box 
                sx={{ 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  alignItems: 'center', 
                  rowGap: 1, 
                  columnGap: 0.75,
                  backgroundColor: 'rgba(0, 0, 0, 0.04)', 
                  p: 1.5,
                  borderRadius: 1
                }}
              >
                {classification.map((item, index) => (
                  <React.Fragment key={index}>
                    <Box sx={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                      <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary', textTransform: 'uppercase', tracking: '0.05em', lineHeight: 1 }}>
                        {item.rank}
                      </Typography>
                      <Typography 
                        sx={{ 
                          fontSize: '0.85rem', 
                          fontWeight: item.rank === 'Species' ? 'bold' : 'normal', 
                          fontStyle: ['Genus', 'Species'].includes(item.rank) ? 'italic' : 'normal',
                          color: item.rank === 'Species' ? '#1976d2' : 'text.primary',
                          lineHeight: 1.2
                        }}
                      >
                        {item.scientificname}
                      </Typography>
                    </Box>
                    
                    {index < classification.length - 1 && (
                      <Typography sx={{ color: 'rgba(0, 0, 0, 0.26)', fontSize: '0.85rem', px: 0.25, userSelect: 'none' }}>
                        &gt;
                      </Typography>
                    )}
                  </React.Fragment>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" sx={{ color: 'text.secondary', opacity: 0.7, textAlign: 'center' }}>No classification history found.</Typography>
            )}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default WormsModal;
