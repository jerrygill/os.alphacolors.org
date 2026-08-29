'use client';

import {FormEvent, useEffect, useState} from 'react';
import type {ISODateString} from '@astryxdesign/core/Calendar';
import {Banner} from '@astryxdesign/core/Banner';
import {Button} from '@astryxdesign/core/Button';
import {DateInput} from '@astryxdesign/core/DateInput';
import {Dialog, DialogHeader} from '@astryxdesign/core/Dialog';
import {Divider} from '@astryxdesign/core/Divider';
import {FormLayout} from '@astryxdesign/core/FormLayout';
import {Layout, LayoutContent, LayoutFooter} from '@astryxdesign/core/Layout';
import {NumberInput} from '@astryxdesign/core/NumberInput';
import {Selector} from '@astryxdesign/core/Selector';
import {HStack, VStack} from '@astryxdesign/core/Stack';
import {Switch} from '@astryxdesign/core/Switch';
import {TextArea} from '@astryxdesign/core/TextArea';
import {TextInput} from '@astryxdesign/core/TextInput';
import {createLibraryItem} from '@/lib/library';
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

interface LibraryQuickCreateDialogProps {
    kind: LibraryKind;
    isOpen: boolean;
    isMobile: boolean;
    onClose: () => void;
    onCreated: (item: Song | Announcement) => void;
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

export default function LibraryQuickCreateDialog({
    kind,
    isOpen,
    isMobile,
    onClose,
    onCreated,
}: LibraryQuickCreateDialogProps) {
    const isSongs = kind === 'songs';
    const [songForm, setSongForm] = useState<SongFormState>(EMPTY_SONG);
    const [announcementForm, setAnnouncementForm] = useState<AnnouncementFormState>(EMPTY_ANNOUNCEMENT);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string>();

    useEffect(() => {
        if (!isOpen) return;
        setSongForm(EMPTY_SONG);
        setAnnouncementForm(EMPTY_ANNOUNCEMENT);
        setError(undefined);
    }, [isOpen, kind]);

    async function createItem(shouldAddAnother: boolean) {
        setIsSaving(true);
        setError(undefined);

        try {
            const input: SongInput | AnnouncementInput = isSongs ? songForm : announcementForm;
            const created = await createLibraryItem<Song | Announcement>(kind, input);
            onCreated(created);
            if (shouldAddAnother) {
                setSongForm(EMPTY_SONG);
                setAnnouncementForm(EMPTY_ANNOUNCEMENT);
            } else {
                onClose();
            }
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : 'Unable to create this item.');
        } finally {
            setIsSaving(false);
        }
    }

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        void createItem(false);
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
                        title={`New ${isSongs ? 'song' : 'announcement'}`}
                        subtitle={`Create it here and add it to this service.`}
                        onOpenChange={(open) => {
                            if (!open && !isSaving) onClose();
                        }}
                        hasDivider
                    />
                }
                content={
                    <LayoutContent padding={4}>
                        <form id={`quick-create-${kind}`} onSubmit={handleSubmit}>
                            <VStack gap={4}>
                                {error ? <Banner status="error" title="Unable to create" description={error} /> : null}
                                {isSongs ? (
                                    <>
                                        <TextInput label="Song title" value={songForm.title} onChange={(title) => setSongForm((form) => ({...form, title}))} isRequired hasAutoFocus />
                                        <TextInput label="Artist" value={songForm.artist} onChange={(artist) => setSongForm((form) => ({...form, artist}))} isOptional />
                                        <FormLayout direction={isMobile ? 'vertical' : 'horizontal'}>
                                            <TextInput label="Default key" value={songForm.defaultKey} onChange={(defaultKey) => setSongForm((form) => ({...form, defaultKey}))} isOptional width="100%" />
                                            <NumberInput label="Tempo" value={songForm.bpm} onChange={(bpm) => setSongForm((form) => ({...form, bpm}))} min={1} max={300} units="BPM" hasClear isOptional width="100%" />
                                        </FormLayout>
                                        <TextInput label="Reference link" value={songForm.referenceUrl} onChange={(referenceUrl) => setSongForm((form) => ({...form, referenceUrl}))} placeholder="YouTube, Spotify, chord chart…" isOptional />
                                        <TextArea label="Notes" value={songForm.notes} onChange={(notes) => setSongForm((form) => ({...form, notes}))} rows={3} isOptional />
                                    </>
                                ) : (
                                    <>
                                        <TextInput label="Title" value={announcementForm.title} onChange={(title) => setAnnouncementForm((form) => ({...form, title}))} isRequired hasAutoFocus />
                                        <TextInput label="Speaker" value={announcementForm.speaker} onChange={(speaker) => setAnnouncementForm((form) => ({...form, speaker}))} isOptional />
                                        <TextArea label="Details" value={announcementForm.body} onChange={(body) => setAnnouncementForm((form) => ({...form, body}))} rows={4} isOptional />
                                        <AnnouncementOccurrenceEditor
                                            occurrences={announcementForm.occurrences}
                                            isMobile={isMobile}
                                            onChange={(occurrences) => setAnnouncementForm((form) => ({...form, occurrences}))}
                                        />
                                        <TextArea label="Remarks" value={announcementForm.remarks} onChange={(remarks) => setAnnouncementForm((form) => ({...form, remarks}))} rows={3} isOptional />
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
                                            description="Inactive announcements remain in the library but cannot appear publicly."
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
                                    </>
                                )}
                            </VStack>
                        </form>
                    </LayoutContent>
                }
                footer={
                    <LayoutFooter hasDivider padding={3}>
                        <HStack gap={2} hAlign="end" wrap="wrap">
                            <Button label="Cancel" variant="ghost" onClick={onClose} isDisabled={isSaving} />
                            <Button
                                label="Create & add another"
                                variant="secondary"
                                onClick={() => void createItem(true)}
                                isLoading={isSaving}
                                isDisabled={isSongs ? !songForm.title.trim() : !announcementForm.title.trim()}
                            />
                            <Button
                                label="Create & add"
                                variant="primary"
                                type="submit"
                                form={`quick-create-${kind}`}
                                isLoading={isSaving}
                                isDisabled={isSongs ? !songForm.title.trim() : !announcementForm.title.trim()}
                            />
                        </HStack>
                    </LayoutFooter>
                }
            />
        </Dialog>
    );
}
