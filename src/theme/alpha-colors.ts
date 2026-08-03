import {defineTheme} from '@astryxdesign/core/theme';
import {neutralTheme} from '@astryxdesign/theme-neutral';

export const alphaColorsTheme = defineTheme({
    name: 'alpha-colors',
    extends: neutralTheme,
    color: {
        accent: '#0646E8',
        neutralStyle: 'warm',
        contrast: 'high',
    },
    typography: {
        scale: {base: 16, ratio: 1.25},
        body: {
            family: 'var(--font-alpha-body)',
            fallbacks: 'Arial, sans-serif',
        },
        heading: {
            family: 'var(--font-alpha-display)',
            fallbacks: '"Arial Narrow", Arial, sans-serif',
            weight: 'bold',
        },
        code: {
            family: '"SF Mono"',
            fallbacks: 'Monaco, Consolas, monospace',
        },
    },
    radius: {base: 2, multiplier: 0.5},
    motion: {fast: 150, medium: 240, ratio: 0.75},
    tokens: {
        '--color-background-body': '#F4F0E8',
        '--color-background-surface': '#F4F0E8',
        '--color-background-card': '#F4F0E8',
        '--color-background-popover': '#FBF8F2',
        '--color-background-muted': '#E9E4DA',
        '--color-background-inverted': '#11110F',
        '--color-text-primary': '#11110F',
        '--color-text-secondary': '#5D5951',
        '--color-border': '#11110F52',
        '--color-border-emphasized': '#11110F',
        '--color-on-accent': '#FFFFFF',
        '--color-on-dark': '#F8F4EC',
        '--color-shadow': '#00000000',
        '--shadow-low': 'none',
        '--shadow-med': 'none',
        '--shadow-high': 'none',
        '--text-display-1-size': 'clamp(4.5rem, 11vw, 9.5rem)',
        '--text-display-1-weight': '800',
        '--text-display-1-leading': '0.82',
        '--text-display-2-size': 'clamp(2.75rem, 5vw, 5.25rem)',
        '--text-display-2-weight': '700',
        '--text-display-2-leading': '0.9',
        '--text-display-3-weight': '700',
    },
    components: {
        card: {
            base: {
                borderRadius: '0px',
                boxShadow: 'none',
            },
            'variant:inverted': {
                backgroundColor: 'var(--color-background-inverted)',
                borderColor: 'var(--color-background-inverted)',
                color: 'var(--color-on-dark)',
            },
        },
        section: {
            base: {
                borderRadius: '0px',
            },
            'variant:brand': {
                backgroundColor: 'var(--color-accent)',
                borderColor: 'var(--color-accent)',
                color: 'var(--color-on-accent)',
            },
        },
        button: {
            base: {
                borderRadius: '0px',
                fontFamily: 'var(--font-family-heading)',
                fontWeight: 'var(--font-weight-bold)',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
            },
        },
        'text-input': {
            base: {
                borderRadius: '0px',
                fontFamily: 'var(--font-family-body)',
            },
        },
        table: {
            base: {
                backgroundColor: 'transparent',
                borderRadius: '0px',
            },
        },
    },
});
