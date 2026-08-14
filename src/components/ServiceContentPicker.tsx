'use client';

import {useEffect, useMemo, useState} from 'react';
import {Badge} from '@astryxdesign/core/Badge';
import {Banner} from '@astryxdesign/core/Banner';
import {Button} from '@astryxdesign/core/Button';
import {Dialog, DialogHeader} from '@astryxdesign/core/Dialog';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {Icon} from '@astryxdesign/core/Icon';
import {IconButton} from '@astryxdesign/core/IconButton';
import {Layout, LayoutContent, LayoutFooter} from '@astryxdesign/core/Layout';
import {List, ListItem} from '@astryxdesign/core/List';
import {MultiSelector} from '@astryxdesign/core/MultiSelector';
import {HStack, VStack} from '@astryxdesign/core/Stack';
import {Heading, Text} from '@astryxdesign/core/Text';
import {ArrowDown, ArrowUp, X} from 'lucide-react';
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
    isSaving: boolean;
    onClose: () => void;
    onSave: (selectedIds: string[]) => Promise<void>;
}

function mergeSelectionOrder(current: string[], next: string[]): string[] {
    const nextSet = new Set(next);
    const currentSet = new Set(current);
    return [
        ...current.filter((id) => nextSet.has(id)),
        ...next.filter((id) => !currentSet.has(id)),
    ];
}

export default function ServiceContentPicker({
    kind,
    items,
    selectedIds,
    isOpen,
    isMobile,
    isSaving,
    onClose,
    onSave,
}: ServiceContentPickerProps) {
    const [draftIds, setDraftIds] = useState<string[]>(selectedIds);
    const [error, setError] = useState<string>();
    const itemMap = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
    const selectedItems = draftIds
        .map((id) => itemMap.get(id))
        .filter((item): item is ServiceContentOption => Boolean(item));
    const noun = kind === 'songs' ? 'song' : 'announcement';
    const pluralNoun = `${noun}s`;

    useEffect(() => {
        if (!isOpen) return;
        setDraftIds(selectedIds.filter((id) => itemMap.has(id)));
        setError(undefined);
    }, [isOpen, itemMap, selectedIds]);

    function moveItem(id: string, direction: -1 | 1) {
        setDraftIds((current) => {
            const index = current.indexOf(id);
            const targetIndex = index + direction;
            if (index < 0 || targetIndex < 0 || targetIndex >= current.length) return current;
            const next = [...current];
            [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
            return next;
        });
    }

    async function saveSelection() {
        setError(undefined);
        try {
            await onSave(draftIds);
            onClose();
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : `Unable to save ${pluralNoun}.`);
        }
    }

    return (
        <Dialog
            isOpen={isOpen}
            onOpenChange={(open) => {
                if (!open && !isSaving) onClose();
            }}
            purpose="form"
            variant={isMobile ? 'fullscreen' : 'standard'}
            width={720}
            maxHeight="90dvh"
        >
            <Layout
                height="fill"
                header={
                    <DialogHeader
                        title={`Choose ${pluralNoun}`}
                        subtitle={`${draftIds.length} selected · Set the public display order below`}
                        onOpenChange={(open) => {
                            if (!open && !isSaving) onClose();
                        }}
                        hasDivider
                    />
                }
                content={
                    <LayoutContent padding={4}>
                        <VStack gap={4}>
                            {error ? <Banner status="error" title="Selection was not saved" description={error} /> : null}
                            <MultiSelector
                                label={`Available ${pluralNoun}`}
                                description={`Select only the ${pluralNoun} needed for this service.`}
                                options={items.map((item) => ({
                                    value: item.id,
                                    label: item.supportingText
                                        ? `${item.title} — ${item.supportingText}`
                                        : item.title,
                                }))}
                                value={draftIds}
                                onChange={(nextIds) => setDraftIds((current) => mergeSelectionOrder(current, nextIds))}
                                placeholder={`Select ${pluralNoun}…`}
                                triggerDisplay="count"
                                hasSearch
                                searchPlaceholder={`Search ${pluralNoun}…`}
                                width="100%"
                                isDisabled={!items.length || isSaving}
                                disabledMessage={items.length
                                    ? 'Saving selection…'
                                    : `Add ${pluralNoun} to the library first.`}
                            />
                            <VStack gap={2}>
                                <HStack gap={2} hAlign="between" vAlign="center">
                                    <Heading level={3}>Selected order</Heading>
                                    <Badge label={draftIds.length} variant="neutral" />
                                </HStack>
                                <Text type="supporting" color="secondary">
                                    This order will appear in the public popup after you publish the service.
                                </Text>
                            </VStack>
                            {selectedItems.length ? (
                                <List density="compact" hasDividers>
                                    {selectedItems.map((item, index) => (
                                        <ListItem
                                            key={item.id}
                                            label={item.title}
                                            description={item.supportingText}
                                            startContent={<Text type="supporting" weight="bold" hasTabularNumbers>{String(index + 1).padStart(2, '0')}</Text>}
                                            endContent={
                                                <HStack gap={0.5}>
                                                    <IconButton
                                                        label={`Move ${item.title} up`}
                                                        tooltip="Move up"
                                                        icon={<Icon icon={ArrowUp} />}
                                                        variant="ghost"
                                                        size="sm"
                                                        isDisabled={index === 0 || isSaving}
                                                        onClick={() => moveItem(item.id, -1)}
                                                    />
                                                    <IconButton
                                                        label={`Move ${item.title} down`}
                                                        tooltip="Move down"
                                                        icon={<Icon icon={ArrowDown} />}
                                                        variant="ghost"
                                                        size="sm"
                                                        isDisabled={index === selectedItems.length - 1 || isSaving}
                                                        onClick={() => moveItem(item.id, 1)}
                                                    />
                                                    <IconButton
                                                        label={`Remove ${item.title}`}
                                                        tooltip="Remove"
                                                        icon={<Icon icon={X} />}
                                                        variant="ghost"
                                                        size="sm"
                                                        isDisabled={isSaving}
                                                        onClick={() => setDraftIds((current) => current.filter((id) => id !== item.id))}
                                                    />
                                                </HStack>
                                            }
                                        />
                                    ))}
                                </List>
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
                            <Button label="Cancel" variant="ghost" onClick={onClose} isDisabled={isSaving} />
                            <Button label="Save selection" variant="primary" onClick={saveSelection} isLoading={isSaving} />
                        </HStack>
                    </LayoutFooter>
                }
            />
        </Dialog>
    );
}
