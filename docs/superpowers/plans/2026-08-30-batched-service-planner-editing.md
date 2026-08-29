# Batched Service Planner Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make all Service Planner edits immediate and locally reversible, save the complete weekly draft once, add touch-capable reordering and batch content selection, support inline library creation, and display recurring announcement weekdays such as `Every Wednesday`.

**Architecture:** Keep `WeekData` and `publishedSnapshot` as the weekly draft/public boundary. The Planner will hold separate saved and working copies, mutate only the working copy during editing, and send one complete draft through the existing schedule API. Song and announcement creation remains a focused library request because new records need durable IDs; service membership remains local until `Save changes`.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript 5, Astryx 0.2, Neon JSONB schedule storage, native song/announcement tables, dnd-kit, Vitest.

## Global Constraints

- Zero, one, or many songs and announcements may be selected; never show a minimum-selection warning.
- The Google Sheet supplies service-flow rows only. Native libraries supply songs and announcements.
- Planner edits stay private until `Save changes`; saved weekly changes stay private until `Publish`.
- Disable `Publish` while planner changes are unsaved.
- New announcements default to low priority; existing priorities remain unchanged.
- A recurring weekday replaces the date badge with copy such as `Every Wednesday`.
- Keep time, location, speaker, details, and remarks as separate structured content.
- Use Astryx components and tokens. Do not introduce raw layout elements, inline styles, or a second visual system.
- Provide keyboard move actions in addition to pointer and touch dragging.

---

### Task 1: Add tested planner-draft and ordering helpers

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/lib/planner-draft.ts`
- Create: `src/lib/planner-draft.test.ts`

**Interfaces:**
- Consumes: `PublishedScheduleSnapshot`, `WeekData`
- Produces: `editableWeekData(data: WeekData): PublishedScheduleSnapshot`
- Produces: `areWeekDraftsEqual(left, right): boolean`
- Produces: `moveId(ids, activeId, overId): string[]`
- Produces: `moveIdByOffset(ids, id, offset): string[]`

- [ ] **Step 1: Install the sortable and test dependencies**

Run:

```bash
npm install @dnd-kit/core@6.3.1 @dnd-kit/sortable@10.0.0 @dnd-kit/utilities@3.2.2
npm install --save-dev vitest@4.1.11
```

Expected: `package.json` contains the three runtime packages and Vitest, and `package-lock.json` resolves them without peer-dependency errors.

- [ ] **Step 2: Add a test script**

Add this script to `package.json`:

```json
"test": "vitest run"
```

- [ ] **Step 3: Write failing draft-helper tests**

Create `src/lib/planner-draft.test.ts`:

```ts
import {describe, expect, it} from 'vitest';
import {DEFAULT_WEEK_DATA} from './storage';
import {
    areWeekDraftsEqual,
    editableWeekData,
    moveId,
    moveIdByOffset,
} from './planner-draft';

describe('planner draft helpers', () => {
    it('compares only editable weekly fields', () => {
        const published = {...DEFAULT_WEEK_DATA, status: 'published' as const, publishedAt: '2026-08-30T00:00:00.000Z'};
        expect(areWeekDraftsEqual(editableWeekData(DEFAULT_WEEK_DATA), editableWeekData(published))).toBe(true);
    });

    it('moves an id to a drop target', () => {
        expect(moveId(['a', 'b', 'c'], 'a', 'c')).toEqual(['b', 'c', 'a']);
    });

    it('moves an id by an accessible offset without crossing a boundary', () => {
        expect(moveIdByOffset(['a', 'b', 'c'], 'b', -1)).toEqual(['b', 'a', 'c']);
        expect(moveIdByOffset(['a', 'b', 'c'], 'a', -1)).toEqual(['a', 'b', 'c']);
    });
});
```

- [ ] **Step 4: Run the tests to verify they fail**

Run: `npm test -- src/lib/planner-draft.test.ts`

Expected: FAIL because `planner-draft.ts` does not exist.

- [ ] **Step 5: Implement the pure helpers**

Create `src/lib/planner-draft.ts`:

```ts
import type {PublishedScheduleSnapshot, WeekData} from './storage';

export function editableWeekData(data: WeekData): PublishedScheduleSnapshot {
    return {
        overrides: {...data.overrides},
        customActs: data.customActs.map((item) => ({...item})),
        rowOrder: data.rowOrder ? [...data.rowOrder] : null,
        songIds: [...data.songIds],
        announcementIds: [...data.announcementIds],
    };
}

export function areWeekDraftsEqual(
    left: PublishedScheduleSnapshot,
    right: PublishedScheduleSnapshot,
): boolean {
    return JSON.stringify(left) === JSON.stringify(right);
}

export function moveId(ids: string[], activeId: string, overId: string): string[] {
    const from = ids.indexOf(activeId);
    const to = ids.indexOf(overId);
    if (from < 0 || to < 0 || from === to) return ids;
    const next = [...ids];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    return next;
}

export function moveIdByOffset(ids: string[], id: string, offset: -1 | 1): string[] {
    const from = ids.indexOf(id);
    const to = from + offset;
    if (from < 0 || to < 0 || to >= ids.length) return ids;
    const next = [...ids];
    [next[from], next[to]] = [next[to], next[from]];
    return next;
}
```

- [ ] **Step 6: Run the helper tests**

Run: `npm test -- src/lib/planner-draft.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit the helpers**

```bash
git add package.json package-lock.json src/lib/planner-draft.ts src/lib/planner-draft.test.ts
git commit -m "Add planner draft helpers"
```

---

### Task 2: Add recurring weekdays and low announcement defaults

**Files:**
- Modify: `src/lib/library-types.ts`
- Modify: `src/lib/announcement-utils.ts`
- Create: `src/lib/announcement-utils.test.ts`
- Modify: `src/lib/library-server.ts`
- Modify: `src/app/api/library/[kind]/route.ts`
- Modify: `src/app/api/library/[kind]/[id]/route.ts`
- Modify: `src/components/LibraryManager.tsx`

**Interfaces:**
- Produces: `AnnouncementWeekday`
- Extends: `AnnouncementOccurrence.recurringDay`
- Preserves: existing date/time/note JSON records

- [ ] **Step 1: Extend the occurrence type**

In `src/lib/library-types.ts`, add:

```ts
export const ANNOUNCEMENT_WEEKDAYS = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
] as const;

export type AnnouncementWeekday = typeof ANNOUNCEMENT_WEEKDAYS[number];

export interface AnnouncementOccurrence {
    id: string;
    date: string;
    recurringDay: AnnouncementWeekday | '';
    time: string;
    note: string;
}
```

- [ ] **Step 2: Write failing normalization tests**

Add tests that prove recurring weekdays survive normalization, invalid weekday values are removed, recurring-only rows remain, and legacy rows receive an empty `recurringDay`:

```ts
it('normalizes a recurring weekday occurrence', () => {
    expect(normalizeAnnouncementOccurrences([
        {id: 'weekly', recurringDay: 'wednesday', time: '19:30', note: 'Alpha Colors'},
    ])).toEqual([
        {id: 'weekly', date: '', recurringDay: 'wednesday', time: '19:30', note: 'Alpha Colors'},
    ]);
});

it('keeps legacy dated occurrences compatible', () => {
    expect(normalizeAnnouncementOccurrences([
        {id: 'dated', date: '2026-08-30', time: '', note: ''},
    ])[0]?.recurringDay).toBe('');
});
```

- [ ] **Step 3: Run the occurrence tests to verify they fail**

Run: `npm test -- src/lib/announcement-utils.test.ts`

Expected: FAIL because `recurringDay` is not normalized.

- [ ] **Step 4: Validate and normalize the weekday**

Update `isAnnouncementOccurrencesInput` to accept only values in `ANNOUNCEMENT_WEEKDAYS` or an empty string. Update `normalizeAnnouncementOccurrences` so a recurring day and a specific date are mutually exclusive:

```ts
const recurringDay = ANNOUNCEMENT_WEEKDAYS.includes(entry.recurringDay as AnnouncementWeekday)
    ? entry.recurringDay as AnnouncementWeekday
    : '';
const date = recurringDay ? '' : normalizeDate(entry.date);
if (!date && !recurringDay && !time && !note) return [];
return [{id, date, recurringDay, time, note}];
```

- [ ] **Step 5: Change only new-record priority defaults**

Make these defaults `low`:

```ts
const EMPTY_ANNOUNCEMENT = {
    // existing fields
    priority: 'low' as const,
};
```

In `initializeLibraryTable`, create new tables with `DEFAULT 'low'` and run:

```sql
ALTER TABLE os_announcements ALTER COLUMN priority SET DEFAULT 'low';
```

Update POST normalization and invalid-row fallback to `low`. Do not update existing announcement rows.

- [ ] **Step 6: Update the library occurrence editor**

Create occurrences with `recurringDay: ''`. Add a `Schedule type` selector above the date/time row. Choosing `Recurring weekday` clears `date`; choosing `Specific date` clears `recurringDay`. Show a weekday selector for recurrence and `DateInput` for a specific date. Keep `TimeInput` and `Note / location` in both modes.

- [ ] **Step 7: Run focused checks**

Run: `npm test -- src/lib/announcement-utils.test.ts && npx tsc --noEmit`

Expected: all tests and TypeScript pass.

- [ ] **Step 8: Commit recurrence storage**

```bash
git add src/lib/library-types.ts src/lib/announcement-utils.ts src/lib/announcement-utils.test.ts src/lib/library-server.ts 'src/app/api/library/[kind]/route.ts' 'src/app/api/library/[kind]/[id]/route.ts' src/components/LibraryManager.tsx
git commit -m "Add recurring announcement weekdays"
```

---

### Task 3: Build reusable occurrence and inline-create dialogs

**Files:**
- Create: `src/components/AnnouncementOccurrenceEditor.tsx`
- Create: `src/components/LibraryQuickCreateDialog.tsx`
- Modify: `src/components/LibraryManager.tsx`

**Interfaces:**
- Produces: `AnnouncementOccurrenceEditor({occurrences, onChange, isMobile})`
- Produces: `LibraryQuickCreateDialog({kind, isOpen, isMobile, onClose, onCreated})`
- Consumes: `createLibraryItem`

- [ ] **Step 1: Extract the occurrence editor**

Move the controlled occurrence fields from `LibraryManager` into `AnnouncementOccurrenceEditor`. Its update contract is:

```ts
interface AnnouncementOccurrenceEditorProps {
    occurrences: AnnouncementOccurrence[];
    isMobile: boolean;
    onChange: (occurrences: AnnouncementOccurrence[]) => void;
}
```

The component renders `Schedule type`, weekday/date, time, location, remove, and `Add occurrence` with Astryx form and list components. It never saves data itself.

- [ ] **Step 2: Reuse the editor in the library page**

Replace `addOccurrence`, `updateOccurrence`, `removeOccurrence`, and the duplicated occurrence JSX in `LibraryManager` with:

```tsx
<AnnouncementOccurrenceEditor
    occurrences={announcementForm.occurrences}
    isMobile={isMobile}
    onChange={(occurrences) => setAnnouncementForm((form) => ({...form, occurrences}))}
/>
```

- [ ] **Step 3: Build the quick-create dialog**

The song form contains title, artist, default key, BPM, reference link, and notes. The announcement form contains title, optional speaker, details, `AnnouncementOccurrenceEditor`, remarks, priority defaulting to low, active state, and visibility dates.

On submit:

```ts
const created = await createLibraryItem<Song | Announcement>(kind, input);
onCreated(created);
resetForm();
```

Keep form values and show an inline error if creation fails. Use `Create & add` as the primary label and `Cancel` as the secondary action.

- [ ] **Step 4: Run type and lint checks**

Run: `npx tsc --noEmit && npm run lint`

Expected: both commands pass.

- [ ] **Step 5: Commit the shared create workflow**

```bash
git add src/components/AnnouncementOccurrenceEditor.tsx src/components/LibraryQuickCreateDialog.tsx src/components/LibraryManager.tsx
git commit -m "Add inline library creation workflow"
```

---

### Task 4: Redesign the content chooser for batch selection and sorting

**Files:**
- Modify: `src/components/ServiceContentPicker.tsx`
- Modify: `src/components/ServicePlanner.tsx`

**Interfaces:**
- Changes: `onSave` to synchronous `onApply(selectedIds: string[]): void`
- Adds: `onItemCreated(item: Song | Announcement): void`
- Consumes: `LibraryQuickCreateDialog`, dnd-kit sensors, `moveId`, `moveIdByOffset`

- [ ] **Step 1: Separate available and selected state**

Keep `draftIds` for ordered service content and `checkedIds` for available records. Search filters the available list without changing either array.

`Add selected` appends checked IDs that are not already present:

```ts
setDraftIds((current) => [
    ...current,
    ...checkedIds.filter((id) => !current.includes(id)),
]);
setCheckedIds([]);
```

No count validation runs when applying an empty or single-item selection.

- [ ] **Step 2: Add sortable selected records**

Wrap the selected list in `DndContext` and `SortableContext`. Use pointer, touch, and keyboard sensors. A drag handle starts reordering; move-up and move-down buttons call `moveIdByOffset`. On drag end:

```ts
if (over && active.id !== over.id) {
    setDraftIds((ids) => moveId(ids, String(active.id), String(over.id)));
}
```

Use `DragOverlay` for visual movement so application code does not introduce inline transform styles.

- [ ] **Step 3: Apply locally instead of saving remotely**

Replace `Save selection` with `Done`. `Done` calls `onApply(draftIds)` and closes the dialog immediately. Cancel leaves the planner draft unchanged.

- [ ] **Step 4: Add inline library creation**

Add `New song` or `New announcement` beside the available-list heading. When `onCreated` returns a record, append it to the corresponding planner catalog, append its ID to `draftIds`, close the create dialog, and keep the content chooser open.

- [ ] **Step 5: Verify the picker interactions**

Run: `npm test && npx tsc --noEmit && npm run lint`

Expected: checks pass; zero, one, and multiple IDs can be applied.

- [ ] **Step 6: Commit the picker redesign**

```bash
git add src/components/ServiceContentPicker.tsx src/components/ServicePlanner.tsx
git commit -m "Redesign service content chooser"
```

---

### Task 5: Convert the Planner to one local working draft

**Files:**
- Modify: `src/components/ServicePlanner.tsx`

**Interfaces:**
- Consumes: `editableWeekData`, `areWeekDraftsEqual`, `moveId`, `moveIdByOffset`
- Persists: one complete `PublishedScheduleSnapshot` through `saveWeekData`
- Preserves: separate `publishWeekData` action

- [ ] **Step 1: Hold saved and working state separately**

Replace the single mutable `weekData` path with:

```ts
const [savedWeekData, setSavedWeekData] = useState<WeekData | null>(null);
const [draftWeekData, setDraftWeekData] = useState<WeekData | null>(null);
const [savedDetails, setSavedDetails] = useState<ServiceDetailsState>(EMPTY_DETAILS);
const [details, setDetails] = useState<ServiceDetailsState>(EMPTY_DETAILS);
```

Load both pairs from the same server response. Derive the schedule from `draftWeekData`.

- [ ] **Step 2: Compute the dirty state**

```ts
const hasUnsavedChanges = Boolean(savedWeekData && draftWeekData) && (
    !areWeekDraftsEqual(editableWeekData(savedWeekData!), editableWeekData(draftWeekData!))
    || JSON.stringify(savedDetails) !== JSON.stringify(details)
);
```

- [ ] **Step 3: Make every planner action local**

Remove per-action calls to `persist`. Update `draftWeekData` for content selection, row moves, item creation, item edits, duplication, deletion, and service details. Close edit dialogs immediately after their local draft update.

- [ ] **Step 4: Save one complete draft**

Build service-detail overrides into the working copy, then save all editable fields at once:

```ts
const payload = editableWeekData({...draftWeekData, overrides});
const saved = await saveWeekData(weekKey, payload);
setSavedWeekData(saved);
setDraftWeekData(saved);
setSavedDetails(details);
```

On failure, leave `draftWeekData` and `details` unchanged.

- [ ] **Step 5: Add discard, save, and publish states**

`Discard changes` restores both saved copies. `Save changes` is enabled only while dirty. `Publish` is disabled while dirty and explains `Save changes before publishing`. After publishing, replace both week copies with the response without altering details.

- [ ] **Step 6: Add sortable planner rows**

Use Astryx Table children mode with `TableHeader`, `TableBody`, `TableRow`, `TableHeaderCell`, and `TableCell`, allowing each body row to receive the dnd-kit ref and drag attributes. Keep the existing columns and compact density. Use a `DragOverlay` summary while moving. On drag end, update only local `rowOrder`. Keep move-up/down actions in the row action group.

- [ ] **Step 7: Preserve reset semantics**

Reset stays server-backed and confirmed. After success, replace saved and draft state and rebuild both service-detail copies from the Sheet.

- [ ] **Step 8: Run focused checks**

Run: `npm test && npx tsc --noEmit && npm run lint && npm run build`

Expected: all checks pass and Next.js generates every route.

- [ ] **Step 9: Commit batched planner editing**

```bash
git add src/components/ServicePlanner.tsx
git commit -m "Batch service planner edits"
```

---

### Task 6: Render recurring weekdays in the public announcement dialog

**Files:**
- Modify: `src/components/service-details.ts`
- Modify: `src/components/ServiceDetailDialog.tsx`
- Create: `src/components/service-details.test.ts`

**Interfaces:**
- Extends: `AnnouncementOccurrenceDetail.recurringDay`
- Produces: `Every Monday` through `Every Sunday`

- [ ] **Step 1: Add a failing detail-conversion test**

Create an announcement containing `{recurringDay: 'wednesday', time: '19:30', note: 'Alpha Colors'}` and assert that `getServiceDetail` preserves the recurring day, time, and location as separate fields.

- [ ] **Step 2: Extend detail conversion**

Add `recurringDay?: AnnouncementWeekday` to `AnnouncementOccurrenceDetail`. Copy normalized recurrence from native announcements while leaving legacy parsed occurrences unchanged.

- [ ] **Step 3: Format the recurring badge**

Update the date-label formatter:

```ts
if (occurrence.recurringDay) {
    return `Every ${occurrence.recurringDay[0].toUpperCase()}${occurrence.recurringDay.slice(1)}`;
}
```

Continue rendering the time in its own badge and `note` as adjacent location text. Keep speaker above occurrence metadata and remarks in the muted detail region.

- [ ] **Step 4: Run public-detail tests and build**

Run: `npm test -- src/components/service-details.test.ts && npx tsc --noEmit && npm run build`

Expected: tests pass and all routes build.

- [ ] **Step 5: Commit public recurrence rendering**

```bash
git add src/components/service-details.ts src/components/ServiceDetailDialog.tsx src/components/service-details.test.ts
git commit -m "Show recurring announcement weekdays"
```

---

### Task 7: Verify the complete workflow and deploy

**Files:**
- Modify only files required by defects found during verification.

**Interfaces:**
- Verifies: admin draft, save, publish, native libraries, public detail dialogs

- [ ] **Step 1: Run repository checks**

Run:

```bash
npm test
npx tsc --noEmit
npm run lint
npm run build
git diff --check
```

Expected: every command exits with code 0.

- [ ] **Step 2: Verify desktop admin interactions**

At the local admin Planner, change service details, reorder several service rows, select several songs and announcements in batches, create one of each inline, and reorder the selected content. Confirm the network panel shows no weekly schedule POST until `Save changes`.

- [ ] **Step 3: Verify discard, failure, and save behavior**

Confirm discard restores the last saved draft. Simulate a failed schedule save, confirm all pending changes remain, restore connectivity, and retry successfully.

- [ ] **Step 4: Verify the publish boundary**

Confirm the public Order of Service remains unchanged after local edits and after saving the private draft. Publish, then confirm public song/announcement membership and order match the saved selection.

- [ ] **Step 5: Verify mobile interactions**

At 428 by 806 pixels, confirm full-screen choosers, touch dragging, large action targets, readable occurrence fields, inline creation, sticky save actions, and no clipped content.

- [ ] **Step 6: Verify recurring announcements**

Create a recurring Wednesday announcement with time and location. Confirm the public dialog shows `Every Wednesday`, the formatted time badge, the location, optional speaker, details, and remarks in separate regions. Confirm a specific-date announcement remains unchanged.

- [ ] **Step 7: Commit verification fixes**

```bash
git add -A
git commit -m "Polish batched planner workflow"
```

Skip this commit when verification requires no changes.

- [ ] **Step 8: Push and verify production**

Run:

```bash
git push origin main
```

Wait for deployment, then verify the public page and authenticated Planner at `https://os.alphacolors.org/`. Confirm the deployed commit matches the pushed SHA before reporting completion.
