// Colorbar label mapping
export const nameToLabelMapping = {
    'Biomes': 'Biomes',
    'Species Richness': 'Species Richness [% species]',
    'Hotspots of Change in Diversity': 'Diversity changes [%]',
    'Habitat Suitability Index (HSI)': 'HSI [%]',
    'Change in HSI': 'ΔHSI [%]',
    'Species Turnover': 'Jaccard Index [-]',
    'Temperature': 'Temperature [°C]',
    'Change in Temperature': 'ΔTemperature [°C]',
    'Oxygen': 'Oxygen [mg/L]',
    'Chlorophyll-a Concentration': 'Chlorophyll-a Concentration [log(mg/m³)]',
};

// Color palettes
export const differenceColors = [
    '#3b4cc0',
    '#4f6ec5',
    '#6390cb',
    '#7ab1d3',
    '#9ad0dc',
    '#d6d6d6',
    '#e7b6b6',
    '#db8d8d',
    '#cd6464',
    '#b40426'
];

export const sequentialColors = [
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

export const temperatureColors = [
    '#313695',
    '#4575b4',
    '#74add1',
    '#abd9e9',
    '#e0f3f8',
    '#f7f7f7',
    '#fee090',
    '#fdae61',
    '#f46d43',
    '#d73027',
    '#a50026'
];

export const diversityIndices = [
    'Biomes',
    'Species Richness',
    'Hotspots of Change in Diversity',
    'Habitat Suitability Index (HSI)',
    'Change in HSI',
    'Species Turnover',
];

export const planktonGroups = [
    'Total Plankton',
    'Zooplankton',
    'Phytoplankton',
    'Copepods',
    'Diatoms',
    'Dinoflagellates',
    'Coccolithophores',
];

export const rcpScenarios = [
    'RCP 2.6 (Paris Agreement)',
    'RCP 4.5',
    'RCP 8.5 (Business as Usual)',
    'RCP 8.5 - RCP 2.6',
    'RCP 8.5 - RCP 4.5',
    'RCP 4.5 - RCP 2.6',
];

export const earthModels = ['Model Mean', 'CNRM-CM5', 'GFDL-ESM2M', 'IPSL-CMSA-LR'];

export const environmentalParameters = [
    'Temperature',
    'Oxygen',
    'Change in Temperature',
    'Chlorophyll-a Concentration',
];

export const shortProjectDescription = "Marine plankton biodiversity is essential for ocean productivity, climate regulation, and biogeochemical cycles, but climate change threatens these critical ecosystem services. The MArine Plankton diversity bioindicator scenarios for policy MAKERs project mapped 859 plankton species, defined ocean biomes, projected biodiversity changes, and identified hotspots using observational data and machine learning. An interactive web tool visualizes these findings, helping policymakers incorporate plankton diversity into global marine management decisions.";

export const projectDescription = "Global marine biodiversity supplies essential ecosystem services to human societies. Marine plankton ecosystems fuel ocean productivity, drive global biogeochemical cycles and regulate the Earth's climate. Climate-mediated loss of biodiversity has been suggested to negatively impact ocean ecosystem services, but future projections of climate change impacts on biodiversity and ecosystem function are poorly constrained due to a lack of observational data. Hence, policy makers lack quantitative evidence on the vulnerability of marine ecosystems. The MArine Plankton diversity bioindicator scenarios for policy MAKERs project is a collaboration between IUCN Global Marine and Polar Programme and ETH Environmental Physics Group (UP) to inform data-driven decision-making on marine biodiversity protection at the international policy level and was financed through the Geneva Science Policy Interface (GSPI). Based on observational data and novel machine learning algorithms we have mapped the biogeography of 859 plankton species. We defined ocean biomes, projected future changes in biodiversity and identified hotspots of diversity change. The interactive web tool for policy makers visualizes the results on a global map and is the first step in narrowing the gap between science and policy makers in regard to plankton diversity and their impact on ecosystem functions to be incorporated in marine management decisions.";

export const infoMessages = {
    "Shannon Diversity Index": "Measures species diversity considering both abundance and evenness. Higher values indicate greater diversity.", "Species Richness": "The total number of species in a given area. Higher values indicate more species are present.",
    "Evenness Index": "Measures how evenly individuals are distributed among species. Values close to 1 indicate more even distributions.",
    "Inverse Simpson Index": "Emphasizes dominant species in a community. Higher values indicate greater diversity and less dominance by a single species."
};

export const logos = [
    {
        alt: 'ETH Zurich',
        src: '/assets/ETH_logo_black.png',
        href: 'https://up.ethz.ch/research/ongoing-projects.html',
    },
    {
        alt: 'GSPI',
        src: '/assets/GSPI_logo_black.png',
        href: 'https://gspi.ch/collaboration_projec/marine-plankton-diversity-bioindicator-scenarios-for-policy-makers-mapmaker/',
    },
    {
        alt: 'IUCN',
        src: '/assets/IUCN_logo_black.png',
        href: 'https://www.iucn.org/theme/marine-and-polar',
    },
    {
        alt: 'CMIP5 Data Archive',
        src: '/assets/CMIP5_logo_black.png',
        href: 'https://esgf-node.llnl.gov/search/cmip5/',
    },
    {
        alt: 'Appsilon',
        src: '/assets/appsilon_logo_black.png',
        href: 'https://www.appsilon.com/',
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
    fontSize: 17,
    fontWeight: 'normal',
    textAlign: 'center',
    pointerEvents: 'none',
    userSelect: 'none',
    zIndex: 10,
    whiteSpace: 'normal',
    lineHeight: 1.3,
};