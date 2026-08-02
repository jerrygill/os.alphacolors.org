'use client';

import {useEffect, useState} from 'react';
import {AppShell} from '@astryxdesign/core/AppShell';
import {Badge} from '@astryxdesign/core/Badge';
import {Banner} from '@astryxdesign/core/Banner';
import {Button} from '@astryxdesign/core/Button';
import {Card} from '@astryxdesign/core/Card';
import {Collapsible} from '@astryxdesign/core/Collapsible';
import {Icon} from '@astryxdesign/core/Icon';
import {Layout, LayoutContent, LayoutHeader} from '@astryxdesign/core/Layout';
import {List, ListItem} from '@astryxdesign/core/List';
import {ProgressBar} from '@astryxdesign/core/ProgressBar';
import {Section} from '@astryxdesign/core/Section';
import {HStack, VStack} from '@astryxdesign/core/Stack';
import {StatusDot} from '@astryxdesign/core/StatusDot';
import {Heading, Text} from '@astryxdesign/core/Text';
import {
    CalendarDays,
    Clock3,
    ExternalLink,
    Headphones,
    Megaphone,
    Music2,
    Sparkles,
    Users,
} from 'lucide-react';
import {getSheetGid, getWeekKey} from '@/lib/date-utils';
import {getLibrary} from '@/lib/library';
import type {Announcement, Song} from '@/lib/library-types';
import {recalculateSchedule} from '@/lib/schedule-utils';
import {fetchSheetData} from '@/lib/sheets';
import {getWeekData, WeekData} from '@/lib/storage';
import type {ServiceData} from '@/lib/types';

interface PublicServiceData extends ServiceData {
    weekData: WeekData;
    songs: Song[];
    announcements: Announcement[];
}

function usesNativeContent(eventName: string): boolean {
    return /song|praise|worship|announcement/i.test(eventName);
}

export default function LiveServiceView() {
    const [service, setService] = useState<PublicServiceData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string>();

    useEffect(() => {
        let isMounted = true;

        async function load() {
            const today = new Date();
            try {
                const [sheetData, weekData, songs, announcements] = await Promise.all([
                    fetchSheetData(getSheetGid(today)),
                    getWeekData(getWeekKey(today)),
                    getLibrary<Song>('songs').catch(() => []),
                    getLibrary<Announcement>('announcements').catch(() => []),
                ]);
                if (!isMounted) return;

                const overrides = weekData.overrides;
                const team = Object.fromEntries(
                    Object.entries(sheetData.team).map(([role, name]) => [
                        role,
                        overrides[`team-${role}`] ?? name,
                    ]),
                );
                setService({
                    ...sheetData,
                    title: overrides.title ?? sheetData.title,
                    date: overrides.date ?? sheetData.date,
                    host: overrides.host ?? sheetData.host,
                    notes: overrides.serviceNotes ?? sheetData.notes,
                    team,
                    schedule: recalculateSchedule(
                        sheetData.schedule,
                        overrides,
                        weekData.customActs,
                        weekData.rowOrder,
                    ),
                    weekData,
                    songs,
                    announcements,
                });
            } catch (loadError) {
                if (isMounted) setError(loadError instanceof Error ? loadError.message : 'Unable to load this service.');
            } finally {
                if (isMounted) setIsLoading(false);
            }
        }

        load();
        return () => {
            isMounted = false;
        };
    }, []);

    if (isLoading) {
        return (
            <AppShell height="auto" contentPadding={0} mobileNav={false}>
                <Layout contentWidth={960} padding={4} content={<LayoutContent padding={6}><ProgressBar label="Loading Sunday service" isIndeterminate /></LayoutContent>} />
            </AppShell>
        );
    }

    if (!service) {
        return (
            <AppShell height="auto" contentPadding={0} mobileNav={false}>
                <Layout contentWidth={720} padding={4} content={<LayoutContent padding={6}><Banner status="error" title="Service page unavailable" description={error || 'Please refresh in a moment.'} /></LayoutContent>} />
            </AppShell>
        );
    }

    const selectedSongs = service.weekData.songIds
        .map((id) => service.songs.find((song) => song.id === id))
        .filter((song): song is Song => Boolean(song));
    const selectedAnnouncements = service.weekData.announcementIds
        .map((id) => service.announcements.find((announcement) => announcement.id === id))
        .filter((announcement): announcement is Announcement => Boolean(announcement));

    return (
        <AppShell height="auto" contentPadding={0} mobileNav={false} variant="surface">
            <Layout
                height="auto"
                contentWidth={960}
                header={
                    <LayoutHeader padding={4} hasDivider>
                        <HStack gap={3} hAlign="between" vAlign="center" wrap="wrap">
                            <HStack gap={2} vAlign="center">
                                <Icon icon={Sparkles} color="accent" />
                                <VStack gap={0}>
                                    <Text type="large" weight="bold">ALPHA COLORS</Text>
                                    <Text type="supporting" color="secondary">Sunday service</Text>
                                </VStack>
                            </HStack>
                            <Text type="supporting" color="secondary">Order of service</Text>
                        </HStack>
                    </LayoutHeader>
                }
                content={
                    <LayoutContent padding={4} isScrollable={false}>
                        <VStack gap={6}>
                            <Card variant={'inverted' as never} padding={6} elevation="low">
                                <VStack gap={4}>
                                    <Text type="label" weight="bold" color="inherit">SUNDAY SERVICE</Text>
                                    <Heading level={1} type="display-2" color="inherit">{service.title || 'Order of Service'}</Heading>
                                    <HStack gap={4} vAlign="center" wrap="wrap">
                                        <HStack gap={1.5} vAlign="center">
                                            <Icon icon={CalendarDays} color="inherit" size="sm" />
                                            <Text color="inherit">{service.date || 'This Sunday'}</Text>
                                        </HStack>
                                        {service.host ? <Text color="inherit">Host · {service.host}</Text> : null}
                                    </HStack>
                                    {service.notes ? <Text color="inherit">{service.notes}</Text> : null}
                                </VStack>
                            </Card>

                            {selectedAnnouncements.length ? (
                                <Section variant="muted" padding={4}>
                                    <VStack gap={3}>
                                        <HStack gap={2} vAlign="center">
                                            <Icon icon={Megaphone} color="accent" />
                                            <Heading level={2}>Announcements</Heading>
                                            <Badge label={selectedAnnouncements.length} variant="neutral" />
                                        </HStack>
                                        <List density="balanced" hasDividers>
                                            {selectedAnnouncements.map((announcement) => (
                                                <ListItem
                                                    key={announcement.id}
                                                    label={<Text weight="semibold">{announcement.title}</Text>}
                                                    description={<Text color="secondary">{announcement.body}</Text>}
                                                    startContent={<StatusDot variant={announcement.priority === 'high' ? 'error' : announcement.priority === 'medium' ? 'warning' : 'neutral'} label={`${announcement.priority} priority`} />}
                                                    endContent={announcement.priority === 'high' ? <Badge label="Important" variant="error" /> : undefined}
                                                />
                                            ))}
                                        </List>
                                    </VStack>
                                </Section>
                            ) : null}

                            <VStack gap={3}>
                                <HStack gap={2} hAlign="between" vAlign="center" wrap="wrap">
                                    <HStack gap={2} vAlign="center">
                                        <Icon icon={Clock3} color="secondary" />
                                        <Heading level={2}>Service flow</Heading>
                                        <Badge label={service.schedule.length} variant="neutral" />
                                    </HStack>
                                    <Text type="supporting" color="secondary">Approximate times</Text>
                                </HStack>
                                {service.schedule.length ? (
                                    <List density="balanced" hasDividers>
                                        {service.schedule.map((item, index) => (
                                            <ListItem
                                                key={item.id}
                                                label={<Text weight="semibold">{item.event}</Text>}
                                                description={!usesNativeContent(item.event) && item.remarks
                                                    ? <Text color="secondary" maxLines={2}>{item.remarks}</Text>
                                                    : item.host
                                                        ? <Text color="secondary">Led by {item.host}</Text>
                                                        : undefined}
                                                startContent={
                                                    <HStack gap={2} vAlign="center">
                                                        <Text type="supporting" color="secondary" hasTabularNumbers>{String(index + 1).padStart(2, '0')}</Text>
                                                        <Text weight="semibold" hasTabularNumbers>{item.timeFrom}</Text>
                                                    </HStack>
                                                }
                                                endContent={<Badge label={`${item.duration || '0'} min`} variant="neutral" />}
                                            />
                                        ))}
                                    </List>
                                ) : (
                                    <Banner status="info" title="The service flow is being prepared" description="Please check back shortly." />
                                )}
                            </VStack>

                            {selectedSongs.length ? (
                                <Card padding={4}>
                                    <Collapsible
                                        trigger={
                                            <HStack gap={2} vAlign="center">
                                                <Icon icon={Music2} color="accent" />
                                                <Text weight="semibold">Songs</Text>
                                                <Badge label={selectedSongs.length} variant="neutral" />
                                            </HStack>
                                        }
                                        defaultIsOpen
                                    >
                                        <VStack paddingBlock={3}>
                                            <List density="balanced" hasDividers>
                                                {selectedSongs.map((song) => (
                                                    <ListItem
                                                        key={song.id}
                                                        label={<Text weight="semibold">{song.title}</Text>}
                                                        description={[song.artist, song.defaultKey ? `Key ${song.defaultKey}` : '', song.bpm ? `${song.bpm} BPM` : ''].filter(Boolean).join(' · ') || 'Song details'}
                                                        startContent={<Icon icon={Headphones} color="secondary" />}
                                                        endContent={song.referenceUrl ? (
                                                            <Button
                                                                label={`Open ${song.title} reference`}
                                                                icon={<Icon icon={ExternalLink} />}
                                                                isIconOnly
                                                                variant="ghost"
                                                                size="sm"
                                                                href={song.referenceUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                            />
                                                        ) : undefined}
                                                    />
                                                ))}
                                            </List>
                                        </VStack>
                                    </Collapsible>
                                </Card>
                            ) : null}

                            {Object.keys(service.team).length ? (
                                <Card padding={4}>
                                    <Collapsible
                                        trigger={
                                            <HStack gap={2} vAlign="center">
                                                <Icon icon={Users} color="secondary" />
                                                <Text weight="semibold">Serving team</Text>
                                                <Badge label={Object.keys(service.team).length} variant="neutral" />
                                            </HStack>
                                        }
                                        defaultIsOpen={false}
                                    >
                                        <VStack paddingBlock={3}>
                                            <List density="compact" hasDividers>
                                                {Object.entries(service.team).map(([role, name]) => (
                                                    <ListItem key={role} label={role} endContent={<Text weight="semibold">{name || '—'}</Text>} />
                                                ))}
                                            </List>
                                        </VStack>
                                    </Collapsible>
                                </Card>
                            ) : null}

                            <Section variant="transparent" padding={0}>
                                <VStack gap={1} hAlign="center" paddingBlock={6}>
                                    <Text type="supporting" color="secondary">Alpha Colors Church</Text>
                                </VStack>
                            </Section>
                        </VStack>
                    </LayoutContent>
                }
            />
        </AppShell>
    );
}
