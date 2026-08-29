'use client';

import {Badge, type BadgeVariant} from '@astryxdesign/core/Badge';
import {Button} from '@astryxdesign/core/Button';
import {Card} from '@astryxdesign/core/Card';
import {Dialog, DialogHeader} from '@astryxdesign/core/Dialog';
import {Icon} from '@astryxdesign/core/Icon';
import {IconButton} from '@astryxdesign/core/IconButton';
import {Layout, LayoutContent} from '@astryxdesign/core/Layout';
import {List, ListItem} from '@astryxdesign/core/List';
import {HStack, VStack} from '@astryxdesign/core/Stack';
import {Heading, Text} from '@astryxdesign/core/Text';
import {useEffect, useState} from 'react';
import type {
    AnnouncementDetail,
    AnnouncementOccurrenceDetail,
    ServiceDetail,
} from './service-details';
import styles from './ServiceOS.module.css';

interface ServiceDetailDialogProps {
    detail: ServiceDetail | null;
    isWideLayout: boolean;
    onClose: () => void;
}

function priorityVariant(priority: AnnouncementDetail['priority']): BadgeVariant {
    if (priority === 'high') return 'error';
    if (priority === 'medium') return 'warning';
    return 'neutral';
}

function formatOccurrenceDate(occurrence: AnnouncementOccurrenceDetail): string | undefined {
    if (occurrence.recurringDay) {
        return `Every ${occurrence.recurringDay[0].toUpperCase()}${occurrence.recurringDay.slice(1)}`;
    }
    if (occurrence.dateLabel) return occurrence.dateLabel;
    if (!occurrence.date) return undefined;

    const [year, month, day] = occurrence.date.split('-').map(Number);
    if (!year || !month || !day) return occurrence.date;

    return new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(new Date(year, month - 1, day));
}

function formatOccurrenceTime(occurrence: AnnouncementOccurrenceDetail): string | undefined {
    if (occurrence.timeLabel) {
        return occurrence.timeLabel.replace(/\s*(am|pm)$/i, ' $1').toUpperCase();
    }
    if (!occurrence.time) return undefined;

    const [rawHour, rawMinute] = occurrence.time.split(':').map(Number);
    if (!Number.isFinite(rawHour) || !Number.isFinite(rawMinute)) return occurrence.time;

    const suffix = rawHour >= 12 ? 'PM' : 'AM';
    const hour = rawHour % 12 || 12;
    return rawMinute ? `${hour}:${String(rawMinute).padStart(2, '0')} ${suffix}` : `${hour} ${suffix}`;
}

function countLabel(detail: ServiceDetail): string {
    const noun = detail.kind === 'songs' ? 'song' : 'announcement';
    return `${detail.items.length} ${noun}${detail.items.length === 1 ? '' : 's'}`;
}

export default function ServiceDetailDialog({detail, isWideLayout, onClose}: ServiceDetailDialogProps) {
    const [renderedDetail, setRenderedDetail] = useState<ServiceDetail | null>(detail);

    useEffect(() => {
        if (detail) setRenderedDetail(detail);
    }, [detail]);

    const visibleDetail = detail ?? renderedDetail;
    if (!visibleDetail) return null;

    return (
        <Dialog
            isOpen={detail !== null}
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
            variant={isWideLayout ? 'standard' : 'fullscreen'}
            width={720}
            maxHeight="86dvh"
            purpose="info"
            padding={4}
        >
            <Layout
                height="fill"
                header={
                    <DialogHeader
                        title={visibleDetail.title}
                        subtitle={countLabel(visibleDetail)}
                        startContent={!isWideLayout ? (
                            <IconButton
                                label="Back to service flow"
                                tooltip="Back"
                                variant="ghost"
                                icon={<Icon icon="chevronLeft" />}
                                onClick={onClose}
                            />
                        ) : undefined}
                        onOpenChange={isWideLayout ? () => onClose() : undefined}
                        hasDivider
                    />
                }
                content={
                    <LayoutContent padding={4}>
                        {visibleDetail.kind === 'songs' ? (
                            <List className={styles.songDetailList} density="spacious" hasDividers listStyle="decimal">
                                {visibleDetail.items.map((song) => (
                                    <ListItem
                                        key={song.id}
                                        label={
                                            <HStack
                                                className={styles.songTitleRow}
                                                gap={2}
                                                hAlign="between"
                                                vAlign="start"
                                                width="100%"
                                            >
                                                <Text type="large" weight="semibold">{song.title}</Text>
                                                {song.artist ? (
                                                    <span className={styles.songArtist} title={song.artist}>
                                                        <Badge
                                                            className={styles.songArtistBadge}
                                                            variant="blue"
                                                            label={song.artist}
                                                        />
                                                    </span>
                                                ) : null}
                                            </HStack>
                                        }
                                        description={
                                            <VStack gap={2}>
                                                {song.defaultKey || song.bpm ? (
                                                    <HStack gap={1} wrap="wrap" vAlign="center">
                                                        {song.defaultKey ? <Badge variant="neutral" label={`Key ${song.defaultKey}`} /> : null}
                                                        {song.bpm ? <Badge variant="neutral" label={`${song.bpm} BPM`} /> : null}
                                                    </HStack>
                                                ) : null}
                                                {song.notes ? (
                                                    <Card className={styles.songNotes} variant="muted" padding={1.5}>
                                                        <Text type="supporting" color="secondary">{song.notes}</Text>
                                                    </Card>
                                                ) : null}
                                                {song.referenceUrl ? (
                                                    <div className={styles.dialogAction}>
                                                        <Button
                                                            label="Open reference"
                                                            variant="secondary"
                                                            href={song.referenceUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                        />
                                                    </div>
                                                ) : null}
                                            </VStack>
                                        }
                                    />
                                ))}
                            </List>
                        ) : (
                            <VStack gap={4}>
                                {visibleDetail.items.map((announcement, index) => (
                                    <section className={styles.announcementDetail} key={announcement.id}>
                                        <VStack gap={2}>
                                            <HStack gap={2} hAlign="between" vAlign="start" wrap="wrap">
                                                <HStack gap={2} vAlign="start">
                                                    <Text type="supporting" weight="bold" hasTabularNumbers>
                                                        {String(index + 1).padStart(2, '0')}
                                                    </Text>
                                                    <Heading level={3}>{announcement.title}</Heading>
                                                </HStack>
                                                {announcement.priority !== 'low' ? (
                                                    <Badge
                                                        variant={priorityVariant(announcement.priority)}
                                                        label={announcement.priority === 'high' ? 'Important' : 'Notice'}
                                                    />
                                                ) : null}
                                            </HStack>
                                            {announcement.speaker ? (
                                                <HStack
                                                    className={styles.announcementSpeaker}
                                                    gap={1.5}
                                                    vAlign="center"
                                                    wrap="wrap"
                                                >
                                                    <Text type="label" weight="bold" color="secondary">Speaker</Text>
                                                    <Text type="supporting" weight="semibold">{announcement.speaker}</Text>
                                                </HStack>
                                            ) : null}
                                            {announcement.occurrences.length ? (
                                                <VStack className={styles.announcementSchedule} gap={2}>
                                                    {announcement.occurrences.map((occurrence) => {
                                                        const date = formatOccurrenceDate(occurrence);
                                                        const time = formatOccurrenceTime(occurrence);
                                                        return (
                                                            <div className={styles.announcementOccurrence} key={occurrence.id}>
                                                                <HStack gap={2} vAlign="center" wrap="wrap">
                                                                    {date ? <Badge variant="blue" label={date} /> : null}
                                                                    {time ? <Badge variant="neutral" label={time} /> : null}
                                                                    {occurrence.note ? (
                                                                        <div className={styles.announcementOccurrenceNote}>
                                                                            <Text type="supporting" weight="medium">{occurrence.note}</Text>
                                                                        </div>
                                                                    ) : null}
                                                                </HStack>
                                                            </div>
                                                        );
                                                    })}
                                                </VStack>
                                            ) : null}
                                            {announcement.body ? (
                                                <Card className={styles.announcementCard} variant="muted" padding={4}>
                                                    <div className={styles.announcementBody}>
                                                        <Text>{announcement.body}</Text>
                                                    </div>
                                                </Card>
                                            ) : null}
                                            {announcement.remarks ? (
                                                <div className={styles.announcementRemarks}>
                                                    <VStack gap={1}>
                                                        <Text type="label" weight="bold" color="secondary">Remarks</Text>
                                                        <Text type="supporting" color="secondary">{announcement.remarks}</Text>
                                                    </VStack>
                                                </div>
                                            ) : null}
                                        </VStack>
                                    </section>
                                ))}
                            </VStack>
                        )}
                    </LayoutContent>
                }
            />
        </Dialog>
    );
}
