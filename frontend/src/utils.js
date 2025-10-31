import { colors } from './constants';

export const generateColorStops = (colors) => {
    const step = 1 / colors.length;
    return colors.flatMap((color, i) => {
        const start = i * step;
        const end = (i + 1) * step;
        return [[start, color], [end, color]];
    });
};

export const hexToRgb = (hex) => {
    const normalized = hex.replace('#', '');
    const fullHex = normalized.length === 3
        ? normalized.split('').map(c => c + c).join('')
        : normalized;

    const value = parseInt(fullHex, 16);
    return {
        r: (value >> 16) & 255,
        g: (value >> 8) & 255,
        b: value & 255,
    };
};

export const getInterpolatedColorFromValue = (value, min, max, colorStops) => {
    if (isNaN(value) || value == null) return 'rgba(0,0,0,0)';
    if (min === max) return colorStops[colorStops.length - 1][1];

    const norm = (value - min) / (max - min);

    for (let i = 0; i < colorStops.length - 1; i++) {
        const [start, startColor] = colorStops[i];
        const [end, endColor] = colorStops[i + 1];

        if (norm >= start && norm <= end) {
            const ratio = (norm - start) / (end - start);
            const rgbStart = hexToRgb(startColor);
            const rgbEnd = hexToRgb(endColor);

            const r = Math.round(rgbStart.r + ratio * (rgbEnd.r - rgbStart.r));
            const g = Math.round(rgbStart.g + ratio * (rgbEnd.g - rgbStart.g));
            const b = Math.round(rgbStart.b + ratio * (rgbEnd.b - rgbStart.b));

            return `rgb(${r},${g},${b})`;
        }
    }

    return colorStops[colorStops.length - 1][1];
};

export const getLegendFromColorscale = (colorscale, minValue, maxValue) => {
    const numBins = colorscale.length / 2;
    const { ticktext } = generateColorbarTicks(minValue, maxValue, numBins);
    const binColors = colorscale
        .filter((_, i) => i % 2 === 0)
        .slice(0, numBins)
        .map(([_, color]) => color);
    return { colors: binColors, labels: ticktext };
};

export const generateColorbarTicks = (min, max, numBins) => {
    if (min == null || max == null) return { tickvals: [], ticktext: [] };

    const range = max - min;
    const step = range / numBins;
    const tickvals = [];
    const ticktext = [];

    const precision = range >= 10 ? 0 :
        range >= 1 ? 2 : 3;

    for (let i = 0; i <= numBins; i++) {
        const val = min + step * i;
        tickvals.push(val);
        ticktext.push(val.toFixed(precision));
    }

    return { tickvals, ticktext };
};