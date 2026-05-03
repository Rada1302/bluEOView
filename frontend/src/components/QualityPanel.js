import React, { useState, useEffect, useRef } from 'react';
import {
    Box,
    Typography,
    Tooltip,
    IconButton,
    Collapse,
    CircularProgress,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

// Always-green panel for diversity datasets
function DiversityQCBadge() {
    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                px: 2,
                py: 1.5,
                borderRadius: 1,
                backgroundColor: 'rgba(0,200,83,0.1)',
                border: '1px solid rgba(0,200,83,0.3)',
            }}
        >
            <Box
                sx={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    backgroundColor: '#00c853',
                    flexShrink: 0,
                    boxShadow: '0 0 8px rgba(0,200,83,0.4)',
                }}
            />
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem' }}>
                Quality verified — diversity products are pre-screened.
            </Typography>
        </Box>
    );
}

// Single algorithm row
function AlgorithmRow({ algorithmLabel, colors, qcNames, recommendation }) {
    const [open, setOpen] = useState(false);

    const hasRed = colors.some(c => {
        const hx = c.replace('#', '');
        const r = parseInt(hx.slice(0, 2), 16), g = parseInt(hx.slice(2, 4), 16), b = parseInt(hx.slice(4, 6), 16);
        return r > 180 && g < 120 && b < 120;
    });
    const hasAmber = colors.some(c => {
        const hx = c.replace('#', '');
        const r = parseInt(hx.slice(0, 2), 16), g = parseInt(hx.slice(2, 4), 16), b = parseInt(hx.slice(4, 6), 16);
        return r > 180 && g > 120 && b < 100;
    });
    const overallColor = hasRed ? '#e53935' : hasAmber ? '#ffab00' : '#00c853';

    return (
        <Box sx={{ mb: 0.75 }}>
            <Box
                onClick={() => setOpen(o => !o)}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    px: 1.5,
                    py: 1,
                    borderRadius: 1,
                    cursor: 'pointer',
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' },
                    transition: 'background-color 0.15s',
                }}
            >
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: overallColor, flexShrink: 0 }} />
                <Typography sx={{ flex: 1, fontSize: '0.85rem', fontWeight: 500, color: 'rgba(255,255,255,0.9)', fontFamily: '"IBM Plex Mono", monospace' }}>
                    {algorithmLabel}
                </Typography>
                <Box sx={{ display: 'flex', gap: '4px' }}>
                    {colors.map((col, i) => (
                        <Tooltip key={i} title={qcNames[i] || `Criterion ${i + 1}`} placement="top" arrow>
                            <Box sx={{ width: 9, height: 9, borderRadius: '50%', backgroundColor: col, border: '1px solid rgba(255,255,255,0.1)' }} />
                        </Tooltip>
                    ))}
                </Box>
                {open ? <ExpandLessIcon sx={{ fontSize: 18, color: 'rgba(255,255,255,0.5)' }} /> : <ExpandMoreIcon sx={{ fontSize: 18, color: 'rgba(255,255,255,0.5)' }} />}
            </Box>
            <Collapse in={open}>
                <Box sx={{ mx: 1, mt: 0.5, p: 1.5, borderRadius: 1, backgroundColor: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
                        {colors.map((col, i) => (
                            <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 1, py: 0.4, borderRadius: 0.75, backgroundColor: `${col}15`, border: `1px solid ${col}40` }}>
                                <Box sx={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: col }} />
                                <Typography sx={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.8)' }}>{qcNames[i]}</Typography>
                            </Box>
                        ))}
                    </Box>
                    <Typography sx={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', fontStyle: 'italic', borderTop: '1px solid rgba(255,255,255,0.1)', pt: 1.5, lineHeight: 1.4 }}>
                        {recommendation}
                    </Typography>
                </Box>
            </Collapse>
        </Box>
    );
}

// Main component
export default function QualityPanel({ netcdfUrl, obsType, sx = {} }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [open, setOpen] = useState(true);
    const abortRef = useRef(null);

    useEffect(() => {
        if (!netcdfUrl) return;
        if (abortRef.current) abortRef.current.abort();
        const ctrl = new AbortController();
        abortRef.current = ctrl;

        setData(null);
        setError(null);
        setLoading(true);

        fetch(`/api/diversity-qc?file=${encodeURIComponent(netcdfUrl)}`, { signal: ctrl.signal })
            .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
            .then(d => { if (!ctrl.signal.aborted) setData(d); })
            .catch(err => { if (err.name !== 'AbortError') setError(err.message); })
            .finally(() => { if (!ctrl.signal.aborted) setLoading(false); });

        return () => ctrl.abort();
    }, [netcdfUrl]);

    const isDiversity = obsType === 'diversity';

    return (
        <Box
            sx={{
                width: '100%',
                backgroundColor: 'rgba(0,0,0,0.25)',
                backdropFilter: 'blur(8px)',
                borderRadius: 1,
                border: '1px solid rgba(255,255,255,0.15)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                ...sx
            }}
        >
            {/* Header */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    px: 2,
                    py: 1,
                    cursor: 'pointer',
                    borderBottom: open ? '1px solid rgba(255,255,255,0.08)' : 'none',
                    '&:hover': { backgroundColor: 'rgba(255,255,255,0.04)' }
                }}
                onClick={() => setOpen(v => !v)}
            >
                <IconButton size="small" sx={{ color: 'white', pr: 3 }}>
                    {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>

                <Typography sx={{ fontSize: 19, flex: 1, color: 'white' }}>
                    Quality Control
                </Typography>
            </Box>

            <Collapse in={open}>
                <Box sx={{ px: 2, py: 2 }}>
                    {isDiversity ? <DiversityQCBadge /> : (
                        <>
                            {loading && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1 }}>
                                    <CircularProgress size={16} sx={{ color: 'white' }} />
                                    <Typography sx={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>Loading data...</Typography>
                                </Box>
                            )}

                            {error && (
                                <Typography sx={{ fontSize: '0.85rem', color: '#e53935', p: 1 }}>
                                    {error}
                                </Typography>
                            )}

                            {!loading && data?.available && (
                                <Box sx={{ display: 'flex', gap: 2, mb: 2, px: 0.5 }}>
                                    {[['#00c853', 'Pass'], ['#ffab00', 'Caution'], ['#e53935', 'Fail']].map(([col, lbl]) => (
                                        <Box key={lbl} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: col }} />
                                            <Typography sx={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>{lbl}</Typography>
                                        </Box>
                                    ))}
                                </Box>
                            )}

                            {!loading && data?.available && data.algorithms.map((alg, i) => (
                                <AlgorithmRow
                                    key={alg}
                                    algorithmLabel={alg}
                                    colors={data.colors[i] || []}
                                    qcNames={data.qcNames}
                                    recommendation={data.recommendations[i]}
                                />
                            ))}

                            {!loading && !error && data && !data.available && (
                                <Typography sx={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', p: 1, fontStyle: 'italic' }}>
                                    No quality control metrics available for this source.
                                </Typography>
                            )}
                        </>
                    )}
                </Box>
            </Collapse>
        </Box>
    );
}