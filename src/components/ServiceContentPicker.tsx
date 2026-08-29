'use client';

import {useEffect, useMemo, useRef, useState} from 'react';
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
import {Badge} from '@astryxdesign/core/Badge';
import {Button} from '@astryxdesign/core/Button';
import {Card} from '@astryxdesign/core/Card';
import {Dialog, DialogHeader} from '@astryxdesign/core/Dialog';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {Icon} from '@astryxdesign/core/Icon';
import {IconButton} from '@astryxdesign/core/IconButton';
import {Layout, LayoutContent, LayoutFooter} from '@astryxdesign/core/Layout';
import {List, ListItem} from '@astryxdesign/core/List';
import {MultiSelector} from '@astryxdesign/core/MultiSelector';
import {HStack, VStack} from '@astryxdesign/core/Stack';
import {Heading, Text} from '@astryxdesign/core/Text';
import {ArrowDown, ArrowUp, GripVertical, Plus, X} from 'lucide-react';
import type {Announcement, Song} from '@/lib/library-types';
import {moveId, moveIdByOffset} from '@/lib/planner-draft';
import LibraryQuickCreateDialog from './LibraryQuickCreateDialog';
import type {ServiceContentKind} from './service-details';

export interface ServiceContentOption {
    id: string;
    title: string;
    supportingText?: string;
}

interface ServiceContentPickerProps {
    kind: ServiceContentKind;
    items: ServiceContentOption[];
    selectedIds: string[];
    isOpen: boolean;
    isMobile: boolean;
    onClose: () => void;
    onApply: (selectedIds: string[]) => void;
    onItemCreated: (item: Song | Announcement) => void;
}

interface SortableSelectedItemProps {
    item: ServiceContentOption;
    index: number;
    count: number;
    onMove: (id: string, offset: -1 | 1) => void;
    onRemove: (id: string) => void;
}

function SortableSelectedItem({
    item,
    index,
    count,
    onMove,
    onRemove,
}: SortableSelectedItemProps) {
    const {
        attributes,
        listeners,
        setActivatorNodeRef,
        setNodeRef,
        isDragging,
    } = useSortable({id: item.id});

    return (
        <ListItem
            ref={setNodeRef}
            data-dragging={isDragging || undefined}
            label={item.title}
            description={item.supportingText}
            startContent={
                <HStack gap={1} vAlign="center">
                    <IconButton
                        ref={setActivatorNodeRef}
                        label={`Drag ${item.title} to reorder`}
                        tooltip="Drag to reorder"
                        icon={<Icon icon={GripVertical} />}
                        variant="ghost"
                        size="sm"
                        {...attributes}
                        {...listeners}
                    />
                    <Text type="supporting" weight="bold" hasTabularNumbers>
                        {String(index + 1).padStart(2, '0')}
                    </Text>
                </HStack>
            }
            endContent={
                <HStack gap={0.5}>
                    <IconButton
                        label={`Move ${item.title} up`}
                        tooltip="Move up"
                        icon={<Icon icon={ArrowUp} />}
                        variant="ghost"
                        size="sm"
                        isDisabled={index === 0}
                        onClick={() => onMove(item.id, -1)}
                    />
                    <IconButton
                        label={`Move ${item.title} down`}
                        tooltip="Move down"
                        icon={<Icon icon={ArrowDown} />}
                        variant="ghost"
                        size="sm"
                        isDisabled={index === count - 1}
                        onClick={() => onMove(item.id, 1)}
                    />
                    <IconButton
                        label={`Remove ${item.title}`}
                        tooltip="Remove"
                        icon={<Icon icon={X} />}
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemove(item.id)}
                    />
                </HStack>
            }
        />
    );
}

export default function ServiceContentPicker({
    kind,
    items,
    selectedIds,
    isOpen,
    isMobile,
    onClose,
    onApply,
    onItemCreated,
}: ServiceContentPickerProps) {
    const [draftIds, setDraftIds] = useState<string[]>(selectedIds);
    const [checkedIds, setCheckedIds] = useState<string[]>([]);
    const [activeId, setActiveId] = useState<string>();
    const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
    const wasOpen = useRef(false);
    const itemMap = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
    const selectedItems = draftIds
        .map((id) => itemMap.get(id))
        .filter((item): item is ServiceContentOption => Boolean(item));
    const availableItems = items.filter((item) => !draftIds.includes(item.id));
    const activeItem = activeId ? itemMap.get(activeId) : undefined;
    const noun = kind === 'songs' ? 'song' : 'announcement';
    const pluralNoun = `${noun}s`;
    const sensors = useSensors(
        useSensor(MouseSensor, {activationConstraint: {distance: 6}}),
        useSensor(TouchSensor, {activationConstraint: {delay: 150, tolerance: 5}}),
        useSensor(KeyboardSensor, {coordinateGetter: sortableKeyboardCoordinates}),
    );

    useEffect(() => {
        if (isOpen && !wasOpen.current) {
            setDraftIds(selectedIds.filter((id) => itemMap.has(id)));
            setCheckedIds([]);
            setActiveId(undefined);
            setIsQuickCreateOpen(false);
        }
        wasOpen.current = isOpen;
    }, [isOpen, itemMap, selectedIds]);

    function addCheckedItems() {
        setDraftIds((current) => [
            ...current,
            ...checkedIds.filter((id) => !current.includes(id)),
        ]);
        setCheckedIds([]);
    }

    function handleDragStart(event: DragStartEvent) {
        setActiveId(String(event.active.id));
    }

    function handleDragEnd(event: DragEndEvent) {
        const overId = event.over ? String(event.over.id) : undefined;
        if (overId && activeId && overId !== activeId) {
            setDraftIds((ids) => moveId(ids, activeId, overId));
        }
        setActiveId(undefined);
    }

    function applySelection() {
        onApply(draftIds);
        onClose();
    }

    return (
        <>
            <Dialog
                isOpen={isOpen}
                onOpenChange={(open) => {
                    if (!open && !isQuickCreateOpen) onClose();
                }}
                purpose="form"
                variant={isMobile ? 'fullscreen' : 'standard'}
                width={840}
                maxHeight="90dvh"
            >
                <Layout
                    height="fill"
                    header={
                        <DialogHeader
                            title={`Choose ${pluralNoun}`}
                            subtitle={`${draftIds.length} selected · Drag to set the public order`}
                            onOpenChange={(open) => {
                                if (!open && !isQuickCreateOpen) onClose();
                            }}
                            hasDivider
                        />
                    }
                    content={
                        <LayoutContent padding={4}>
                            <VStack gap={5}>
                                <VStack gap={3}>
                                    <HStack gap={2} hAlign="between" vAlign="center" wrap="wrap">
                                        <VStack gap={0.5}>
                                            <Heading level={3}>Available {pluralNoun}</Heading>
                                            <Text type="supporting" color="secondary">
                                                Choose several, then add them together.
                                            </Text>
                                        </VStack>
                                        <Button
                                            label={`New ${noun}`}
                                            variant="secondary"
                                            size="sm"
                                            icon={<Icon icon={Plus} />}
                                            onClick={() => setIsQuickCreateOpen(true)}
                                        />
                                    </HStack>
                                    <MultiSelector
                                        label={`Select available ${pluralNoun}`}
                                        isLabelHidden
                                        options={availableItems.map((item) => ({
                                            value: item.id,
                                            label: item.supportingText
                                                ? `${item.title} — ${item.supportingText}`
                                                : item.title,
                                        }))}
                                        value={checkedIds}
                                        onChange={setCheckedIds}
                                        placeholder={`Search and select ${pluralNoun}…`}
                                        triggerDisplay="count"
                                        hasSearch
                                        searchPlaceholder={`Search ${pluralNoun}…`}
                                        width="100%"
                                        isDisabled={!availableItems.length}
                                        disabledMessage={items.length
                                            ? `All available ${pluralNoun} are selected.`
                                            : `Create the first ${noun} here.`}
                                    />
                                    <HStack gap={2} hAlign="end">
                                        <Button
                                            label={`Add selected${checkedIds.length ? ` (${checkedIds.length})` : ''}`}
                                            variant="secondary"
                                            onClick={addCheckedItems}
                                            isDisabled={!checkedIds.length}
                                        />
                                    </HStack>
                                </VStack>

                                <VStack gap={2}>
                                    <HStack gap={2} hAlign="between" vAlign="center">
                                        <Heading level={3}>Selected order</Heading>
                                        <Badge label={draftIds.length} variant="neutral" />
                                    </HStack>
                                    <Text type="supporting" color="secondary">
                                        Zero, one, or many may be selected. Changes join the planner draft when you press Done.
                                    </Text>
                                </VStack>

                                {selectedItems.length ? (
                                    <DndContext
                                        sensors={sensors}
                                        collisionDetection={closestCenter}
                                        onDragStart={handleDragStart}
                                        onDragCancel={() => setActiveId(undefined)}
                                        onDragEnd={handleDragEnd}
                                    >
                                        <SortableContext items={draftIds} strategy={verticalListSortingStrategy}>
                                            <List density="compact" hasDividers>
                                                {selectedItems.map((item, index) => (
                                                    <SortableSelectedItem
                                                        key={item.id}
                                                        item={item}
                                                        index={index}
                                                        count={selectedItems.length}
                                                        onMove={(id, offset) => setDraftIds((ids) => moveIdByOffset(ids, id, offset))}
                                                        onRemove={(id) => setDraftIds((ids) => ids.filter((currentId) => currentId !== id))}
                                                    />
                                                ))}
                                            </List>
                                        </SortableContext>
                                        <DragOverlay>
                                            {activeItem ? (
                                                <Card variant="default" padding={2}>
                                                    <HStack gap={2} vAlign="center">
                                                        <Icon icon={GripVertical} color="secondary" />
                                                        <Text weight="semibold">{activeItem.title}</Text>
                                                    </HStack>
                                                </Card>
                                            ) : null}
                                        </DragOverlay>
                                    </DndContext>
                                ) : (
                                    <EmptyState
                                        title={`No ${pluralNoun} selected`}
                                        description={`The public OS will not show a ${noun} popup for this service.`}
                                        isCompact
                                    />
                                )}
                            </VStack>
                        </LayoutContent>
                    }
                    footer={
                        <LayoutFooter hasDivider padding={3}>
                            <HStack gap={2} hAlign="end">
                                <Button label="Cancel" variant="ghost" onClick={onClose} />
                                <Button label="Done" variant="primary" onClick={applySelection} />
                            </HStack>
                        </LayoutFooter>
                    }
                />
            </Dialog>
            <LibraryQuickCreateDialog
                kind={kind}
                isOpen={isQuickCreateOpen}
                isMobile={isMobile}
                onClose={() => setIsQuickCreateOpen(false)}
                onCreated={(item) => {
                    onItemCreated(item);
                    setDraftIds((ids) => ids.includes(item.id) ? ids : [...ids, item.id]);
                }}
            />
        </>
    );
}
