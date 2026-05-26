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
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { aboutTrafficLight, noQualityText } from '../constants';

// Dot legend
function Legend() {
    return (
        <Box sx={{ display: 'flex', gap: 2, mb: 2, px: 0.5 }}>
            {[['#00c853', 'Pass'], ['#ffab00', 'Caution'], ['#e53935', 'Fail']].map(([col, lbl]) => (
                <Box key={lbl} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: col }} />
                    <Typography sx={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>{lbl}</Typography>
                </Box>
            ))}
        </Box>
    );
}

// Colour dot
function Dot({ color }) {
    return (
        <Box
            sx={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                backgroundColor: color,
                flexShrink: 0,
                display: 'inline-block',
            }}
        />
    );
}

// QC table: columns = qcNames + Recommendation, rows = algorithms
function QCTable({ algorithms, colors, qcNames, recommendations }) {
    const columns = [...qcNames, 'Recommendation'];

    return (
        <Box sx={{ overflowX: 'auto' }}>
            <Box
                component="table"
                sx={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '0.78rem',
                    fontFamily: '"IBM Plex Mono", monospace',
                    tableLayout: 'auto',
                }}
            >
                {/* Header */}
                <Box component="thead">
                    <Box component="tr">
                        {/* Algorithm name column header */}
                        <Box
                            component="th"
                            sx={{
                                textAlign: 'left',
                                px: 1.5,
                                py: 1,
                                color: 'rgba(255,255,255,0.4)',
                                fontWeight: 600,
                                fontSize: '0.7rem',
                                borderBottom: '1px solid rgba(255,255,255,0.1)',
                                whiteSpace: 'nowrap',
                                minWidth: 120,
                            }}
                        >
                            Algorithm
                        </Box>

                        {columns.map((col) => (
                            <Box
                                component="th"
                                key={col}
                                sx={{
                                    textAlign: col === 'Recommendation' ? 'left' : 'center',
                                    px: 1.5,
                                    py: 1,
                                    color: 'rgba(255,255,255,0.4)',
                                    fontWeight: 600,
                                    fontSize: '0.7rem',
                                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                                    whiteSpace: col === 'Recommendation' ? 'normal' : 'nowrap',
                                    minWidth: col === 'Recommendation' ? 180 : 80,
                                }}
                            >
                                {col}
                            </Box>
                        ))}
                    </Box>
                </Box>

                {/* Body */}
                <Box component="tbody">
                    {algorithms.map((alg, i) => {
                        const rowColors = colors[i] || [];

                        // Derive overall status for the row label dot
                        const hasRed = rowColors.some(c => {
                            const hx = c.replace('#', '');
                            const r = parseInt(hx.slice(0, 2), 16), g = parseInt(hx.slice(2, 4), 16), b = parseInt(hx.slice(4, 6), 16);
                            return r > 180 && g < 120 && b < 120;
                        });
                        const hasAmber = rowColors.some(c => {
                            const hx = c.replace('#', '');
                            const r = parseInt(hx.slice(0, 2), 16), g = parseInt(hx.slice(2, 4), 16), b = parseInt(hx.slice(4, 6), 16);
                            return r > 180 && g > 120 && b < 100;
                        });
                        const overallColor = hasRed ? '#e53935' : hasAmber ? '#ffab00' : '#00c853';

                        return (
                            <Box
                                component="tr"
                                key={alg}
                                sx={{
                                    '&:hover td, &:hover th': {
                                        backgroundColor: 'rgba(255,255,255,0.04)',
                                    },
                                    transition: 'background-color 0.15s',
                                }}
                            >
                                {/* Algorithm name */}
                                <Box
                                    component="td"
                                    sx={{
                                        px: 1.5,
                                        py: 1,
                                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                                        whiteSpace: 'nowrap',
                                        color: 'rgba(255,255,255,0.9)',
                                        fontWeight: 500,
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Dot color={overallColor} />
                                        {alg}
                                    </Box>
                                </Box>

                                {/* One cell per QC criterion */}
                                {qcNames.map((name, j) => (
                                    <Box
                                        component="td"
                                        key={name}
                                        sx={{
                                            textAlign: 'center',
                                            px: 1.5,
                                            py: 1,
                                            borderBottom: '1px solid rgba(255,255,255,0.06)',
                                        }}
                                    >
                                        <Tooltip title={name} placement="top" arrow>
                                            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                                                <Dot color={rowColors[j] || '#555'} />
                                            </Box>
                                        </Tooltip>
                                    </Box>
                                ))}

                                {/* Recommendation */}
                                <Box
                                    component="td"
                                    sx={{
                                        px: 1.5,
                                        py: 1,
                                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                                        color: 'rgba(255,255,255,0.6)',
                                        fontStyle: 'italic',
                                        fontSize: '0.73rem',
                                        lineHeight: 1.4,
                                        fontFamily: 'inherit',
                                        minWidth: 180,
                                    }}
                                >
                                    {recommendations[i] || '—'}
                                </Box>
                            </Box>
                        );
                    })}
                </Box>
            </Box>
        </Box>
    );
}

// Main component
export default function QualityPanel({ netcdfUrl, feature, openInfoModal, sx = {} }) {
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

        const url = feature
            ? `/api/diversity-qc?file=${encodeURIComponent(netcdfUrl)}&feature=${encodeURIComponent(feature)}`
            : `/api/diversity-qc?file=${encodeURIComponent(netcdfUrl)}`;

        fetch(url, { signal: ctrl.signal })
            .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
            .then(d => { if (!ctrl.signal.aborted) setData(d); })
            .catch(err => { if (err.name !== 'AbortError') setError(err.message); })
            .finally(() => { if (!ctrl.signal.aborted) setLoading(false); });

        return () => ctrl.abort();
    }, [netcdfUrl, feature]);

    return (
        <Box
            sx={{
                width: '100%',
                height: '100%',
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

                <Typography sx={{ fontSize: 19, color: 'white' }}>
                    Quality Control
                </Typography>

                <IconButton
                    size="small"
                    sx={{ color: '#fff', ml: 1 }}
                    onClick={(e) => {
                        e.stopPropagation();
                        const parts = [];
                        if (data?.qcColLongName) parts.push(data.qcColLongName);
                        if (data?.qcRecLongName) parts.push(data.qcRecLongName);
                        openInfoModal?.('Quality Control', parts.join('\n\n') || 'No description available.');
                    }}
                >
                    <InfoOutlinedIcon fontSize="small" />
                </IconButton>
            </Box>

            <Collapse in={open}>
                <Box sx={{ px: 2, pb: 2 }}>
                    <Typography sx={{ fontSize: 16, color: 'rgba(255,255,255,0.7)', py: 2 }}>
                        {aboutTrafficLight}
                    </Typography>

                    {loading && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1 }}>
                            <CircularProgress size={16} sx={{ color: 'white' }} />
                            <Typography sx={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
                                Loading data...
                            </Typography>
                        </Box>
                    )}

                    {error && (
                        <Typography sx={{ fontSize: '0.85rem', color: '#e53935', p: 1 }}>
                            {error}
                        </Typography>
                    )}

                    {!loading && data?.available && (
                        <>
                            <Legend />
                            <QCTable
                                algorithms={data.algorithms}
                                colors={data.colors}
                                qcNames={data.qcNames}
                                recommendations={data.recommendations}
                            />
                        </>
                    )}

                    {!loading && !error && data && !data.available && (
                        <Typography sx={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', p: 1, fontStyle: 'italic' }}>
                            {noQualityText}
                        </Typography>
                    )}
                </Box>
            </Collapse>
        </Box>
    );
}