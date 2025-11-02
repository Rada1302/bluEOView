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

export const containerStyle = {
    width: '100%',
    height: '100%',
    position: 'relative',
    backgroundColor: 'rgba(18, 18, 18, 0.6)',
};

export const plotWrapperStyle = {
    position: 'absolute',
    top: 5,
    left: 0,
    width: '100%',
    height: '100%',
};

export const infoMessages = {
    "Feature general": "Select the feature you want to visualize on the map or globe. Each feature provides different insights into species diversity and distribution.",
    "a_shannon": "Measures species diversity considering both abundance and evenness. Higher values indicate greater diversity.",
    "a_richness": "The total number of species in a given area. Higher values indicate more species are present.",
    "a_evenness": "Measures how evenly individuals are distributed among species. Values close to 1 indicate more even distributions.",
    "a_invsimpson": "Emphasizes dominant species in a community. Higher values indicate greater diversity and less dominance by a single species."
};

export const featureNames = {
    "a_shannon": "Shannon Diversity Index",
    "a_richness": "Species Richness",
    "a_evenness": "Evenness Index",
    "a_invsimpson": "Inverse Simpson Index"
};

export const monthNames = {
    0: 'January',
    1: 'February',
    2: 'March',
    3: 'April',
    4: 'May',
    5: 'June',
    6: 'July',
    7: 'August',
    8: 'September',
    9: 'October',
    10: 'November',
    11: 'December',
}

// Dropdown options
export const featureOptions = [
    { label: 'Shannon Diversity Index', value: 'a_shannon' },
    { label: 'Species Richness', value: 'a_richness' },
    { label: 'Evenness Index', value: 'a_evenness' },
    { label: 'Inverse Simpson Index', value: 'a_invsimpson' },
];

export const BlueCloudLogo = {
    alt: 'Blue-Cloud',
    src: '/assets/BlueCloud_logo.png',
    href: 'https://blue-cloud.org',
}

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
];

export const mapGlobeTitleStyle = {
    position: 'absolute',
    top: 13,
    left: '50%',
    transform: 'translateX(-50%)',
    width: '90%',
    color: 'white',
    height: 60,
    fontSize: 17,
    fontWeight: 'normal',
    textAlign: 'center',
    pointerEvents: 'none',
    userSelect: 'none',
    zIndex: 10,
    whiteSpace: 'normal',
    lineHeight: 1.3,
};