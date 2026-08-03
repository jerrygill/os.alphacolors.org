'use client';

import {ReactNode} from 'react';
import {useRouter} from 'next/navigation';
import {AppShell} from '@astryxdesign/core/AppShell';
import {Button} from '@astryxdesign/core/Button';
import {Icon} from '@astryxdesign/core/Icon';
import {
    SideNav,
    SideNavHeading,
    SideNavItem,
    SideNavSection,
} from '@astryxdesign/core/SideNav';
import {VStack} from '@astryxdesign/core/Stack';
import {CalendarDays, ExternalLink, LogOut, Megaphone, Music2} from 'lucide-react';

export type AdminSection = 'planner' | 'songs' | 'announcements';

interface AdminFrameProps {
    active: AdminSection;
    children: ReactNode;
}

export default function AdminFrame({active, children}: AdminFrameProps) {
    const router = useRouter();

    async function handleLogout() {
        await fetch('/api/admin/session', {method: 'DELETE'});
        router.replace('/admin/login');
        router.refresh();
    }

    const navigation = (
        <SideNav
            header={
                <SideNavHeading
                    heading="Alpha Colors OS"
                    headingHref="/admin"
                />
            }
            footer={
                <VStack gap={1}>
                    <Button
                        label="View public page"
                        variant="ghost"
                        icon={<Icon icon={ExternalLink} />}
                        href="/"
                        width="100%"
                    />
                    <Button
                        label="Sign out"
                        variant="ghost"
                        icon={<Icon icon={LogOut} />}
                        onClick={handleLogout}
                        width="100%"
                    />
                </VStack>
            }
            collapsible
        >
            <SideNavSection title="Workspace">
                <SideNavItem
                    label="Service planner"
                    icon={CalendarDays}
                    href="/admin"
                    isSelected={active === 'planner'}
                />
                <SideNavItem
                    label="Songs"
                    icon={Music2}
                    href="/admin/songs"
                    isSelected={active === 'songs'}
                />
                <SideNavItem
                    label="Announcements"
                    icon={Megaphone}
                    href="/admin/announcements"
                    isSelected={active === 'announcements'}
                />
            </SideNavSection>
        </SideNav>
    );

    return (
        <AppShell
            sideNav={navigation}
            mobileNav={{breakpoint: 'md'}}
            variant="section"
            contentPadding={0}
            height="fill"
        >
            {children}
        </AppShell>
    );
}
