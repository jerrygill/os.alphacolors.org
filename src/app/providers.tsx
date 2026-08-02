'use client';

import Link from 'next/link';
import {Theme} from '@astryxdesign/core/theme';
import {LinkProvider} from '@astryxdesign/core/Link';
import {alphaColorsTheme} from '@/theme/alpha-colors.js';

export function Providers({children}: {children: React.ReactNode}) {
    return (
        <Theme theme={alphaColorsTheme} mode="light">
            <LinkProvider component={Link}>{children}</LinkProvider>
        </Theme>
    );
}
