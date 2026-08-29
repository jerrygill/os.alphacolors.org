'use client';

import {FormEvent, useEffect, useMemo, useState, type ReactNode} from 'react';
import {
    closestCenter,
    DndContext,
    DragOverlay,
    KeyboardSensor,
    MouseSensor,
    TouchSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
    type DragStartEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
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
import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableHeaderCell,
    TableRow,
} from '@astryxdesign/core/Table';
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
    GripVertical,
    Megaphone,
    Music2,
    Pencil,
    Plus,
    RotateCcw,
    Send,
    Trash2,
} from 'lucide-react';
import {getSheetGid, getWeekKey} from '@/lib/date-utils';
import {getLibrary} from '@/lib/library';
import type {Announcement, Song} from '@/lib/library-types';
import {
    areWeekDraftsEqual,
    editableWeekData,
    moveId,
    moveIdByOffset,
} from '@/lib/planner-draft';
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
import ServiceContentPicker, {type ServiceContentOption} from './ServiceContentPicker';
import {
    getServiceContentKind,
    isLegacyServiceDetailRemark,
    type ServiceContentKind,
} from './service-details';

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
    onDetailsChange: (details: ServiceDetailsState) => void;
}

function ServiceDetails({
    details,
    onDetailsChange,
}: ServiceDetailsProps) {
    return (
        <VStack gap={5}>
            <VStack gap={1}>
                <Heading level={2}>Service details</Heading>
                <Text type="supporting" color="secondary">These fields join the planner draft automatically.</Text>
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
            </VStack>
        </VStack>
    );
}

function detailsFromWeek(service: ServiceData, week: WeekData): ServiceDetailsState {
    return {
        title: week.overrides.title ?? service.title,
        date: week.overrides.date ?? service.date,
        host: week.overrides.host ?? service.host,
        notes: week.overrides.serviceNotes ?? service.notes ?? '',
        team: Object.fromEntries(
            Object.entries(service.team).map(([role, name]) => [
                role,
                week.overrides[`team-${role}`] ?? name,
            ]),
        ),
    };
}

interface SortablePlannerItemProps {
    item: ScheduleItem;
    index: number;
    count: number;
    contentControl: ReactNode;
    onMove: (id: string, offset: -1 | 1) => void;
    onDuplicate: (item: ScheduleItem) => void;
    onEdit: (item: ScheduleItem) => void;
    onDelete: (item: ScheduleItem) => void;
}

function PlannerDragHandle({
    item,
    setActivatorNodeRef,
    attributes,
    listeners,
}: {
    item: ScheduleItem;
    setActivatorNodeRef: (element: HTMLElement | null) => void;
    attributes: ReturnType<typeof useSortable>['attributes'];
    listeners: ReturnType<typeof useSortable>['listeners'];
}) {
    return (
        <IconButton
            ref={setActivatorNodeRef}
            label={`Drag ${item.event} to reorder`}
            tooltip="Drag to reorder"
            icon={<Icon icon={GripVertical} />}
            variant="ghost"
            size="sm"
            {...attributes}
            {...listeners}
        />
    );
}

function SortablePlannerMobileItem({
    item,
    index,
    count,
    contentControl,
    onMove,
    onEdit,
}: SortablePlannerItemProps) {
    const {attributes, listeners, setActivatorNodeRef, setNodeRef, isDragging} = useSortable({id: item.id});
    return (
        <ListItem
            ref={setNodeRef}
            data-dragging={isDragging || undefined}
            label={item.event}
            description={
                <VStack gap={1.5}>
                    <Text type="supporting" color="secondary" hasTabularNumbers>
                        {item.timeFrom}–{item.timeTo} · {item.duration || '0'} min{item.host ? ` · ${item.host}` : ''}
                    </Text>
                    {item.remarks && !isLegacyServiceDetailRemark(item) ? (
                        <Text type="supporting" color="secondary" maxLines={2}>{item.remarks}</Text>
                    ) : null}
                    {contentControl}
                </VStack>
            }
            startContent={
                <PlannerDragHandle
                    item={item}
                    setActivatorNodeRef={setActivatorNodeRef}
                    attributes={attributes}
                    listeners={listeners}
                />
            }
            endContent={
                <HStack gap={0.5}>
                    <IconButton label={`Move ${item.event} up`} tooltip="Move up" icon={<Icon icon={ArrowUp} />} variant="ghost" size="sm" isDisabled={index === 0} onClick={() => onMove(item.id, -1)} />
                    <IconButton label={`Move ${item.event} down`} tooltip="Move down" icon={<Icon icon={ArrowDown} />} variant="ghost" size="sm" isDisabled={index === count - 1} onClick={() => onMove(item.id, 1)} />
                    <IconButton label={`Edit ${item.event}`} tooltip="Edit" icon={<Icon icon={Pencil} />} variant="ghost" size="sm" onClick={() => onEdit(item)} />
                </HStack>
            }
        />
    );
}

function SortablePlannerTableRow({
    item,
    index,
    count,
    contentControl,
    onMove,
    onDuplicate,
    onEdit,
    onDelete,
}: SortablePlannerItemProps) {
    const {attributes, listeners, setActivatorNodeRef, setNodeRef, isDragging} = useSortable({id: item.id});
    return (
        <TableRow ref={setNodeRef} data-dragging={isDragging || undefined}>
            <TableCell>
                <PlannerDragHandle
                    item={item}
                    setActivatorNodeRef={setActivatorNodeRef}
                    attributes={attributes}
                    listeners={listeners}
                />
            </TableCell>
            <TableCell>
                <VStack gap={0.5}>
                    <Text weight="semibold" hasTabularNumbers>{item.timeFrom}</Text>
                    <Text type="supporting" color="secondary" hasTabularNumbers>{item.timeTo} · {item.duration || '0'} min</Text>
                </VStack>
            </TableCell>
            <TableCell>
                <VStack gap={1.5}>
                    <HStack gap={1.5} vAlign="center">
                        <Text weight="semibold">{item.event}</Text>
                        {item.isCustom || item.isNew ? <Badge label="Native" variant="info" /> : null}
                    </HStack>
                    {item.remarks && !isLegacyServiceDetailRemark(item) ? (
                        <Text type="supporting" color="secondary" maxLines={2}>{item.remarks}</Text>
                    ) : null}
                    {contentControl}
                </VStack>
            </TableCell>
            <TableCell>
                <Text color={item.host ? 'primary' : 'secondary'}>{item.host || 'Unassigned'}</Text>
            </TableCell>
            <TableCell>
                <HStack gap={0.5} hAlign="end">
                    <IconButton label={`Move ${item.event} up`} icon={<Icon icon={ArrowUp} />} variant="ghost" size="sm" isDisabled={index === 0} onClick={() => onMove(item.id, -1)} />
                    <IconButton label={`Move ${item.event} down`} icon={<Icon icon={ArrowDown} />} variant="ghost" size="sm" isDisabled={index === count - 1} onClick={() => onMove(item.id, 1)} />
                    <IconButton label={`Duplicate ${item.event}`} icon={<Icon icon={Copy} />} variant="ghost" size="sm" onClick={() => onDuplicate(item)} />
                    <IconButton label={`Edit ${item.event}`} icon={<Icon icon={Pencil} />} variant="ghost" size="sm" onClick={() => onEdit(item)} />
                    <IconButton label={`Remove ${item.event}`} icon={<Icon icon={Trash2} />} variant="ghost" size="sm" onClick={() => onDelete(item)} />
                </HStack>
            </TableCell>
        </TableRow>
    );
}

export default function ServicePlanner() {
    const isMobile = useMediaQuery('(max-width: 767px)');
    const [sheetData, setSheetData] = useState<ServiceData | null>(null);
    const [savedWeekData, setSavedWeekData] = useState<WeekData | null>(null);
    const [draftWeekData, setDraftWeekData] = useState<WeekData | null>(null);
    const [songs, setSongs] = useState<Song[]>([]);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [weekKey, setWeekKey] = useState('');
    const [savedDetails, setSavedDetails] = useState<ServiceDetailsState>(EMPTY_DETAILS);
    const [details, setDetails] = useState<ServiceDetailsState>(EMPTY_DETAILS);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string>();
    const [success, setSuccess] = useState<string>();
    const [editingItem, setEditingItem] = useState<ScheduleItem | 'new' | null>(null);
    const [itemForm, setItemForm] = useState<ScheduleItemFormState>(EMPTY_ITEM);
    const [deletingItem, setDeletingItem] = useState<ScheduleItem | null>(null);
    const [isResetOpen, setIsResetOpen] = useState(false);
    const [contentPickerKind, setContentPickerKind] = useState<ServiceContentKind | null>(null);
    const [activeRowId, setActiveRowId] = useState<string>();
    const sensors = useSensors(
        useSensor(MouseSensor, {activationConstraint: {distance: 6}}),
        useSensor(TouchSensor, {activationConstraint: {delay: 150, tolerance: 5}}),
        useSensor(KeyboardSensor, {coordinateGetter: sortableKeyboardCoordinates}),
    );

    useEffect(() => {
        let isMounted = true;

        async function load() {
            setIsLoading(true);
            setError(undefined);
            const today = new Date();
            const currentWeekKey = getWeekKey(today);
            setWeekKey(currentWeekKey);

            try {
                const [service, savedWeek, loadedSongs, loadedAnnouncements] = await Promise.all([
                    fetchSheetData(getSheetGid(today)),
                    getWeekData(currentWeekKey, true),
                    getLibrary<Song>('songs'),
                    getLibrary<Announcement>('announcements'),
                ]);
                if (!isMounted) return;

                setSheetData(service);
                setSavedWeekData(savedWeek);
                setDraftWeekData(savedWeek);
                setSongs(loadedSongs);
                setAnnouncements(loadedAnnouncements);
                const loadedDetails = detailsFromWeek(service, savedWeek);
                setSavedDetails(loadedDetails);
                setDetails(loadedDetails);
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
        if (!sheetData || !draftWeekData) return [];
        return recalculateSchedule(
            sheetData.schedule,
            draftWeekData.overrides,
            draftWeekData.customActs,
            draftWeekData.rowOrder,
        );
    }, [sheetData, draftWeekData]);

    const hasUnsavedChanges = Boolean(savedWeekData && draftWeekData) && (
        !areWeekDraftsEqual(editableWeekData(savedWeekData!), editableWeekData(draftWeekData!))
        || JSON.stringify(savedDetails) !== JSON.stringify(details)
    );
    const activeRow = activeRowId
        ? computedSchedule.find((item) => item.id === activeRowId)
        : undefined;

    const songOptions = useMemo<ServiceContentOption[]>(() => songs.map((song) => ({
        id: song.id,
        title: song.title,
        supportingText: song.artist || undefined,
    })), [songs]);
    const announcementOptions = useMemo<ServiceContentOption[]>(() => announcements.map((announcement) => ({
        id: announcement.id,
        title: announcement.title,
        supportingText: [
            announcement.speaker,
            announcement.isActive ? '' : 'Inactive',
        ].filter(Boolean).join(' · ') || undefined,
    })), [announcements]);

    function optionsForKind(kind: ServiceContentKind): ServiceContentOption[] {
        return kind === 'songs' ? songOptions : announcementOptions;
    }

    function selectedIdsForKind(kind: ServiceContentKind): string[] {
        if (!draftWeekData) return [];
        return kind === 'songs' ? draftWeekData.songIds : draftWeekData.announcementIds;
    }

    function selectedOptionsForKind(kind: ServiceContentKind): ServiceContentOption[] {
        const optionMap = new Map(optionsForKind(kind).map((option) => [option.id, option]));
        return selectedIdsForKind(kind)
            .map((id) => optionMap.get(id))
            .filter((option): option is ServiceContentOption => Boolean(option));
    }

    function selectionSummary(kind: ServiceContentKind): string {
        const selected = selectedOptionsForKind(kind);
        const noun = kind === 'songs' ? 'song' : 'announcement';
        if (!selected.length) return `No ${noun}s selected`;

        const titles = selected.slice(0, 2).map((item) => item.title).join(', ');
        const remaining = selected.length > 2 ? `, +${selected.length - 2}` : '';
        return `${selected.length} ${noun}${selected.length === 1 ? '' : 's'} selected · ${titles}${remaining}`;
    }

    function renderContentControl(item: ScheduleItem) {
        const kind = getServiceContentKind(item);
        if (!kind) return null;
        const noun = kind === 'songs' ? 'songs' : 'announcements';

        return (
            <VStack gap={1.5}>
                <Text type="supporting" color="secondary" maxLines={2}>{selectionSummary(kind)}</Text>
                <Button
                    label={`Choose ${noun}`}
                    variant="secondary"
                    size="sm"
                    icon={<Icon icon={kind === 'songs' ? Music2 : Megaphone} />}
                    onClick={(event) => {
                        event.stopPropagation();
                        setContentPickerKind(kind);
                    }}
                />
            </VStack>
        );
    }

    function applyContentSelection(kind: ServiceContentKind, selectedIds: string[]) {
        setDraftWeekData((current) => current ? {
            ...current,
            ...(kind === 'songs'
                ? {songIds: selectedIds}
                : {announcementIds: selectedIds}),
        } : current);
    }

    function handleLibraryItemCreated(kind: ServiceContentKind, item: Song | Announcement) {
        if (kind === 'songs') {
            const song = item as Song;
            setSongs((current) => current.some((song) => song.id === item.id)
                ? current
                : [...current, song]);
            return;
        }
        const announcement = item as Announcement;
        setAnnouncements((current) => current.some((announcement) => announcement.id === item.id)
            ? current
            : [...current, announcement]);
    }

    function overridesWithDetails(): WeekData['overrides'] {
        const overrides = {...(draftWeekData?.overrides || {})};
        overrides.title = details.title;
        overrides.date = details.date;
        overrides.host = details.host;
        overrides.serviceNotes = details.notes;
        Object.entries(details.team).forEach(([role, name]) => {
            overrides[`team-${role}`] = name;
        });
        return overrides;
    }

    async function handleSaveChanges() {
        if (!weekKey || !draftWeekData || !hasUnsavedChanges) return;
        setIsSaving(true);
        setError(undefined);
        try {
            const payload = editableWeekData({
                ...draftWeekData,
                overrides: overridesWithDetails(),
            });
            const saved = await saveWeekData(weekKey, payload);
            setSavedWeekData(saved);
            setDraftWeekData(saved);
            setSavedDetails(details);
            setSuccess('Planner changes saved. Publish when this service is ready.');
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : 'Unable to save changes.');
        } finally {
            setIsSaving(false);
        }
    }

    function handleDiscardChanges() {
        if (!savedWeekData) return;
        setDraftWeekData(savedWeekData);
        setDetails(savedDetails);
        setError(undefined);
        setSuccess('Unsaved changes discarded.');
    }

    function handleMove(id: string, direction: -1 | 1) {
        const order = computedSchedule.map((item) => item.id);
        setDraftWeekData((current) => current ? {
            ...current,
            rowOrder: moveIdByOffset(order, id, direction),
        } : current);
    }

    function handleRowDragStart(event: DragStartEvent) {
        setActiveRowId(String(event.active.id));
    }

    function handleRowDragEnd(event: DragEndEvent) {
        const activeId = String(event.active.id);
        const overId = event.over ? String(event.over.id) : undefined;
        if (overId && overId !== activeId) {
            const order = computedSchedule.map((item) => item.id);
            setDraftWeekData((current) => current ? {
                ...current,
                rowOrder: moveId(order, activeId, overId),
            } : current);
        }
        setActiveRowId(undefined);
    }

    function openCreate() {
        setItemForm({...EMPTY_ITEM, timeFrom: computedSchedule.at(-1)?.timeTo || ''});
        setEditingItem('new');
    }

    function openEdit(item: ScheduleItem) {
        setItemForm(itemToForm(item));
        setEditingItem(item);
    }

    function handleSaveItem(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!draftWeekData) return;

        if (editingItem === 'new') {
            const id = `custom-${globalThis.crypto.randomUUID()}`;
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
            setDraftWeekData({
                ...draftWeekData,
                customActs: [...draftWeekData.customActs, customItem],
                rowOrder: [...computedSchedule.map((item) => item.id), id],
            });
        } else if (editingItem) {
            const overrides = {
                ...draftWeekData.overrides,
                [`${editingItem.id}-event`]: itemForm.event.trim(),
                [`${editingItem.id}-timeFrom`]: itemForm.timeFrom,
                [`${editingItem.id}-duration`]: itemForm.duration,
                [`${editingItem.id}-host`]: itemForm.host,
                [`${editingItem.id}-remarks`]: itemForm.remarks,
            };
            setDraftWeekData({...draftWeekData, overrides});
        }
        setEditingItem(null);
    }

    function handleDuplicate(item: ScheduleItem) {
        if (!draftWeekData) return;
        const id = `custom-${globalThis.crypto.randomUUID()}`;
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
        setDraftWeekData({
            ...draftWeekData,
            customActs: [...draftWeekData.customActs, customItem],
            rowOrder: order,
        });
    }

    function handleDelete() {
        if (!draftWeekData || !deletingItem) return;
        const rowOrder = computedSchedule.map((item) => item.id).filter((id) => id !== deletingItem.id);
        if (deletingItem.isCustom || deletingItem.isNew) {
            setDraftWeekData({
                ...draftWeekData,
                customActs: draftWeekData.customActs.filter((item) => item.id !== deletingItem.id),
                rowOrder,
            });
        } else {
            setDraftWeekData({
                ...draftWeekData,
                overrides: {...draftWeekData.overrides, [`${deletingItem.id}-hidden`]: 'true'},
                rowOrder,
            });
        }
        setDeletingItem(null);
    }

    async function handleReset() {
        if (!weekKey) return;
        setIsSaving(true);
        setError(undefined);
        try {
            const cleared = await clearWeekData(weekKey);
            setSavedWeekData(cleared);
            setDraftWeekData(cleared);
            if (sheetData) {
                const resetDetails = detailsFromWeek(sheetData, cleared);
                setSavedDetails(resetDetails);
                setDetails(resetDetails);
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
        if (!weekKey || hasUnsavedChanges) return;
        setIsSaving(true);
        setError(undefined);
        try {
            const published = await publishWeekData(weekKey);
            setSavedWeekData(published);
            setDraftWeekData(published);
            setSuccess('Service published to the public page.');
        } catch (publishError) {
            setError(publishError instanceof Error ? publishError.message : 'Unable to publish this service.');
        } finally {
            setIsSaving(false);
        }
    }

    if (isLoading) {
        return (
            <Layout content={<LayoutContent padding={6}><ProgressBar label="Loading service planner" isIndeterminate /></LayoutContent>} />
        );
    }

    if (!sheetData || !savedWeekData || !draftWeekData) {
        return (
            <Layout content={<LayoutContent padding={6}><Banner status="error" title="Unable to open the service planner" description={error || 'Service data is unavailable.'} /></LayoutContent>} />
        );
    }

    const detailsEditor = (
        <ServiceDetails
            details={details}
            onDetailsChange={setDetails}
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
                                    <Badge
                                        label={hasUnsavedChanges ? 'Unsaved changes' : savedWeekData.status === 'published' ? 'Published' : 'Draft'}
                                        variant={hasUnsavedChanges ? 'warning' : savedWeekData.status === 'published' ? 'success' : 'neutral'}
                                    />
                                </HStack>
                                <HStack gap={2} vAlign="center" wrap="wrap">
                                    <StatusDot
                                        variant={hasUnsavedChanges ? 'warning' : savedWeekData.status === 'published' ? 'success' : 'neutral'}
                                        label={hasUnsavedChanges ? 'Changes stay local until saved' : savedWeekData.status === 'published' ? 'Published' : 'Saved draft'}
                                    />
                                    <Text type="supporting" color="secondary">Week {weekKey}</Text>
                                    {savedWeekData.publishedAt ? (
                                        <Text type="supporting" color="secondary">· Published <Timestamp value={savedWeekData.publishedAt} format="relative" isLive /></Text>
                                    ) : null}
                                </HStack>
                            </VStack>
                            <HStack gap={2} vAlign="center" wrap="wrap">
                                <Button label="Reset" variant="ghost" icon={<Icon icon={RotateCcw} />} onClick={() => setIsResetOpen(true)} />
                                <Button label="Preview" variant="secondary" icon={<Icon icon={Eye} />} href="/" target="_blank" />
                                <Button label="Discard changes" variant="ghost" onClick={handleDiscardChanges} isDisabled={!hasUnsavedChanges || isSaving} />
                                <Button label="Save changes" variant="primary" onClick={handleSaveChanges} isLoading={isSaving} isDisabled={!hasUnsavedChanges} />
                                <Button label="Publish" variant="secondary" icon={<Icon icon={Send} />} onClick={handlePublish} isDisabled={hasUnsavedChanges || isSaving} />
                            </HStack>
                        </HStack>
                    </LayoutHeader>
                }
                content={
                    <LayoutContent padding={4}>
                        <VStack gap={3}>
                            {hasUnsavedChanges ? (
                                <Banner
                                    status="warning"
                                    title="Unsaved planner changes"
                                    description="Review the service, then save once. Publish becomes available after the draft is saved."
                                />
                            ) : null}
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
                            {computedSchedule.length ? (
                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragStart={handleRowDragStart}
                                    onDragCancel={() => setActiveRowId(undefined)}
                                    onDragEnd={handleRowDragEnd}
                                >
                                    <SortableContext items={computedSchedule.map((item) => item.id)} strategy={verticalListSortingStrategy}>
                                        {isMobile ? (
                                            <List density="compact" hasDividers>
                                                {computedSchedule.map((item, index) => (
                                                    <SortablePlannerMobileItem
                                                        key={item.id}
                                                        item={item}
                                                        index={index}
                                                        count={computedSchedule.length}
                                                        contentControl={renderContentControl(item)}
                                                        onMove={handleMove}
                                                        onDuplicate={handleDuplicate}
                                                        onEdit={openEdit}
                                                        onDelete={setDeletingItem}
                                                    />
                                                ))}
                                            </List>
                                        ) : (
                                            <Table density="compact" dividers="rows" hasHover verticalAlign="top">
                                                <TableHeader>
                                                    <TableRow isHeaderRow>
                                                        <TableHeaderCell>Order</TableHeaderCell>
                                                        <TableHeaderCell>Time</TableHeaderCell>
                                                        <TableHeaderCell>Service flow</TableHeaderCell>
                                                        <TableHeaderCell>Owner</TableHeaderCell>
                                                        <TableHeaderCell>Actions</TableHeaderCell>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {computedSchedule.map((item, index) => (
                                                        <SortablePlannerTableRow
                                                            key={item.id}
                                                            item={item}
                                                            index={index}
                                                            count={computedSchedule.length}
                                                            contentControl={renderContentControl(item)}
                                                            onMove={handleMove}
                                                            onDuplicate={handleDuplicate}
                                                            onEdit={openEdit}
                                                            onDelete={setDeletingItem}
                                                        />
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        )}
                                    </SortableContext>
                                    <DragOverlay>
                                        {activeRow ? (
                                            <Card variant="default" padding={2}>
                                                <HStack gap={2} vAlign="center">
                                                    <Icon icon={GripVertical} color="secondary" />
                                                    <Text weight="semibold">{activeRow.timeFrom} · {activeRow.event}</Text>
                                                </HStack>
                                            </Card>
                                        ) : null}
                                    </DragOverlay>
                                </DndContext>
                            ) : (
                                <EmptyState title="No service items" description="Add the first item to build this service." actions={<Button label="Add item" variant="primary" onClick={openCreate} />} />
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
            {contentPickerKind ? (
                <ServiceContentPicker
                    kind={contentPickerKind}
                    items={optionsForKind(contentPickerKind)}
                    selectedIds={selectedIdsForKind(contentPickerKind)}
                    isOpen
                    isMobile={isMobile}
                    onClose={() => setContentPickerKind(null)}
                    onApply={(selectedIds) => applyContentSelection(contentPickerKind, selectedIds)}
                    onItemCreated={(item) => handleLibraryItemCreated(contentPickerKind, item)}
                />
            ) : null}
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
                                                onClick={() => {
                                                    handleDuplicate(editingItem);
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
                description="This clears all weekly edits, content selections, and the published snapshot, then returns to the current Google Sheet service order."
                actionLabel="Reset week"
                actionVariant="destructive"
                isActionLoading={isSaving}
                onAction={handleReset}
            />
        </>
    );
}
