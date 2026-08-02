import {defineTheme} from '@astryxdesign/core/theme';
import {neutralTheme} from '@astryxdesign/theme-neutral';

export const alphaColorsTheme = defineTheme({
    name: 'alpha-colors',
    extends: neutralTheme,
    color: {
        accent: '#146EF5',
        neutralStyle: 'cool',
        contrast: 'standard',
    },
    typography: {
        scale: {base: 15, ratio: 1.18},
        body: {
            family: '-apple-system',
            fallbacks: 'BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        },
        heading: {
            family: '-apple-system',
            fallbacks: 'BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
            weight: 'bold',
        },
        code: {
            family: '"SF Mono"',
            fallbacks: 'Monaco, Consolas, monospace',
        },
    },
    radius: {base: 4, multiplier: 1},
    motion: {fast: 160, medium: 320, ratio: 0.75},
    components: {
        card: {
            'variant:inverted': {
                backgroundColor: 'var(--color-background-inverted)',
                borderColor: 'var(--color-background-inverted)',
                color: 'var(--color-on-dark)',
            },
        },
    },
});
