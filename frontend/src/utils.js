export const generateColorStops = (colors) => {
    return colors.map((color, i) => [
        parseFloat((i / (colors.length - 1)).toFixed(4)),
        color
    ]);
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
    if (value == null || !isFinite(value)) return 'rgba(0,0,0,0)';
    if (min === max) return colorStops[colorStops.length - 1][1];

    const norm = Math.max(0, Math.min(1, (value - min) / (max - min)));

    // Find the two surrounding stops
    for (let i = 0; i < colorStops.length - 1; i++) {
        const [start, startColor] = colorStops[i];
        const [end, endColor] = colorStops[i + 1];

        if (norm >= start && norm <= end) {
            const span = end - start;
            // If stops are at the same position, return the end color directly
            if (span === 0) return endColor;

            const ratio = (norm - start) / span;
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
    // colorscale is now one entry per color (not doubled), so length = numBins
    const numBins = colorscale.length;
    const { tickvals, ticktext } = generateColorbarTicks(minValue, maxValue, numBins);
    const binColors = colorscale.map(([_, color]) => color);
    return { colors: binColors, labels: ticktext };
};

export const generateColorbarTicks = (min, max, numBins) => {
    if (min == null || max == null) return { tickvals: [], ticktext: [] };

    const range = max - min;
    const step = range / (numBins - 1);
    const precision = range >= 10 ? 0 : 2;

    const tickvals = [];
    const ticktext = [];

    for (let i = 0; i < numBins; i++) {
        const val = min + step * i;
        tickvals.push(parseFloat(val.toFixed(precision)));
        ticktext.push(val.toFixed(precision));
    }

    return { tickvals, ticktext };
};