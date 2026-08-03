'use client';

import {useEffect, useState} from 'react';
import {AppShell} from '@astryxdesign/core/AppShell';
import {Badge} from '@astryxdesign/core/Badge';
import {Banner} from '@astryxdesign/core/Banner';
import {Button} from '@astryxdesign/core/Button';
import {Grid} from '@astryxdesign/core/Grid';
import {Item} from '@astryxdesign/core/Item';
import {Layout, LayoutContent, LayoutHeader} from '@astryxdesign/core/Layout';
import {List, ListItem} from '@astryxdesign/core/List';
import {ProgressBar} from '@astryxdesign/core/ProgressBar';
import {Section} from '@astryxdesign/core/Section';
import {HStack, VStack} from '@astryxdesign/core/Stack';
import {Table, pixel, proportional} from '@astryxdesign/core/Table';
import type {TableColumn} from '@astryxdesign/core/Table';
import {Heading, Text} from '@astryxdesign/core/Text';
import {useMediaQuery} from '@astryxdesign/core/hooks';
import {getSheetGid, getWeekKey} from '@/lib/date-utils';
import {getLibrary} from '@/lib/library';
import type {Announcement, Song} from '@/lib/library-types';
import {recalculateSchedule} from '@/lib/schedule-utils';
import {fetchSheetData} from '@/lib/sheets';
import {getWeekData, WeekData} from '@/lib/storage';
import type {ScheduleItem, ServiceData} from '@/lib/types';
import styles from './ServiceOS.module.css';

interface PublicServiceData extends ServiceData {
    weekData: WeekData;
    songs: Song[];
    announcements: Announcement[];
}

function normalizeScheduleText(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function getDisplayRemark(item: ScheduleItem): string | undefined {
    const remark = item.remarks?.trim();
    if (!remark) return undefined;

    if (normalizeScheduleText(remark) === normalizeScheduleText(item.event)) return undefined;

    const ledBy = remark.replace(/^led by\s+/i, '');
    if (item.host && normalizeScheduleText(ledBy) === normalizeScheduleText(item.host)) return undefined;

    return remark;
}

function getRemarkItems(remark: string): string[] {
    const cleaned = remark
        .replace(/^songs?\s*:\s*/i, '')
        .replace(/[\u200B-\u200D\u2060\uFEFF]/g, '')
        .trim();
    const markers = Array.from(cleaned.matchAll(/(?:^|\s)(\d+)[.)]\s+/g));

    if (markers.length < 2) return [];

    return markers
        .map((marker, index) => {
            const start = (marker.index ?? 0) + marker[0].length;
            const end = markers[index + 1]?.index ?? cleaned.length;
            return cleaned.slice(start, end).replace(/\s*[+:]\s*$/, '').trim();
        })
        .filter(Boolean);
}

function RemarkContent({remark}: {remark: string}) {
    const items = getRemarkItems(remark);

    if (items.length) {
        return (
            <List className={styles.remarkList} density="compact" listStyle="decimal">
                {items.map((item, index) => (
                    <ListItem
                        key={`${index}-${item}`}
                        label={<Text type="supporting" color="secondary">{item}</Text>}
                    />
                ))}
            </List>
        );
    }

    return <Text type="supporting" color="secondary">{remark}</Text>;
}

const serviceFlowColumns: TableColumn<ScheduleItem>[] = [
    {
        key: 'timeFrom',
        header: 'Time',
        width: pixel(140),
        renderCell: (item) => (
            <div className={styles.timeCell}>
                <Text weight="bold" hasTabularNumbers>{item.timeFrom}</Text>
            </div>
        ),
    },
    {
        key: 'duration',
        header: 'Duration',
        width: pixel(110),
        renderCell: (item) => (
            <div className={styles.durationCell}>
                <Text type="supporting" hasTabularNumbers>{item.duration || '0'} min</Text>
            </div>
        ),
    },
    {
        key: 'event',
        header: 'Service flow',
        width: proportional(3),
        renderCell: (item) => {
            const remark = getDisplayRemark(item);
            return (
                <div className={styles.eventCell}>
                    <VStack gap={0.5}>
                        <Text weight="semibold">{item.event}</Text>
                        {remark ? (
                            <div className={styles.eventRemark}>
                                <RemarkContent remark={remark} />
                            </div>
                        ) : null}
                    </VStack>
                </div>
            );
        },
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
                <Layout contentWidth={960} padding={4} content={<LayoutContent padding={6}><ProgressBar label="Loading order of service" isIndeterminate /></LayoutContent>} />
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

    const heroTitle = (
        <div className={styles.heroTitle}>
            <Heading level={1} type="display-1">Order of service</Heading>
            <div className={styles.heroHost}>
                <div className={styles.heroHostLabel}>
                    <Text type="supporting" weight="bold">Service host</Text>
                </div>
                <div className={styles.heroHostName}>
                    <Text type="large" weight="semibold">{service.host || 'To be confirmed'}</Text>
                </div>
                {service.notes ? <Text type="supporting" color="secondary">{service.notes}</Text> : null}
            </div>
        </div>
    );

    return (
        <div className={styles.publicPage}>
            <AppShell height="auto" contentPadding={0} mobileNav={false} variant="surface">
                <Layout
                    height="auto"
                    contentWidth={1280}
                    header={
                        <LayoutHeader padding={4} hasDivider>
                            <HStack gap={3} hAlign="between" vAlign="center" wrap="nowrap">
                                <div className={styles.brandWordmark}>
                                    <Text type="large" weight="bold">ALPHA COLORS</Text>
                                </div>
                                <div className={styles.headerDate}>
                                    <Text type="supporting" weight="semibold" hasTabularNumbers>
                                        SUN <span aria-hidden="true">|</span> {service.date || 'This Sunday'}
                                    </Text>
                                </div>
                            </HStack>
                        </LayoutHeader>
                    }
                    content={
                        <LayoutContent padding={4} isScrollable={false}>
                            <VStack gap={4}>
                                {heroTitle}

                                {Object.keys(service.team).length ? (
                                    <div className={styles.teamRail}>
                                        <Section variant={'brand' as never} padding={4}>
                                            <VStack gap={3}>
                                                <div className={styles.sectionKicker}>
                                                    <Text type="label" weight="bold" color="inherit">Serving team</Text>
                                                </div>
                                                <Grid columns={{minWidth: 140, max: 6, repeat: 'fit'}} gap={0}>
                                                    {Object.entries(service.team).map(([role, name]) => (
                                                        <div className={styles.teamMember} key={role}>
                                                            <Item
                                                                density="compact"
                                                                align="start"
                                                                label={
                                                                    <div className={styles.teamRole}>
                                                                        <Text type="supporting" weight="bold" color="inherit">{role}</Text>
                                                                    </div>
                                                                }
                                                                description={<Text type="large" weight="medium" color="inherit">{name || '—'}</Text>}
                                                            />
                                                        </div>
                                                    ))}
                                                </Grid>
                                            </VStack>
                                        </Section>
                                    </div>
                                ) : null}

                                <VStack gap={3}>
                                    <div className={styles.sectionHeader}>
                                        <HStack gap={3} hAlign="between" vAlign="end" wrap="wrap">
                                            <Heading level={2}>Service flow</Heading>
                                            <Text type="supporting" color="secondary">Approximate times</Text>
                                        </HStack>
                                    </div>
                                    {service.schedule.length ? (
                                        isWideLayout ? (
                                            <div className={styles.scheduleTable}>
                                                <Table
                                                    data={service.schedule}
                                                    columns={serviceFlowColumns}
                                                    idKey="id"
                                                    density="spacious"
                                                    dividers="rows"
                                                    verticalAlign="top"
                                                    textOverflow="wrap"
                                                />
                                            </div>
                                        ) : (
                                            <div className={styles.mobileSchedule}>
                                                <List density="spacious" hasDividers>
                                                    {service.schedule.map((item) => {
                                                        const remark = getDisplayRemark(item);
                                                        return (
                                                            <ListItem
                                                                key={item.id}
                                                                label={<Text type="large" weight="semibold">{item.event}</Text>}
                                                                description={
                                                                    remark ? (
                                                                        <div className={styles.mobileRemark}>
                                                                            <RemarkContent remark={remark} />
                                                                        </div>
                                                                    ) : undefined
                                                                }
                                                                endContent={
                                                                    <div className={styles.mobileHostBadge}>
                                                                        <Badge
                                                                            variant="blue"
                                                                            label={item.host || 'TBC'}
                                                                            aria-label={`Host: ${item.host || 'To be confirmed'}`}
                                                                        />
                                                                    </div>
                                                                }
                                                                startContent={
                                                                    <HStack gap={2} vAlign="end">
                                                                        <div className={styles.timeCell}>
                                                                            <Text weight="bold" hasTabularNumbers>{item.timeFrom}</Text>
                                                                        </div>
                                                                        <div className={styles.durationCell}>
                                                                            <Text type="supporting" hasTabularNumbers>{item.duration || '0'} min</Text>
                                                                        </div>
                                                                    </HStack>
                                                                }
                                                            />
                                                        );
                                                    })}
                                                </List>
                                            </div>
                                        )
                                    ) : (
                                        <Banner status="info" title="The service flow is being prepared" description="Please check back shortly." />
                                    )}
                                </VStack>

                                {selectedAnnouncements.length ? (
                                    <div className={styles.editorialSection}>
                                        <Section variant="transparent" padding={0} paddingBlock={5}>
                                            <VStack gap={3}>
                                                <Heading level={2}>Announcements</Heading>
                                                <List density="balanced" hasDividers>
                                                    {selectedAnnouncements.map((announcement) => (
                                                        <ListItem
                                                            key={announcement.id}
                                                            label={<Text type="large" weight="semibold">{announcement.title}</Text>}
                                                            description={<Text color="secondary">{announcement.body}</Text>}
                                                            endContent={announcement.priority !== 'low' ? (
                                                                <Text type="supporting" weight="bold">{announcement.priority === 'high' ? 'Important' : 'Notice'}</Text>
                                                            ) : undefined}
                                                        />
                                                    ))}
                                                </List>
                                            </VStack>
                                        </Section>
                                    </div>
                                ) : null}

                                {selectedSongs.length ? (
                                    <div className={styles.editorialSection}>
                                        <Section variant="transparent" padding={0} paddingBlock={5}>
                                            <VStack gap={3}>
                                                <Heading level={2}>Songs</Heading>
                                                <List density="balanced" hasDividers>
                                                    {selectedSongs.map((song) => (
                                                        <ListItem
                                                            key={song.id}
                                                            label={<Text type="large" weight="semibold">{song.title}</Text>}
                                                            description={[song.artist, song.defaultKey ? `Key ${song.defaultKey}` : '', song.bpm ? `${song.bpm} BPM` : ''].filter(Boolean).join(' · ') || 'Song details'}
                                                            endContent={song.referenceUrl ? (
                                                                <Button
                                                                    label="Open reference"
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
                                    </div>
                                ) : null}

                            </VStack>
                        </LayoutContent>
                    }
                />
            </AppShell>
        </div>
    );
}
