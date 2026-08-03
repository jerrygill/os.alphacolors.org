'use client';

import {useEffect, useState} from 'react';
import {AppShell} from '@astryxdesign/core/AppShell';
import {Badge} from '@astryxdesign/core/Badge';
import {Banner} from '@astryxdesign/core/Banner';
import {Button} from '@astryxdesign/core/Button';
import {Card} from '@astryxdesign/core/Card';
import {Grid} from '@astryxdesign/core/Grid';
import {Icon} from '@astryxdesign/core/Icon';
import {Item} from '@astryxdesign/core/Item';
import {Layout, LayoutContent, LayoutHeader} from '@astryxdesign/core/Layout';
import {List, ListItem} from '@astryxdesign/core/List';
import {ProgressBar} from '@astryxdesign/core/ProgressBar';
import {Section} from '@astryxdesign/core/Section';
import {HStack, VStack} from '@astryxdesign/core/Stack';
import {StatusDot} from '@astryxdesign/core/StatusDot';
import {Table, pixel, proportional} from '@astryxdesign/core/Table';
import type {TableColumn} from '@astryxdesign/core/Table';
import {Heading, Text} from '@astryxdesign/core/Text';
import {useMediaQuery} from '@astryxdesign/core/hooks';
import {
    Clock3,
    ExternalLink,
    Headphones,
    Megaphone,
    Music2,
    Users,
} from 'lucide-react';
import {getSheetGid, getWeekKey} from '@/lib/date-utils';
import {getLibrary} from '@/lib/library';
import type {Announcement, Song} from '@/lib/library-types';
import {recalculateSchedule} from '@/lib/schedule-utils';
import {fetchSheetData} from '@/lib/sheets';
import {getWeekData, WeekData} from '@/lib/storage';
import type {ScheduleItem, ServiceData} from '@/lib/types';

interface PublicServiceData extends ServiceData {
    weekData: WeekData;
    songs: Song[];
    announcements: Announcement[];
}

function usesNativeContent(eventName: string): boolean {
    return /song|praise|worship|announcement/i.test(eventName);
}

const serviceFlowColumns: TableColumn<ScheduleItem>[] = [
    {
        key: 'timeFrom',
        header: 'Time',
        width: pixel(120),
        renderCell: (item) => (
            <Text weight="bold" hasTabularNumbers>{item.timeFrom}</Text>
        ),
    },
    {
        key: 'event',
        header: 'Service flow',
        width: proportional(3),
        renderCell: (item) => (
            <VStack gap={0.5}>
                <Text weight="semibold">{item.event}</Text>
                {!usesNativeContent(item.event) && item.remarks ? (
                    <Text type="supporting" color="secondary" maxLines={2}>{item.remarks}</Text>
                ) : null}
            </VStack>
        ),
    },
    {
        key: 'host',
        header: 'Host',
        width: proportional(1),
        renderCell: (item) => (
            <Text weight={item.host ? 'semibold' : undefined} color={item.host ? 'primary' : 'secondary'}>
                {item.host || '—'}
            </Text>
        ),
    },
    {
        key: 'duration',
        header: 'Duration',
        width: pixel(100),
        align: 'end',
        renderCell: (item) => (
            <Text type="supporting" color="secondary" hasTabularNumbers>
                {item.duration || '0'} min
            </Text>
        ),
    },
];

export default function LiveServiceView() {
    const [service, setService] = useState<PublicServiceData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string>();
    const isWideLayout = useMediaQuery('(min-width: 720px)');

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
    const serviceTitle = service.title?.trim();
    const hasDistinctServiceTitle = Boolean(serviceTitle && serviceTitle.toLowerCase() !== 'order of service');

    return (
        <AppShell height="auto" contentPadding={0} mobileNav={false} variant="surface">
            <Layout
                height="auto"
                contentWidth={960}
                header={
                    <LayoutHeader padding={4} hasDivider>
                        <HStack gap={3} hAlign="between" vAlign="center" wrap="wrap">
                            <VStack gap={0}>
                                <Text type="large" weight="bold">ALPHA COLORS</Text>
                                <Text type="supporting" color="secondary">Sunday service</Text>
                            </VStack>
                            <Text type="supporting" color="secondary">Order of service</Text>
                        </HStack>
                    </LayoutHeader>
                }
                content={
                    <LayoutContent padding={4} isScrollable={false}>
                        <VStack gap={6}>
                            <Grid columns={{minWidth: 360, max: 2, repeat: 'fit'}} gap={4}>
                                <Card variant={'inverted' as never} padding={6} elevation="low">
                                    <VStack gap={5} height="100%">
                                        <VStack gap={2}>
                                            <Text type="label" weight="bold" color="inherit">ORDER OF SERVICE</Text>
                                            <Heading level={1} type="display-2" color="inherit">
                                                {service.date || 'This Sunday'}
                                            </Heading>
                                            {hasDistinctServiceTitle ? (
                                                <Text type="large" color="inherit">{serviceTitle}</Text>
                                            ) : null}
                                        </VStack>
                                        <VStack gap={1}>
                                            <Text type="supporting" color="inherit">Service host</Text>
                                            <Text type="large" weight="bold" color="inherit">{service.host || 'To be confirmed'}</Text>
                                            {service.notes ? <Text color="inherit">{service.notes}</Text> : null}
                                        </VStack>
                                    </VStack>
                                </Card>

                                {Object.keys(service.team).length ? (
                                    <Card padding={4} elevation="low">
                                        <VStack gap={3}>
                                            <HStack gap={2} vAlign="center">
                                                <Icon icon={Users} color="secondary" />
                                                <Heading level={2}>Serving team</Heading>
                                            </HStack>
                                            <Grid columns={{minWidth: 150, max: 2, repeat: 'fit'}} gap={1}>
                                                {Object.entries(service.team).map(([role, name]) => (
                                                    <Item
                                                        key={role}
                                                        density="compact"
                                                        align="start"
                                                        label={<Text type="supporting" color="secondary">{role}</Text>}
                                                        description={<Text weight="semibold">{name || '—'}</Text>}
                                                    />
                                                ))}
                                            </Grid>
                                        </VStack>
                                    </Card>
                                ) : null}
                            </Grid>

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
                                    </HStack>
                                    <Text type="supporting" color="secondary">Approximate times</Text>
                                </HStack>
                                {service.schedule.length ? (
                                    isWideLayout ? (
                                        <Card padding={0} elevation="low">
                                            <Table
                                                data={service.schedule}
                                                columns={serviceFlowColumns}
                                                idKey="id"
                                                density="spacious"
                                                dividers="rows"
                                                verticalAlign="top"
                                                textOverflow="wrap"
                                            />
                                        </Card>
                                    ) : (
                                        <List density="spacious" hasDividers>
                                            {service.schedule.map((item) => (
                                                <ListItem
                                                    key={item.id}
                                                    label={<Text weight="semibold">{item.event}</Text>}
                                                    description={
                                                        <VStack gap={0.5}>
                                                            {!usesNativeContent(item.event) && item.remarks ? (
                                                                <Text type="supporting" color="secondary" maxLines={2}>{item.remarks}</Text>
                                                            ) : null}
                                                            {item.host ? (
                                                                <Text type="supporting" color="secondary">Host · {item.host}</Text>
                                                            ) : null}
                                                        </VStack>
                                                    }
                                                    startContent={<Text weight="bold" hasTabularNumbers>{item.timeFrom}</Text>}
                                                    endContent={
                                                        <Text type="supporting" color="secondary" hasTabularNumbers>
                                                            {item.duration || '0'} min
                                                        </Text>
                                                    }
                                                />
                                            ))}
                                        </List>
                                    )
                                ) : (
                                    <Banner status="info" title="The service flow is being prepared" description="Please check back shortly." />
                                )}
                            </VStack>

                            {selectedSongs.length ? (
                                <Section variant="section" padding={4} dividers={['top', 'bottom']}>
                                    <VStack gap={3}>
                                        <HStack gap={2} vAlign="center">
                                            <Icon icon={Music2} color="accent" />
                                            <Heading level={2}>Songs</Heading>
                                        </HStack>
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
                                </Section>
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
