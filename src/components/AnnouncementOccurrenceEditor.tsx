'use client';

import type {ISODateString} from '@astryxdesign/core/Calendar';
import {Button} from '@astryxdesign/core/Button';
import {Card} from '@astryxdesign/core/Card';
import {DateInput} from '@astryxdesign/core/DateInput';
import {FormLayout} from '@astryxdesign/core/FormLayout';
import {Icon} from '@astryxdesign/core/Icon';
import {IconButton} from '@astryxdesign/core/IconButton';
import {Selector} from '@astryxdesign/core/Selector';
import {HStack, VStack} from '@astryxdesign/core/Stack';
import {Text} from '@astryxdesign/core/Text';
import {TextInput} from '@astryxdesign/core/TextInput';
import {TimeInput, type ISOTimeString} from '@astryxdesign/core/TimeInput';
import {Plus, Trash2} from 'lucide-react';
import {
    ANNOUNCEMENT_WEEKDAYS,
    type AnnouncementOccurrence,
    type AnnouncementWeekday,
} from '@/lib/library-types';

interface AnnouncementOccurrenceEditorProps {
    occurrences: AnnouncementOccurrence[];
    isMobile: boolean;
    onChange: (occurrences: AnnouncementOccurrence[]) => void;
}

const WEEKDAY_OPTIONS = ANNOUNCEMENT_WEEKDAYS.map((weekday) => ({
    value: weekday,
    label: `${weekday[0].toUpperCase()}${weekday.slice(1)}`,
}));

function createOccurrence(): AnnouncementOccurrence {
    return {
        id: globalThis.crypto.randomUUID(),
        date: '',
        recurringDay: '',
        time: '',
        note: '',
    };
}

export default function AnnouncementOccurrenceEditor({
    occurrences,
    isMobile,
    onChange,
}: AnnouncementOccurrenceEditorProps) {
    function updateOccurrence(id: string, update: Partial<AnnouncementOccurrence>) {
        onChange(occurrences.map((occurrence) => (
            occurrence.id === id ? {...occurrence, ...update} : occurrence
        )));
    }

    function removeOccurrence(id: string) {
        onChange(occurrences.filter((occurrence) => occurrence.id !== id));
    }

    return (
        <VStack gap={3}>
            {occurrences.map((occurrence, index) => {
                const scheduleType = occurrence.recurringDay ? 'recurring' : 'date';
                return (
                    <Card
                        key={occurrence.id}
                        variant="muted"
                        padding={3}
                        role="group"
                        aria-label={`Occurrence ${index + 1}`}
                    >
                        <VStack gap={3}>
                            <HStack gap={2} hAlign="between" vAlign="center">
                                <Text type="label" weight="semibold">Occurrence {index + 1}</Text>
                                <IconButton
                                    label={`Remove occurrence ${index + 1}`}
                                    tooltip="Remove"
                                    icon={<Icon icon={Trash2} />}
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeOccurrence(occurrence.id)}
                                />
                            </HStack>
                            <Selector
                                label="Schedule type"
                                options={[
                                    {value: 'date', label: 'Specific date'},
                                    {value: 'recurring', label: 'Recurring weekday'},
                                ]}
                                value={scheduleType}
                                onChange={(value) => updateOccurrence(
                                    occurrence.id,
                                    value === 'recurring'
                                        ? {date: '', recurringDay: occurrence.recurringDay || 'monday'}
                                        : {date: occurrence.date, recurringDay: ''},
                                )}
                                width="100%"
                            />
                            <FormLayout direction={isMobile ? 'vertical' : 'horizontal'}>
                                {scheduleType === 'recurring' ? (
                                    <Selector
                                        label="Repeats"
                                        options={WEEKDAY_OPTIONS}
                                        value={occurrence.recurringDay || 'monday'}
                                        onChange={(recurringDay) => updateOccurrence(occurrence.id, {
                                            date: '',
                                            recurringDay: recurringDay as AnnouncementWeekday,
                                        })}
                                        width="100%"
                                    />
                                ) : (
                                    <DateInput
                                        label="Event date"
                                        value={(occurrence.date || undefined) as ISODateString | undefined}
                                        onChange={(date) => updateOccurrence(occurrence.id, {
                                            date: date || '',
                                            recurringDay: '',
                                        })}
                                        format="date_weekday"
                                        hasClear
                                        isOptional
                                        width="100%"
                                    />
                                )}
                                <TimeInput
                                    label="Event time"
                                    value={(occurrence.time || undefined) as ISOTimeString | undefined}
                                    onChange={(time) => updateOccurrence(occurrence.id, {time: time || ''})}
                                    hourFormat="12h"
                                    increment={15}
                                    hasClear
                                    isOptional
                                    width="100%"
                                />
                            </FormLayout>
                            <TextInput
                                label="Location / note"
                                value={occurrence.note}
                                onChange={(note) => updateOccurrence(occurrence.id, {note})}
                                placeholder="Alpha Colors or (+Juniors)"
                                isOptional
                            />
                        </VStack>
                    </Card>
                );
            })}
            <Button
                label="Add occurrence"
                variant="secondary"
                icon={<Icon icon={Plus} />}
                onClick={() => onChange([...occurrences, createOccurrence()])}
                width={isMobile ? '100%' : undefined}
            />
        </VStack>
    );
}
