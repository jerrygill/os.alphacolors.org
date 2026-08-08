'use client';

import {useEffect, useRef, useState} from 'react';
import {AppShell} from '@astryxdesign/core/AppShell';
import {Badge} from '@astryxdesign/core/Badge';
import {Banner} from '@astryxdesign/core/Banner';
import {Button} from '@astryxdesign/core/Button';
import {Grid} from '@astryxdesign/core/Grid';
import {Icon} from '@astryxdesign/core/Icon';
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
import {Megaphone, Music2} from 'lucide-react';
import {getSheetGid, getWeekKey} from '@/lib/date-utils';
import {isAnnouncementVisible} from '@/lib/announcement-utils';
import {getLibrary} from '@/lib/library';
import type {Announcement, Song} from '@/lib/library-types';
import {recalculateSchedule} from '@/lib/schedule-utils';
import {fetchSheetData} from '@/lib/sheets';
import {getWeekData, WeekData} from '@/lib/storage';
import type {ScheduleItem, ServiceData} from '@/lib/types';
import ServiceDetailDialog from './ServiceDetailDialog';
import {getServiceDetail, isLegacyServiceDetailRemark, normalizeServiceText} from './service-details';
import type {ServiceDetail} from './service-details';
import styles from './ServiceOS.module.css';

interface PublicServiceData extends ServiceData {
    weekData: WeekData;
    songs: Song[];
    announcements: Announcement[];
}

function getDisplayRemark(item: ScheduleItem): string | undefined {
    const remark = item.remarks?.trim();
    if (!remark) return undefined;

    if (normalizeServiceText(remark) === normalizeServiceText(item.event)) return undefined;

    const ledBy = remark.replace(/^led by\s+/i, '');
    if (item.host && normalizeServiceText(ledBy) === normalizeServiceText(item.host)) return undefined;

    return remark;
}

function detailButtonLabel(detail: ServiceDetail): string {
    const noun = detail.kind === 'songs' ? 'song' : 'announcement';
    return `View ${detail.items.length} ${noun}${detail.items.length === 1 ? '' : 's'}`;
}

function createServiceFlowColumns(
    resolveDetail: (item: ScheduleItem) => ServiceDetail | null,
    openDetail: (detail: ServiceDetail, trigger: HTMLElement) => void,
): TableColumn<ScheduleItem>[] {
    return [
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
                const detail = resolveDetail(item);
                const remark = isLegacyServiceDetailRemark(item) ? undefined : getDisplayRemark(item);
                return (
                    <div className={styles.eventCell}>
                        <VStack gap={1}>
                            <Text weight="semibold">{item.event}</Text>
                            {remark ? (
                                <div className={styles.eventRemark}>
                                    <Text type="supporting" color="secondary">{remark}</Text>
                                </div>
                            ) : null}
                            {detail ? (
                                <div className={styles.detailTrigger}>
                                    <Button
                                        label={detailButtonLabel(detail)}
                                        variant="secondary"
                                        size="sm"
                                        icon={<Icon icon={detail.kind === 'songs' ? Music2 : Megaphone} />}
                                        onClick={(event) => openDetail(detail, event.currentTarget)}
                                    />
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
}

export default function LiveServiceView() {
    const [service, setService] = useState<PublicServiceData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string>();
    const [activeDetail, setActiveDetail] = useState<ServiceDetail | null>(null);
    const detailTriggerRef = useRef<HTMLElement | null>(null);
    const isWideLayout = useMediaQuery('(min-width: 720px)');

    function openServiceDetail(detail: ServiceDetail, trigger: HTMLElement) {
        detailTriggerRef.current = trigger;
        setActiveDetail(detail);
    }

    function closeServiceDetail() {
        setActiveDetail(null);
        window.requestAnimationFrame(() => detailTriggerRef.current?.focus());
    }

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

    const visibleAnnouncements = service.announcements
        .filter((announcement) => isAnnouncementVisible(announcement));
    const resolveDetail = (item: ScheduleItem) => getServiceDetail(
        item,
        service.songs,
        visibleAnnouncements,
    );
    const serviceFlowColumns = createServiceFlowColumns(resolveDetail, openServiceDetail);

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
                                                        const detail = resolveDetail(item);
                                                        const remark = isLegacyServiceDetailRemark(item) ? undefined : getDisplayRemark(item);
                                                        return (
                                                            <ListItem
                                                                key={item.id}
                                                                label={<Text type="large" weight="semibold">{item.event}</Text>}
                                                                description={
                                                                    remark || detail ? (
                                                                        <VStack gap={2}>
                                                                            {remark ? (
                                                                                <div className={styles.mobileRemark}>
                                                                                    <Text type="supporting" color="secondary">{remark}</Text>
                                                                                </div>
                                                                            ) : null}
                                                                            {detail ? (
                                                                                <div className={styles.detailTrigger}>
                                                                                    <Button
                                                                                        label={detailButtonLabel(detail)}
                                                                                        variant="secondary"
                                                                                        icon={<Icon icon={detail.kind === 'songs' ? Music2 : Megaphone} />}
                                                                                        onClick={(event) => openServiceDetail(detail, event.currentTarget)}
                                                                                    />
                                                                                </div>
                                                                            ) : null}
                                                                        </VStack>
                                                                    ) : undefined
                                                                }
                                                                startContent={
                                                                    <div className={styles.mobileRowMeta}>
                                                                        <VStack gap={1}>
                                                                            <div className={styles.timeCell}>
                                                                                <Text weight="bold" hasTabularNumbers>{item.timeFrom}</Text>
                                                                            </div>
                                                                            <div className={styles.durationCell}>
                                                                                <Text type="supporting" hasTabularNumbers>{item.duration || '0'} min</Text>
                                                                            </div>
                                                                            <div className={styles.mobileHostBadge}>
                                                                                <Badge
                                                                                    variant="blue"
                                                                                    label={item.host || 'TBC'}
                                                                                    aria-label={`Host: ${item.host || 'To be confirmed'}`}
                                                                                />
                                                                            </div>
                                                                        </VStack>
                                                                    </div>
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

                            </VStack>
                        </LayoutContent>
                    }
                />
            </AppShell>
            <ServiceDetailDialog
                detail={activeDetail}
                isWideLayout={isWideLayout}
                onClose={closeServiceDetail}
            />
        </div>
    );
}
