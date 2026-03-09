// Tutorial steps
export const tooltips = [
    null,
    { // Step 1
        text: "You can compare different scenarios, models, and datasets side by side.",
        top: "30%",
        left: "50%",
    },
    { // Step 2
        text: "Each data panel allows you to switch between a flat map and a 3D globe for convenience.",
        top: "30%",
        left: "25%",
    },
    { // Step 3
        text: "Use the year slider to visualize changes over time.",
        top: "35%",
        left: "16%",
    },
    { // Step 4
        text: "Each panel has a corresponding control panel, where you can select the scenario, model, and other parameters to display.",
        top: "60%",
        left: "50%",
    },
    { // Step 5
        text: "Use locks to sync or separate panels. By default, the left and right data panels are synchronized, meaning the year, scenario, and model are linked. You can unlock these parameters individually if you want to compare different settings.",
        top: "65%",
        left: "50%",
    },
    { // Step 6
        text: "For any parameter, click on the info icons to learn more about its meaning and source.",
        top: "60%",
        left: "40%",
    },
    { // Step 7
        text: "You can select any point on the map or globe to explore how parameters evolve over time.",
        top: "75%",
        left: "17%",
    },
    { // Step 8
        text: "Observe the time series for the selected point.",
        top: "43%",
        left: "50%",
    }
];

export const STD_THRESHOLD = 1.0;

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
        label: "Default (Blueoview Diversity Dataset)",
        value: "https://data.up.ethz.ch/shared/Blueoview_data/diversity_output.nc"
    },
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
    { value: 13, label: 'Annual Mean' },
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