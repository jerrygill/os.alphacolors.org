'use client';

import {FormEvent, useEffect, useMemo, useState} from 'react';
import {AlertDialog} from '@astryxdesign/core/AlertDialog';
import {Badge} from '@astryxdesign/core/Badge';
import {Banner} from '@astryxdesign/core/Banner';
import {Button} from '@astryxdesign/core/Button';
import {Card} from '@astryxdesign/core/Card';
import {Collapsible} from '@astryxdesign/core/Collapsible';
import {Dialog, DialogHeader} from '@astryxdesign/core/Dialog';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {Icon} from '@astryxdesign/core/Icon';
import {IconButton} from '@astryxdesign/core/IconButton';
import {
    Layout,
    LayoutContent,
    LayoutFooter,
    LayoutHeader,
    LayoutPanel,
} from '@astryxdesign/core/Layout';
import {List, ListItem} from '@astryxdesign/core/List';
import {NumberInput} from '@astryxdesign/core/NumberInput';
import {ProgressBar} from '@astryxdesign/core/ProgressBar';
import {HStack, VStack} from '@astryxdesign/core/Stack';
import {StatusDot} from '@astryxdesign/core/StatusDot';
import {Table, pixel, proportional, type TableColumn} from '@astryxdesign/core/Table';
import {TextArea} from '@astryxdesign/core/TextArea';
import {Heading, Text} from '@astryxdesign/core/Text';
import {TextInput} from '@astryxdesign/core/TextInput';
import {Timestamp} from '@astryxdesign/core/Timestamp';
import {useMediaQuery} from '@astryxdesign/core/hooks';
import {
    ArrowDown,
    ArrowUp,
    Copy,
    Eye,
    Pencil,
    Plus,
    RotateCcw,
    Send,
    Trash2,
} from 'lucide-react';
import {getSheetGid, getWeekKey} from '@/lib/date-utils';
import {recalculateSchedule} from '@/lib/schedule-utils';
import {fetchSheetData} from '@/lib/sheets';
import {
    clearWeekData,
    CustomAct,
    getWeekData,
    publishWeekData,
    saveWeekData,
    WeekData,
} from '@/lib/storage';
import type {ScheduleItem, ServiceData} from '@/lib/types';

interface ServiceDetailsState {
    title: string;
    date: string;
    host: string;
    notes: string;
    team: Record<string, string>;
}

interface ScheduleItemFormState {
    event: string;
    timeFrom: string;
    duration: string;
    host: string;
    remarks: string;
}

const EMPTY_DETAILS: ServiceDetailsState = {
    title: '',
    date: '',
    host: '',
    notes: '',
    team: {},
};

const EMPTY_ITEM: ScheduleItemFormState = {
    event: '',
    timeFrom: '',
    duration: '5',
    host: '',
    remarks: '',
};

function itemToForm(item: ScheduleItem): ScheduleItemFormState {
    return {
        event: item.event,
        timeFrom: item.timeFrom,
        duration: item.duration,
        host: item.host,
        remarks: item.remarks,
    };
}

interface ServiceDetailsProps {
    details: ServiceDetailsState;
    isSaving: boolean;
    onDetailsChange: (details: ServiceDetailsState) => void;
    onSaveDetails: () => Promise<void>;
}

function ServiceDetails({
    details,
    isSaving,
    onDetailsChange,
    onSaveDetails,
}: ServiceDetailsProps) {
    return (
        <VStack gap={5}>
            <VStack gap={1}>
                <Heading level={2}>Service details</Heading>
                <Text type="supporting" color="secondary">Edit this week without touching the source sheet.</Text>
            </VStack>
            <VStack gap={3}>
                <TextInput label="Service title" value={details.title} onChange={(title) => onDetailsChange({...details, title})} />
                <TextInput label="Date label" value={details.date} onChange={(date) => onDetailsChange({...details, date})} />
                <TextInput label="Service host" value={details.host} onChange={(host) => onDetailsChange({...details, host})} />
                <TextArea label="Service notes" value={details.notes} onChange={(notes) => onDetailsChange({...details, notes})} rows={3} isOptional />
                {Object.keys(details.team).length ? (
                    <VStack gap={3}>
                        <Text type="label" weight="semibold">Serving team</Text>
                        {Object.entries(details.team).map(([role, name]) => (
                            <TextInput
                                key={role}
                                label={role}
                                value={name}
                                onChange={(value) => onDetailsChange({
                                    ...details,
                                    team: {...details.team, [role]: value},
                                })}
                            />
                        ))}
                    </VStack>
                ) : null}
                <Button label="Save service details" variant="secondary" onClick={onSaveDetails} isLoading={isSaving} width="100%" />
            </VStack>
        </VStack>
    );
}

export default function ServicePlanner() {
    const isMobile = useMediaQuery('(max-width: 767px)');
    const [sheetData, setSheetData] = useState<ServiceData | null>(null);
    const [weekData, setWeekData] = useState<WeekData | null>(null);
    const [weekKey, setWeekKey] = useState('');
    const [details, setDetails] = useState<ServiceDetailsState>(EMPTY_DETAILS);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string>();
    const [success, setSuccess] = useState<string>();
    const [editingItem, setEditingItem] = useState<ScheduleItem | 'new' | null>(null);
    const [itemForm, setItemForm] = useState<ScheduleItemFormState>(EMPTY_ITEM);
    const [deletingItem, setDeletingItem] = useState<ScheduleItem | null>(null);
    const [isResetOpen, setIsResetOpen] = useState(false);

    useEffect(() => {
        let isMounted = true;

        async function load() {
            setIsLoading(true);
            setError(undefined);
            const today = new Date();
            const currentWeekKey = getWeekKey(today);
            setWeekKey(currentWeekKey);

            try {
                const [service, savedWeek] = await Promise.all([
                    fetchSheetData(getSheetGid(today)),
                    getWeekData(currentWeekKey, true),
                ]);
                if (!isMounted) return;

                setSheetData(service);
                setWeekData(savedWeek);
                setDetails({
                    title: savedWeek.overrides.title ?? service.title,
                    date: savedWeek.overrides.date ?? service.date,
                    host: savedWeek.overrides.host ?? service.host,
                    notes: savedWeek.overrides.serviceNotes ?? service.notes ?? '',
                    team: Object.fromEntries(
                        Object.entries(service.team).map(([role, name]) => [
                            role,
                            savedWeek.overrides[`team-${role}`] ?? name,
                        ]),
                    ),
                });
            } catch (loadError) {
                if (isMounted) setError(loadError instanceof Error ? loadError.message : 'Unable to load the service planner.');
            } finally {
                if (isMounted) setIsLoading(false);
            }
        }

        load();
        return () => {
            isMounted = false;
        };
    }, []);

    const computedSchedule = useMemo(() => {
        if (!sheetData || !weekData) return [];
        return recalculateSchedule(
            sheetData.schedule,
            weekData.overrides,
            weekData.customActs,
            weekData.rowOrder,
        );
    }, [sheetData, weekData]);

    async function persist(patch: Partial<WeekData>, message?: string) {
        if (!weekKey) return;
        setIsSaving(true);
        setError(undefined);
        try {
            const saved = await saveWeekData(weekKey, patch);
            setWeekData(saved);
            if (message) setSuccess(message);
        } catch (saveError) {
            const messageText = saveError instanceof Error ? saveError.message : 'Unable to save changes.';
            setError(messageText);
            throw saveError;
        } finally {
            setIsSaving(false);
        }
    }

    async function handleSaveDetails() {
        if (!weekData) return;
        const overrides = {...weekData.overrides};
        overrides.title = details.title;
        overrides.date = details.date;
        overrides.host = details.host;
        overrides.serviceNotes = details.notes;
        Object.entries(details.team).forEach(([role, name]) => {
            overrides[`team-${role}`] = name;
        });
        await persist({overrides}, 'Service details saved.');
    }

    async function handleMove(index: number, direction: -1 | 1) {
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= computedSchedule.length) return;
        const order = computedSchedule.map((item) => item.id);
        [order[index], order[targetIndex]] = [order[targetIndex], order[index]];
        await persist({rowOrder: order});
    }

    function openCreate() {
        setItemForm({...EMPTY_ITEM, timeFrom: computedSchedule.at(-1)?.timeTo || ''});
        setEditingItem('new');
    }

    function openEdit(item: ScheduleItem) {
        setItemForm(itemToForm(item));
        setEditingItem(item);
    }

    async function handleSaveItem(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!weekData) return;

        if (editingItem === 'new') {
            const id = `custom-${Date.now()}`;
            const customItem: CustomAct = {
                id,
                event: itemForm.event.trim(),
                timeFrom: itemForm.timeFrom,
                timeTo: '',
                duration: itemForm.duration,
                host: itemForm.host,
                remarks: itemForm.remarks,
                isNew: true,
            };
            await persist({
                customActs: [...weekData.customActs, customItem],
                rowOrder: [...computedSchedule.map((item) => item.id), id],
            }, 'Service item added.');
        } else if (editingItem) {
            const overrides = {
                ...weekData.overrides,
                [`${editingItem.id}-event`]: itemForm.event.trim(),
                [`${editingItem.id}-timeFrom`]: itemForm.timeFrom,
                [`${editingItem.id}-duration`]: itemForm.duration,
                [`${editingItem.id}-host`]: itemForm.host,
                [`${editingItem.id}-remarks`]: itemForm.remarks,
            };
            await persist({overrides}, 'Service item updated.');
        }
        setEditingItem(null);
    }

    async function handleDuplicate(item: ScheduleItem) {
        if (!weekData) return;
        const id = `custom-${Date.now()}`;
        const customItem: CustomAct = {
            ...item,
            id,
            event: `${item.event} copy`,
            isNew: true,
            insertAfterId: item.id,
        };
        const order = computedSchedule.map((current) => current.id);
        const index = order.indexOf(item.id);
        order.splice(index + 1, 0, id);
        await persist({customActs: [...weekData.customActs, customItem], rowOrder: order}, 'Service item duplicated.');
    }

    async function handleDelete() {
        if (!weekData || !deletingItem) return;
        const rowOrder = computedSchedule.map((item) => item.id).filter((id) => id !== deletingItem.id);
        if (deletingItem.isCustom || deletingItem.isNew) {
            await persist({
                customActs: weekData.customActs.filter((item) => item.id !== deletingItem.id),
                rowOrder,
            }, 'Service item removed.');
        } else {
            await persist({
                overrides: {...weekData.overrides, [`${deletingItem.id}-hidden`]: 'true'},
                rowOrder,
            }, 'Service item removed.');
        }
        setDeletingItem(null);
    }

    async function handleReset() {
        if (!weekKey) return;
        setIsSaving(true);
        setError(undefined);
        try {
            const cleared = await clearWeekData(weekKey);
            setWeekData(cleared);
            if (sheetData) {
                setDetails({
                    title: sheetData.title,
                    date: sheetData.date,
                    host: sheetData.host,
                    notes: sheetData.notes || '',
                    team: sheetData.team,
                });
            }
            setIsResetOpen(false);
            setSuccess('This week was reset to the sheet source.');
        } catch (resetError) {
            setError(resetError instanceof Error ? resetError.message : 'Unable to reset this week.');
        } finally {
            setIsSaving(false);
        }
    }

    async function handlePublish() {
        if (!weekKey) return;
        setIsSaving(true);
        setError(undefined);
        try {
            const published = await publishWeekData(weekKey);
            setWeekData(published);
            setSuccess('Service published to the public page.');
        } catch (publishError) {
            setError(publishError instanceof Error ? publishError.message : 'Unable to publish this service.');
        } finally {
            setIsSaving(false);
        }
    }

    const columns: TableColumn<ScheduleItem>[] = [
        {
            key: 'timeFrom',
            header: 'Time',
            width: pixel(120),
            renderCell: (item) => (
                <VStack gap={0.5}>
                    <Text weight="semibold" hasTabularNumbers>{item.timeFrom}</Text>
                    <Text type="supporting" color="secondary" hasTabularNumbers>{item.timeTo} · {item.duration || '0'} min</Text>
                </VStack>
            ),
        },
        {
            key: 'event',
            header: 'Service flow',
            width: proportional(2),
            renderCell: (item) => (
                <VStack gap={0.5}>
                    <HStack gap={1.5} vAlign="center">
                        <Text weight="semibold">{item.event}</Text>
                        {item.isCustom || item.isNew ? <Badge label="Native" variant="info" /> : null}
                    </HStack>
                    {item.remarks ? <Text type="supporting" color="secondary" maxLines={2}>{item.remarks}</Text> : null}
                </VStack>
            ),
        },
        {
            key: 'host',
            header: 'Owner',
            width: proportional(1),
            renderCell: (item) => <Text color={item.host ? 'primary' : 'secondary'}>{item.host || 'Unassigned'}</Text>,
        },
        {
            key: 'actions',
            header: '',
            width: pixel(188),
            align: 'end',
            resizable: false,
            renderCell: (item) => {
                const index = computedSchedule.findIndex((current) => current.id === item.id);
                return (
                    <HStack gap={0.5} hAlign="end">
                        <IconButton label={`Move ${item.event} up`} icon={<Icon icon={ArrowUp} />} variant="ghost" size="sm" isDisabled={index <= 0} onClick={() => handleMove(index, -1)} />
                        <IconButton label={`Move ${item.event} down`} icon={<Icon icon={ArrowDown} />} variant="ghost" size="sm" isDisabled={index === computedSchedule.length - 1} onClick={() => handleMove(index, 1)} />
                        <IconButton label={`Duplicate ${item.event}`} icon={<Icon icon={Copy} />} variant="ghost" size="sm" onClick={() => handleDuplicate(item)} />
                        <IconButton label={`Edit ${item.event}`} icon={<Icon icon={Pencil} />} variant="ghost" size="sm" onClick={() => openEdit(item)} />
                        <IconButton label={`Remove ${item.event}`} icon={<Icon icon={Trash2} />} variant="ghost" size="sm" onClick={() => setDeletingItem(item)} />
                    </HStack>
                );
            },
        },
    ];

    if (isLoading) {
        return (
            <Layout content={<LayoutContent padding={6}><ProgressBar label="Loading service planner" isIndeterminate /></LayoutContent>} />
        );
    }

    if (!sheetData || !weekData) {
        return (
            <Layout content={<LayoutContent padding={6}><Banner status="error" title="Unable to open the service planner" description={error || 'Service data is unavailable.'} /></LayoutContent>} />
        );
    }

    const detailsEditor = (
        <ServiceDetails
            details={details}
            isSaving={isSaving}
            onDetailsChange={setDetails}
            onSaveDetails={handleSaveDetails}
        />
    );

    return (
        <>
            <Layout
                height="fill"
                header={
                    <LayoutHeader hasDivider padding={4}>
                        <HStack gap={4} hAlign="between" vAlign="center" wrap="wrap">
                            <VStack gap={1}>
                                <HStack gap={2} vAlign="center" wrap="wrap">
                                    <Heading level={1}>Service planner</Heading>
                                    <Badge label={weekData.status === 'published' ? 'Published' : 'Draft'} variant={weekData.status === 'published' ? 'success' : 'warning'} />
                                </HStack>
                                <HStack gap={2} vAlign="center" wrap="wrap">
                                    <StatusDot variant={weekData.status === 'published' ? 'success' : 'warning'} label={weekData.status === 'published' ? 'Published' : 'Draft changes'} />
                                    <Text type="supporting" color="secondary">Week {weekKey}</Text>
                                    {weekData.publishedAt ? (
                                        <Text type="supporting" color="secondary">· Published <Timestamp value={weekData.publishedAt} format="relative" isLive /></Text>
                                    ) : null}
                                </HStack>
                            </VStack>
                            <HStack gap={2} vAlign="center" wrap="wrap">
                                <Button label="Reset" variant="ghost" icon={<Icon icon={RotateCcw} />} onClick={() => setIsResetOpen(true)} />
                                <Button label="Preview" variant="secondary" icon={<Icon icon={Eye} />} href="/" target="_blank" />
                                <Button label="Publish" variant="primary" icon={<Icon icon={Send} />} onClick={handlePublish} isLoading={isSaving} />
                            </HStack>
                        </HStack>
                    </LayoutHeader>
                }
                content={
                    <LayoutContent padding={4}>
                        <VStack gap={3}>
                            <Banner
                                status="info"
                                title="Native content is now in control"
                                description="The Google Sheet supplies the initial service order only. Songs and announcements are managed in their own pages and appear automatically in the main OS."
                                isDismissable
                            />
                            {success ? <Banner status="success" title={success} isDismissable onDismiss={() => setSuccess(undefined)} /> : null}
                            {error ? <Banner status="error" title="Changes were not saved" description={error} isDismissable onDismiss={() => setError(undefined)} /> : null}
                            {isMobile ? (
                                <Card padding={4}>
                                    <Collapsible trigger="Service details" defaultIsOpen={false}>
                                        <VStack paddingBlock={4}>{detailsEditor}</VStack>
                                    </Collapsible>
                                </Card>
                            ) : null}
                            <HStack gap={3} hAlign="between" vAlign="center" wrap="wrap">
                                <VStack gap={0.5}>
                                    <Heading level={2}>Service flow</Heading>
                                    <Text type="supporting" color="secondary">Estimated times cascade automatically from each item’s duration; live progress may differ.</Text>
                                </VStack>
                                <Button label="Add item" variant="secondary" icon={<Icon icon={Plus} />} onClick={openCreate} />
                            </HStack>
                            {isMobile ? (
                                computedSchedule.length ? (
                                    <List density="compact" hasDividers>
                                        {computedSchedule.map((item, index) => (
                                            <ListItem
                                                key={item.id}
                                                label={item.event}
                                                description={`${item.timeFrom}–${item.timeTo} · ${item.duration || '0'} min${item.host ? ` · ${item.host}` : ''}`}
                                                startContent={<Text weight="semibold" hasTabularNumbers>{String(index + 1).padStart(2, '0')}</Text>}
                                                endContent={
                                                    <HStack gap={0.5}>
                                                        <IconButton label={`Move ${item.event} up`} icon={<Icon icon={ArrowUp} />} variant="ghost" size="sm" isDisabled={index === 0} onClick={() => handleMove(index, -1)} />
                                                        <IconButton label={`Move ${item.event} down`} icon={<Icon icon={ArrowDown} />} variant="ghost" size="sm" isDisabled={index === computedSchedule.length - 1} onClick={() => handleMove(index, 1)} />
                                                        <IconButton label={`Edit ${item.event}`} icon={<Icon icon={Pencil} />} variant="ghost" size="sm" onClick={() => openEdit(item)} />
                                                    </HStack>
                                                }
                                                onClick={() => openEdit(item)}
                                            />
                                        ))}
                                    </List>
                                ) : (
                                    <EmptyState title="No service items" description="Add the first item to build this service." actions={<Button label="Add item" variant="primary" onClick={openCreate} />} />
                                )
                            ) : (
                                <Table
                                    data={computedSchedule}
                                    columns={columns}
                                    idKey="id"
                                    density="compact"
                                    dividers="rows"
                                    hasHover
                                    verticalAlign="top"
                                    emptyState={<EmptyState title="No service items" description="Add the first item to build this service." isCompact />}
                                />
                            )}
                        </VStack>
                    </LayoutContent>
                }
                end={!isMobile ? (
                    <LayoutPanel width={360} hasDivider padding={4} role="complementary" label="Service details">
                        {detailsEditor}
                    </LayoutPanel>
                ) : undefined}
            />
            <Dialog
                isOpen={editingItem !== null}
                onOpenChange={(open) => {
                    if (!open && !isSaving) setEditingItem(null);
                }}
                purpose="form"
                width={isMobile ? 'calc(100% - 32px)' : 560}
                maxHeight="90vh"
                padding={0}
            >
                <form onSubmit={handleSaveItem}>
                    <Layout
                        height="auto"
                        header={
                            <DialogHeader
                                title={editingItem === 'new' ? 'Add service item' : 'Edit service item'}
                                subtitle="Start time anchors the first item; later items follow the duration cascade."
                                onOpenChange={() => setEditingItem(null)}
                                hasDivider
                            />
                        }
                        content={
                            <LayoutContent padding={4}>
                                <VStack gap={4}>
                                    <TextInput label="Item name" value={itemForm.event} onChange={(eventName) => setItemForm((form) => ({...form, event: eventName}))} isRequired hasAutoFocus />
                                    <HStack gap={3} vAlign="start" wrap="wrap">
                                        <TextInput label="Start time" value={itemForm.timeFrom} onChange={(timeFrom) => setItemForm((form) => ({...form, timeFrom}))} placeholder="10:00 AM" width={180} />
                                        <NumberInput label="Duration" value={Number.parseInt(itemForm.duration, 10) || null} onChange={(duration) => setItemForm((form) => ({...form, duration: String(duration)}))} min={0} max={240} units="min" hasClear width={180} />
                                    </HStack>
                                    <TextInput label="Owner / host" value={itemForm.host} onChange={(host) => setItemForm((form) => ({...form, host}))} isOptional />
                                    <TextArea label="Remarks" value={itemForm.remarks} onChange={(remarks) => setItemForm((form) => ({...form, remarks}))} rows={4} isOptional />
                                </VStack>
                            </LayoutContent>
                        }
                        footer={
                            <LayoutFooter hasDivider padding={3}>
                                <HStack gap={2} hAlign="between" vAlign="center" wrap="wrap">
                                    {editingItem && editingItem !== 'new' ? (
                                        <HStack gap={1}>
                                            <IconButton
                                                label={`Duplicate ${editingItem.event}`}
                                                icon={<Icon icon={Copy} />}
                                                variant="ghost"
                                                clickAction={async () => {
                                                    await handleDuplicate(editingItem);
                                                    setEditingItem(null);
                                                }}
                                            />
                                            <IconButton
                                                label={`Remove ${editingItem.event}`}
                                                icon={<Icon icon={Trash2} />}
                                                variant="ghost"
                                                onClick={() => {
                                                    setDeletingItem(editingItem);
                                                    setEditingItem(null);
                                                }}
                                            />
                                        </HStack>
                                    ) : <Text type="supporting" color="secondary">New service item</Text>}
                                    <HStack gap={2}>
                                        <Button label="Cancel" variant="ghost" onClick={() => setEditingItem(null)} isDisabled={isSaving} />
                                        <Button label="Save item" variant="primary" type="submit" isLoading={isSaving} isDisabled={!itemForm.event.trim()} />
                                    </HStack>
                                </HStack>
                            </LayoutFooter>
                        }
                    />
                </form>
            </Dialog>
            <AlertDialog
                isOpen={deletingItem !== null}
                onOpenChange={(open) => {
                    if (!open && !isSaving) setDeletingItem(null);
                }}
                title={`Remove “${deletingItem?.event || ''}”?`}
                description="It will disappear from this week’s service flow. You can restore the original sheet version by resetting the week."
                actionLabel="Remove"
                actionVariant="destructive"
                isActionLoading={isSaving}
                onAction={handleDelete}
            />
            <AlertDialog
                isOpen={isResetOpen}
                onOpenChange={(open) => {
                    if (!isSaving) setIsResetOpen(open);
                }}
                title="Reset this week?"
                description="This clears all weekly edits and the published snapshot, then returns to the current Google Sheet service order."
                actionLabel="Reset week"
                actionVariant="destructive"
                isActionLoading={isSaving}
                onAction={handleReset}
            />
        </>
    );
}
