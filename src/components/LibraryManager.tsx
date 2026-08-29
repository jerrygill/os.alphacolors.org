'use client';

import {FormEvent, useEffect, useMemo, useState} from 'react';
import {AlertDialog} from '@astryxdesign/core/AlertDialog';
import {Badge, type BadgeVariant} from '@astryxdesign/core/Badge';
import {Banner} from '@astryxdesign/core/Banner';
import {Button} from '@astryxdesign/core/Button';
import {DateInput} from '@astryxdesign/core/DateInput';
import {Dialog, DialogHeader} from '@astryxdesign/core/Dialog';
import {Divider} from '@astryxdesign/core/Divider';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {FormLayout} from '@astryxdesign/core/FormLayout';
import {Icon} from '@astryxdesign/core/Icon';
import {IconButton} from '@astryxdesign/core/IconButton';
import {
    Layout,
    LayoutContent,
    LayoutFooter,
    LayoutHeader,
} from '@astryxdesign/core/Layout';
import {List, ListItem} from '@astryxdesign/core/List';
import {NumberInput} from '@astryxdesign/core/NumberInput';
import {ProgressBar} from '@astryxdesign/core/ProgressBar';
import {Selector} from '@astryxdesign/core/Selector';
import {HStack, VStack} from '@astryxdesign/core/Stack';
import {StatusDot} from '@astryxdesign/core/StatusDot';
import {Switch} from '@astryxdesign/core/Switch';
import {Table, pixel, proportional, type TableColumn} from '@astryxdesign/core/Table';
import {TextArea} from '@astryxdesign/core/TextArea';
import {Heading, Text} from '@astryxdesign/core/Text';
import {TextInput} from '@astryxdesign/core/TextInput';
import {useMediaQuery} from '@astryxdesign/core/hooks';
import type {ISODateString} from '@astryxdesign/core/Calendar';
import {Megaphone, Music2, Pencil, Plus, Search, Trash2} from 'lucide-react';
import {
    createLibraryItem,
    deleteLibraryItem,
    getLibrary,
    updateLibraryItem,
} from '@/lib/library';
import type {
    Announcement,
    AnnouncementInput,
    AnnouncementOccurrence,
    AnnouncementPriority,
    LibraryKind,
    Song,
    SongInput,
} from '@/lib/library-types';
import AnnouncementOccurrenceEditor from './AnnouncementOccurrenceEditor';

type LibraryItem = Song | Announcement;

interface LibraryManagerProps {
    kind: LibraryKind;
}

interface SongFormState {
    title: string;
    artist: string;
    defaultKey: string;
    bpm: number | null;
    notes: string;
    referenceUrl: string;
}

interface AnnouncementFormState {
    title: string;
    speaker: string;
    body: string;
    occurrences: AnnouncementOccurrence[];
    remarks: string;
    startDate: string;
    endDate: string;
    priority: AnnouncementPriority;
    isActive: boolean;
}

const EMPTY_SONG: SongFormState = {
    title: '',
    artist: '',
    defaultKey: '',
    bpm: null,
    notes: '',
    referenceUrl: '',
};

const EMPTY_ANNOUNCEMENT: AnnouncementFormState = {
    title: '',
    speaker: '',
    body: '',
    occurrences: [],
    remarks: '',
    startDate: '',
    endDate: '',
    priority: 'low',
    isActive: true,
};

function isSong(item: LibraryItem): item is Song {
    return 'artist' in item;
}

function priorityVariant(priority: AnnouncementPriority): BadgeVariant {
    if (priority === 'high') return 'error';
    if (priority === 'low') return 'neutral';
    return 'warning';
}

export default function LibraryManager({kind}: LibraryManagerProps) {
    const isMobile = useMediaQuery('(max-width: 767px)');
    const isSongs = kind === 'songs';
    const [items, setItems] = useState<LibraryItem[]>([]);
    const [query, setQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string>();
    const [success, setSuccess] = useState<string>();
    const [editingItem, setEditingItem] = useState<LibraryItem | 'new' | null>(null);
    const [deletingItem, setDeletingItem] = useState<LibraryItem | null>(null);
    const [songForm, setSongForm] = useState<SongFormState>(EMPTY_SONG);
    const [announcementForm, setAnnouncementForm] = useState<AnnouncementFormState>(EMPTY_ANNOUNCEMENT);

    useEffect(() => {
        let isMounted = true;
        setIsLoading(true);
        setError(undefined);

        getLibrary<LibraryItem>(kind)
            .then((loadedItems) => {
                if (isMounted) setItems(loadedItems);
            })
            .catch((loadError: unknown) => {
                if (isMounted) setError(loadError instanceof Error ? loadError.message : 'Unable to load the library.');
            })
            .finally(() => {
                if (isMounted) setIsLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, [kind]);

    const filteredItems = useMemo(() => {
        const needle = query.trim().toLowerCase();
        if (!needle) return items;
        return items.filter((item) => {
            if (isSong(item)) {
                return `${item.title} ${item.artist} ${item.defaultKey}`.toLowerCase().includes(needle);
            }
            const occurrenceText = item.occurrences.map((occurrence) => occurrence.note).join(' ');
            return `${item.title} ${item.speaker} ${item.body} ${item.remarks} ${occurrenceText}`.toLowerCase().includes(needle);
        });
    }, [items, query]);

    function openCreate() {
        setError(undefined);
        setSongForm(EMPTY_SONG);
        setAnnouncementForm(EMPTY_ANNOUNCEMENT);
        setEditingItem('new');
    }

    function openEdit(item: LibraryItem) {
        setError(undefined);
        if (isSong(item)) {
            setSongForm({
                title: item.title,
                artist: item.artist,
                defaultKey: item.defaultKey,
                bpm: item.bpm,
                notes: item.notes,
                referenceUrl: item.referenceUrl,
            });
        } else {
            setAnnouncementForm({
                title: item.title,
                speaker: item.speaker || '',
                body: item.body,
                occurrences: item.occurrences || [],
                remarks: item.remarks || '',
                startDate: item.startDate,
                endDate: item.endDate,
                priority: item.priority,
                isActive: item.isActive,
            });
        }
        setEditingItem(item);
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setIsSaving(true);
        setError(undefined);

        try {
            const input: SongInput | AnnouncementInput = isSongs ? songForm : announcementForm;
            const savedItem = editingItem === 'new'
                ? await createLibraryItem<LibraryItem>(kind, input)
                : await updateLibraryItem<LibraryItem>(kind, editingItem!.id, input);

            setItems((current) => {
                if (editingItem === 'new') return [...current, savedItem];
                return current.map((item) => item.id === savedItem.id ? savedItem : item);
            });
            setEditingItem(null);
            setSuccess(`${isSongs ? 'Song' : 'Announcement'} saved.`);
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : 'Unable to save the item.');
        } finally {
            setIsSaving(false);
        }
    }

    async function handleDelete() {
        if (!deletingItem) return;
        setIsSaving(true);
        setError(undefined);
        try {
            await deleteLibraryItem(kind, deletingItem.id);
            setItems((current) => current.filter((item) => item.id !== deletingItem.id));
            setDeletingItem(null);
            setSuccess(`${isSongs ? 'Song' : 'Announcement'} deleted.`);
        } catch (deleteError) {
            setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete the item.');
        } finally {
            setIsSaving(false);
        }
    }

    const columns: TableColumn<LibraryItem>[] = isSongs
        ? [
            {
                key: 'title',
                header: 'Song',
                width: proportional(2),
                renderCell: (item) => (
                    <VStack gap={0.5}>
                        <Text weight="semibold">{item.title}</Text>
                        <Text type="supporting" color="secondary">{isSong(item) ? item.artist || 'Artist not set' : ''}</Text>
                    </VStack>
                ),
            },
            {
                key: 'defaultKey',
                header: 'Key',
                width: pixel(84),
                renderCell: (item) => <Text>{isSong(item) ? item.defaultKey || '—' : '—'}</Text>,
            },
            {
                key: 'bpm',
                header: 'BPM',
                width: pixel(84),
                renderCell: (item) => <Text hasTabularNumbers>{isSong(item) ? item.bpm ?? '—' : '—'}</Text>,
            },
            {
                key: 'notes',
                header: 'Remark',
                width: proportional(2),
                renderCell: (item) => <Text maxLines={2} color="secondary">{isSong(item) ? item.notes || '—' : '—'}</Text>,
            },
            {
                key: 'actions',
                header: '',
                width: pixel(88),
                align: 'end',
                resizable: false,
                renderCell: (item) => (
                    <HStack gap={0.5} hAlign="end">
                        <IconButton label={`Edit ${item.title}`} icon={<Icon icon={Pencil} />} variant="ghost" size="sm" onClick={() => openEdit(item)} />
                        <IconButton label={`Delete ${item.title}`} icon={<Icon icon={Trash2} />} variant="ghost" size="sm" onClick={() => setDeletingItem(item)} />
                    </HStack>
                ),
            },
        ]
        : [
            {
                key: 'title',
                header: 'Announcement',
                width: proportional(2),
                renderCell: (item) => (
                    <VStack gap={0.5}>
                        <Text weight="semibold">{item.title}</Text>
                        {!isSong(item) && item.speaker ? (
                            <Text type="supporting" weight="semibold" color="secondary">
                                Speaker · {item.speaker}
                            </Text>
                        ) : null}
                        <Text type="supporting" color="secondary" maxLines={2}>{isSong(item) ? '' : item.body || 'No description'}</Text>
                    </VStack>
                ),
            },
            {
                key: 'priority',
                header: 'Priority',
                width: pixel(104),
                renderCell: (item) => isSong(item) ? null : <Badge label={item.priority} variant={priorityVariant(item.priority)} />,
            },
            {
                key: 'dates',
                header: 'Display window',
                width: proportional(1),
                renderCell: (item) => isSong(item) ? null : (
                    <Text type="supporting" hasTabularNumbers>
                        {item.startDate || 'Any time'}{item.endDate ? ` – ${item.endDate}` : ''}
                    </Text>
                ),
            },
            {
                key: 'isActive',
                header: 'Status',
                width: pixel(104),
                renderCell: (item) => isSong(item) ? null : (
                    <HStack gap={1.5} vAlign="center">
                        <StatusDot variant={item.isActive ? 'success' : 'neutral'} label={item.isActive ? 'Active' : 'Inactive'} />
                        <Text>{item.isActive ? 'Active' : 'Inactive'}</Text>
                    </HStack>
                ),
            },
            {
                key: 'actions',
                header: '',
                width: pixel(88),
                align: 'end',
                resizable: false,
                renderCell: (item) => (
                    <HStack gap={0.5} hAlign="end">
                        <IconButton label={`Edit ${item.title}`} icon={<Icon icon={Pencil} />} variant="ghost" size="sm" onClick={() => openEdit(item)} />
                        <IconButton label={`Delete ${item.title}`} icon={<Icon icon={Trash2} />} variant="ghost" size="sm" onClick={() => setDeletingItem(item)} />
                    </HStack>
                ),
            },
        ];

    const emptyState = (
        <EmptyState
            icon={<Icon icon={isSongs ? Music2 : Megaphone} size="lg" color="secondary" />}
            title={query ? 'No matching items' : `No ${kind} yet`}
            description={query ? 'Try a different search.' : `Add the first ${isSongs ? 'song' : 'announcement'} to the native library.`}
            actions={!query ? <Button label={`Add ${isSongs ? 'song' : 'announcement'}`} variant="primary" onClick={openCreate} /> : undefined}
            isCompact
        />
    );

    return (
        <>
        <Layout
            height="fill"
            header={
                <LayoutHeader hasDivider padding={4}>
                    <VStack gap={4}>
                        <HStack gap={3} hAlign="between" vAlign="center" wrap="wrap">
                            <VStack gap={0.5}>
                                <Heading level={1}>{isSongs ? 'Songs' : 'Announcements'}</Heading>
                                <Text type="supporting" color="secondary">
                                    {isSongs
                                        ? 'A reusable repertoire for every service plan.'
                                        : 'Reusable notices with priority and display dates.'}
                                </Text>
                            </VStack>
                            <HStack gap={2} vAlign="center">
                                <Badge label={items.length} variant="neutral" />
                                <Button
                                    label={`Add ${isSongs ? 'song' : 'announcement'}`}
                                    variant="primary"
                                    icon={<Icon icon={Plus} />}
                                    onClick={openCreate}
                                />
                            </HStack>
                        </HStack>
                        <TextInput
                            label={`Search ${kind}`}
                            isLabelHidden
                            value={query}
                            onChange={setQuery}
                            placeholder={`Search ${isSongs ? 'title, artist, or key' : 'title, speaker, or message'}…`}
                            startIcon={Search}
                            hasClear
                            width={isMobile ? '100%' : 360}
                        />
                    </VStack>
                </LayoutHeader>
            }
            content={
                <LayoutContent padding={4}>
                    <VStack gap={3}>
                        {success ? (
                            <Banner status="success" title={success} isDismissable onDismiss={() => setSuccess(undefined)} />
                        ) : null}
                        {error && !editingItem ? (
                            <Banner status="error" title="Something went wrong" description={error} isDismissable onDismiss={() => setError(undefined)} />
                        ) : null}
                        {isLoading ? <ProgressBar label={`Loading ${kind}`} isIndeterminate /> : isMobile ? (
                            filteredItems.length ? (
                                <List density="balanced" hasDividers>
                                    {filteredItems.map((item) => (
                                        <ListItem
                                            key={item.id}
                                            label={item.title}
                                            description={isSong(item)
                                                ? [item.artist, item.defaultKey ? `Key ${item.defaultKey}` : '', item.bpm ? `${item.bpm} BPM` : ''].filter(Boolean).join(' · ') || 'Song details not set'
                                                : (
                                                    <VStack gap={0.5}>
                                                        {item.speaker ? (
                                                            <Text type="supporting" weight="semibold" color="secondary">
                                                                Speaker · {item.speaker}
                                                            </Text>
                                                        ) : null}
                                                        <Text type="supporting" color="secondary" maxLines={2}>
                                                            {item.body || 'No description'}
                                                        </Text>
                                                    </VStack>
                                                )}
                                            startContent={isSong(item)
                                                ? <Icon icon={Music2} color="secondary" />
                                                : <StatusDot variant={item.isActive ? 'success' : 'neutral'} label={item.isActive ? 'Active' : 'Inactive'} />}
                                            endContent={
                                                <HStack gap={0.5}>
                                                    {!isSong(item) ? <Badge label={item.priority} variant={priorityVariant(item.priority)} /> : null}
                                                    <IconButton label={`Edit ${item.title}`} icon={<Icon icon={Pencil} />} variant="ghost" size="sm" onClick={() => openEdit(item)} />
                                                    <IconButton label={`Delete ${item.title}`} icon={<Icon icon={Trash2} />} variant="ghost" size="sm" onClick={() => setDeletingItem(item)} />
                                                </HStack>
                                            }
                                        />
                                    ))}
                                </List>
                            ) : emptyState
                        ) : (
                            <Table
                                data={filteredItems}
                                columns={columns}
                                idKey="id"
                                density="compact"
                                dividers="rows"
                                hasHover
                                verticalAlign="top"
                                emptyState={emptyState}
                            />
                        )}
                    </VStack>
                </LayoutContent>
            }
        />
        <Dialog
            isOpen={editingItem !== null}
            onOpenChange={(open) => {
                if (!open && !isSaving) setEditingItem(null);
            }}
            purpose="form"
            variant={isMobile ? 'fullscreen' : 'standard'}
            width={720}
            maxHeight="90dvh"
            padding={4}
        >
            <Layout
                height="fill"
                header={
                    <DialogHeader
                        title={`${editingItem === 'new' ? 'Add' : 'Edit'} ${isSongs ? 'song' : 'announcement'}`}
                        subtitle={isSongs ? 'Save it once, reuse it in any service.' : 'Add repeatable dates and control when it appears.'}
                        onOpenChange={(open) => {
                            if (!open && !isSaving) setEditingItem(null);
                        }}
                        hasDivider
                    />
                }
                content={
                    <LayoutContent padding={4}>
                        <form id="library-item-form" onSubmit={handleSubmit}>
                            <VStack gap={4}>
                                {error ? <Banner status="error" title="Unable to save" description={error} /> : null}
                                {isSongs ? (
                                    <>
                                        <TextInput label="Song title" value={songForm.title} onChange={(title) => setSongForm((form) => ({...form, title}))} isRequired hasAutoFocus />
                                        <TextInput label="Artist" value={songForm.artist} onChange={(artist) => setSongForm((form) => ({...form, artist}))} isOptional />
                                        <HStack gap={3} vAlign="start" wrap="wrap">
                                            <TextInput label="Default key" value={songForm.defaultKey} onChange={(defaultKey) => setSongForm((form) => ({...form, defaultKey}))} isOptional width={180} />
                                            <NumberInput label="Tempo" value={songForm.bpm} onChange={(bpm) => setSongForm((form) => ({...form, bpm}))} min={1} max={300} units="BPM" hasClear isOptional width={180} />
                                        </HStack>
                                        <TextInput label="Reference link" value={songForm.referenceUrl} onChange={(referenceUrl) => setSongForm((form) => ({...form, referenceUrl}))} placeholder="YouTube, Spotify, chord chart…" isOptional />
                                        <TextArea label="Remark" value={songForm.notes} onChange={(notes) => setSongForm((form) => ({...form, notes}))} placeholder="For example, chorus only" rows={4} isOptional />
                                    </>
                                ) : (
                                    <FormLayout>
                                        <TextInput label="Title" value={announcementForm.title} onChange={(title) => setAnnouncementForm((form) => ({...form, title}))} isRequired hasAutoFocus />
                                        <TextInput
                                            label="Speaker"
                                            value={announcementForm.speaker}
                                            onChange={(speaker) => setAnnouncementForm((form) => ({...form, speaker}))}
                                            placeholder="e.g. Ps Arnold Phua"
                                            isOptional
                                        />
                                        <TextArea label="Details" value={announcementForm.body} onChange={(body) => setAnnouncementForm((form) => ({...form, body}))} rows={5} isOptional />

                                        <AnnouncementOccurrenceEditor
                                            occurrences={announcementForm.occurrences}
                                            isMobile={isMobile}
                                            onChange={(occurrences) => setAnnouncementForm((form) => ({
                                                ...form,
                                                occurrences,
                                            }))}
                                        />

                                        <TextArea
                                            label="Remarks"
                                            value={announcementForm.remarks}
                                            onChange={(remarks) => setAnnouncementForm((form) => ({...form, remarks}))}
                                            rows={3}
                                            isOptional
                                        />
                                        <Selector
                                            label="Priority"
                                            options={[
                                                {value: 'low', label: 'Low'},
                                                {value: 'medium', label: 'Medium'},
                                                {value: 'high', label: 'High'},
                                            ]}
                                            value={announcementForm.priority}
                                            onChange={(priority) => setAnnouncementForm((form) => ({...form, priority: priority as AnnouncementPriority}))}
                                            width="100%"
                                        />

                                        <Divider label="Visibility" />
                                        <Switch
                                            label="Active"
                                            description="Inactive announcements remain in the library but cannot be selected for display."
                                            value={announcementForm.isActive}
                                            onChange={(isActive) => setAnnouncementForm((form) => ({...form, isActive}))}
                                            labelSpacing="spread"
                                            width="100%"
                                        />
                                        <FormLayout direction={isMobile ? 'vertical' : 'horizontal'}>
                                            <DateInput
                                                label="Visible from"
                                                value={(announcementForm.startDate || undefined) as ISODateString | undefined}
                                                onChange={(startDate) => setAnnouncementForm((form) => ({...form, startDate: startDate || ''}))}
                                                hasClear
                                                isOptional
                                                format="date"
                                                width="100%"
                                            />
                                            <DateInput
                                                label="Visible until"
                                                value={(announcementForm.endDate || undefined) as ISODateString | undefined}
                                                onChange={(endDate) => setAnnouncementForm((form) => ({...form, endDate: endDate || ''}))}
                                                min={(announcementForm.startDate || undefined) as ISODateString | undefined}
                                                hasClear
                                                isOptional
                                                format="date"
                                                width="100%"
                                            />
                                        </FormLayout>
                                    </FormLayout>
                                )}
                            </VStack>
                        </form>
                    </LayoutContent>
                }
                footer={
                    <LayoutFooter hasDivider padding={3}>
                        <HStack gap={2} hAlign="end">
                            <Button label="Cancel" variant="ghost" onClick={() => setEditingItem(null)} isDisabled={isSaving} />
                            <Button
                                label="Save"
                                variant="primary"
                                type="submit"
                                form="library-item-form"
                                isLoading={isSaving}
                                isDisabled={isSongs ? !songForm.title.trim() : !announcementForm.title.trim()}
                            />
                        </HStack>
                    </LayoutFooter>
                }
            />
        </Dialog>
        <AlertDialog
            isOpen={deletingItem !== null}
            onOpenChange={(open) => {
                if (!open && !isSaving) setDeletingItem(null);
            }}
            title={`Delete “${deletingItem?.title || ''}”?`}
            description={`This removes the ${isSongs ? 'song' : 'announcement'} from the native library and from any service currently displaying it.`}
            actionLabel="Delete"
            actionVariant="destructive"
            isActionLoading={isSaving}
            onAction={handleDelete}
        />
        </>
    );
}
