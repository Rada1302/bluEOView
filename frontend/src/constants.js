export const SD_THRESHOLD = 50;

// Explanatory descriptions
export const howGenerated = "This is how diversity / species were generated."

export const aboutMean = "This is an explanation about mean."

export const aboutSD = "This is an explanation about SD."

export const aboutObs = "This is an explanation about observations."

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
        label: "Diversity",
        value: "https://data.up.ethz.ch/shared/Blueoview_data/with_obs_layer/diversity_output_full_v3.nc"
    },
    {
        label: "Taxa",
        value: "https://data.up.ethz.ch/shared/Blueoview_data/with_obs_layer/taxa_output_full_v3.nc"
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

export const EARTH_TEXTURE = "//unpkg.com/three-globe/example/img/earth-blue-marble.jpg";

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