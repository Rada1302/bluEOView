import React from 'react';
import {
    Typography,
    Link, D
} from '@mui/material';

export const SD_THRESHOLD = 50;

// Explanatory descriptions
export const aboutGeneration = ""

export const aboutMean = "Projected Habitat Suitability Index"

export const aboutSD = "Standard Deviation of the Suitability Index"

export const aboutObs = "Observations Used to Calibrate CEPHALOPOD"

export const aboutTrafficLight = ""

//Algorithms:\n\nGLM: Generalized Linear Model, GAM: General Additive Model, MLP: Multilayer Perceptron, SVM: Support Vector Machine, RF: Random Forest, BRT: Boosted Regression Trees\n\nCheck\nPre-VIP: priori variable importance, FIT: predictive performance, Cum-VIP: cumulative variance explained, DEV: projection uncertainty."

export const welcomeShortText = "CEPHALOView is an interactive tool for exploring marine biodiversity data.\n\nBrowse global observation maps, switch between monthly and annual views, and compare multiple diversity metrics derived from open ocean datasets.";

export const welcomeLongText = "Data is loaded from NetCDF files hosted on the BlueCloud infrastructure. You can explore the preloaded datasets from the dropdown, or paste a custom URL to load your own file.\n\nUse the feature selector to switch between biodiversity indices, and the month slider to animate seasonal patterns. The globe and map views are linked — zoom and pan are shared between them.\n\nThis tool was developed as part of the BlueCloud 2026 project, which aims to make marine research data more accessible and reusable.";

export const about = <Typography variant="body2">
    Schickele, A., Clerc, C., Benedetti, F., De Angelis, D., Hofmann Elizondo, U., Münnich, M.,
    Irisson, J.-O., &amp; Vogt, M. (2025).{' '}
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
</Typography>;

export const noQualityText = "Quality control metrics are not explicitly provided, as the data have been pre-filtered. Only those that passed the initial quality checks were used for the projection.";

// Title area
export const PanelTitle = ({ title, loading, style }) => (
    <div style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <span>{title}</span>
        {loading && (
            <div style={{
                width: 14, height: 14, flexShrink: 0,
                border: '2px solid rgba(255,255,255,0.2)',
                borderTop: '2px solid rgba(255,255,255,0.85)',
                borderRadius: '50%',
                animation: 'mapdisplay-spin 0.75s linear infinite',
            }} />
        )}
    </div>
);

export const stdColorscale = [
    [0.0, '#1a1a2e'],
    [0.2, '#e8f4f8'],
    [0.5, '#ffcccc'],
    [0.75, '#ff4444'],
    [1.0, '#cc0000'],
];

// Color palette
export const colors = [
    '#440154',
    '#482777',
    '#3b528b',
    '#31688e',
    '#21918c',
    '#35b779',
    '#5ec962',
    '#aadc32',
    '#dde318',
    '#fde725'
];

// SD Colorscale
export const SD_COLORSCALE = [
    [0.00, '#ffffff'],
    [0.10, '#fff5cc'],
    [0.25, '#ffe066'],
    [0.40, '#ffb347'],
    [0.50, '#ff7e00'],
    [0.60, '#ff3c00'],
    [0.75, '#cc1100'],
    [0.90, '#7a0000'],
    [1.00, '#3d0000'],
];

export const containerStyle = {
    width: '100%',
    height: '100%',
    position: 'relative',
};

export const plotWrapperStyle = {
    position: 'absolute',
    top: 5,
    left: 0,
    width: '100%',
    height: '100%',
};

export const monthNames = {
    1: 'January',
    2: 'February',
    3: 'March',
    4: 'April',
    5: 'May',
    6: 'June',
    7: 'July',
    8: 'August',
    9: 'September',
    10: 'October',
    11: 'November',
    12: 'December',
    13: "Annual Mean"
}

export const DEFAULT_URLS = [
    {
        label: "Diversity projection based on occurrence",
        value: "https://data.up.ethz.ch/shared/Blueoview_data/L3_plankton_species_diversity_from_occurrence_20260518.nc"
    },
    {
        label: "Species projection based on occurrence",
        value: "https://data.up.ethz.ch/shared/Blueoview_data/L2_plankton_species_distribution_from_occurrence_20260518.nc"
    },
    {
        label: "Diversity projection based on abundance",
        value: "https://data.up.ethz.ch/shared/Blueoview_data/L2_plankton_species_diversity_from_abundance_20260519.nc"
    },
    {
        label: "Diversity projection based on biomass",
        value: "https://data.up.ethz.ch/shared/Blueoview_data/L2_plankton_species_diversity_from_biomass_20260520.nc"
    },
    {
        label: "Diversity projection based on metagenomic",
        value: "https://data.up.ethz.ch/shared/Blueoview_data/L2_plankton_species_diversity_from_metagenomic_20260520.nc"
    }
];

export const MONTH_OPTIONS = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
    { value: 13, label: 'Annual' },
];

export const BlueCloudLogo = {
    alt: 'Blue-Cloud',
    src: '/assets/BlueCloud_logo.png',
    href: 'https://blue-cloud.org',
}

export const EARTH_TEXTURE = "/assets/earth_texture.png";

export const logos = [
    {
        alt: 'ETH Zurich',
        src: '/assets/ETH_logo_black.png',
        href: 'https://up.ethz.ch/research/ongoing-projects.html',
    },
    {
        alt: 'Sorbonne University',
        src: '/assets/Sorbonne_logo.png',
        href: 'https://www.sorbonne-universite.fr/en',
    },
    {
        alt: 'EMBL',
        src: '/assets/EMBL_logo.png',
        href: 'https://www.embl.org/about/',
    },
    {
        alt: 'EU',
        src: '/assets/EU_logo.png',
        href: 'https://eosc.eu/eosc-about/calls-grants/',
    }
];

export const mapGlobeTitleStyle = {
    position: 'absolute',
    top: 13,
    left: '50%',
    transform: 'translateX(-50%)',
    width: '90%',
    color: 'white',
    height: 60,
    fontSize: 20,
    fontWeight: 'normal',
    textAlign: 'center',
    pointerEvents: 'none',
    userSelect: 'none',
    zIndex: 10,
    whiteSpace: 'normal',
    lineHeight: 1.3,
};
