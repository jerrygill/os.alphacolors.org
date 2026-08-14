# Service Content Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let administrators choose and order the songs and announcements for each weekly service from the corresponding Planner rows, then publish only those selections to the public OS.

**Architecture:** Keep Songs and Announcements as reusable native catalogs. Store ordered catalog identifiers in the existing `WeekData.songIds` and `WeekData.announcementIds` arrays, edit them as draft data, and resolve only the published arrays on the public page. Add one shared Astryx selection dialog for both content types.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Astryx 0.2, Neon-backed schedule JSON, native library APIs.

## Global Constraints

- The Google Sheet supplies the service-flow rows only; it does not supply song or announcement lists.
- The Planner controls weekly content membership and order.
- The public OS changes only after Publish.
- Empty selection hides the corresponding public detail button.
- Preserve the four latest songs prepared for the current service and the six current announcements during migration.
- Use Astryx components and tokens; do not introduce a second component system.

---

### Task 1: Expose service-content row classification

**Files:**
- Modify: `src/components/service-details.ts`

**Interfaces:**
- Produces: `ServiceContentKind = 'songs' | 'announcements'`
- Produces: `getServiceContentKind(item: Pick<ScheduleItem, 'event'>): ServiceContentKind | null`
- Consumed by: `ServicePlanner` and `getServiceDetail`

- [ ] **Step 1: Export the shared content kind and classifier**

```ts
export type ServiceContentKind = 'songs' | 'announcements';

export function getServiceContentKind(
    item: Pick<ScheduleItem, 'event'>,
): ServiceContentKind | null {
    const eventName = normalizeServiceText(item.event);
    if (ANNOUNCEMENT_EVENTS.has(eventName)) return 'announcements';
    if (SONG_EVENTS.has(eventName)) return 'songs';
    return null;
}
```

- [ ] **Step 2: Reuse the classifier inside detail resolution**

Replace repeated event-set branching in `isLegacyServiceDetailRemark` and `getServiceDetail` with `getServiceContentKind(item)`. Keep all legacy Sheet detail parsing excluded from native output.

- [ ] **Step 3: Run the type checker**

Run: `npx tsc --noEmit`

Expected: exit code 0.

---

### Task 2: Build the shared ordered content picker

**Files:**
- Create: `src/components/ServiceContentPicker.tsx`

**Interfaces:**
- Consumes: `ServiceContentKind`, catalog records, ordered selected identifiers
- Produces: `onSave(selectedIds: string[]): Promise<void>`

- [ ] **Step 1: Define focused picker props**

```ts
interface ServiceContentPickerProps {
    kind: ServiceContentKind;
    items: Array<{id: string; title: string; supportingText?: string}>;
    selectedIds: string[];
    isOpen: boolean;
    isSaving: boolean;
    onClose: () => void;
    onSave: (selectedIds: string[]) => Promise<void>;
}
```

- [ ] **Step 2: Add searchable selection without losing order**

Use Astryx `MultiSelector` for catalog membership. When its value changes, keep retained IDs in their current order and append newly selected IDs in catalog order:

```ts
function mergeSelectionOrder(current: string[], next: string[]): string[] {
    const nextSet = new Set(next);
    return [
        ...current.filter((id) => nextSet.has(id)),
        ...next.filter((id) => !current.includes(id)),
    ];
}
```

- [ ] **Step 3: Add the ordered selected list**

Render selected records with `List` and `ListItem`. Give every row accessible move-up, move-down, and remove `IconButton` actions. Disable movement at the list boundaries.

- [ ] **Step 4: Add save, cancel, loading, and empty states**

Use an Astryx `Dialog`, a full-screen mobile variant, a count subtitle, and a `LayoutFooter`. Save only when the administrator presses `Save selection`; keep the dialog open on failure.

- [ ] **Step 5: Run the type checker**

Run: `npx tsc --noEmit`

Expected: exit code 0.

---

### Task 3: Connect both Planner rows to their native catalogs

**Files:**
- Modify: `src/components/ServicePlanner.tsx`

**Interfaces:**
- Consumes: `getLibrary<Song>()`, `getLibrary<Announcement>()`, `getServiceContentKind()`
- Consumes: `ServiceContentPicker`
- Produces: draft `songIds` and `announcementIds` through existing `saveWeekData()`

- [ ] **Step 1: Load both catalogs with the schedule**

Extend the existing `Promise.all` to read songs and announcements. Keep catalog load failures visible instead of silently replacing the libraries with empty arrays.

- [ ] **Step 2: Add row-level content summaries and actions**

For recognized rows, show:

```text
4 songs selected · The Time Has Come, Alleluia, +2
6 announcements selected · Welcome All & New Friends, Acts a Day, +4
```

Add `Choose songs` or `Choose announcements` beside the summary. Use the same content on desktop and mobile; stop nested button events from opening the service-item editor.

- [ ] **Step 3: Open the picker with the correct draft array**

Pass `weekData.songIds` for song rows and `weekData.announcementIds` for announcement rows. The library order does not override the saved identifier order.

- [ ] **Step 4: Save ordered IDs into the weekly draft**

```ts
const patch = kind === 'songs'
    ? {songIds: selectedIds}
    : {announcementIds: selectedIds};
await persist(patch, `${label} selection saved. Publish to update the public OS.`);
```

- [ ] **Step 5: Correct Planner guidance**

Replace the automatic-display banner copy with: `Choose songs and announcements from their service rows, then publish the service to update the public OS.`

- [ ] **Step 6: Run focused checks**

Run: `npx tsc --noEmit && npm run lint`

Expected: both commands pass.

---

### Task 4: Filter and order public content by the published selection

**Files:**
- Modify: `src/components/LiveServiceView.tsx`

**Interfaces:**
- Consumes: published `weekData.songIds`, `weekData.announcementIds`
- Produces: ordered native arrays passed to `getServiceDetail`

- [ ] **Step 1: Resolve selected songs in published order**

```ts
const selectedSongs = service.weekData.songIds
    .map((id) => service.songs.find((song) => song.id === id))
    .filter((song): song is Song => Boolean(song));
```

- [ ] **Step 2: Resolve visible selected announcements in published order**

```ts
const selectedAnnouncements = service.weekData.announcementIds
    .map((id) => service.announcements.find((announcement) => announcement.id === id))
    .filter((announcement): announcement is Announcement => Boolean(announcement))
    .filter((announcement) => isAnnouncementVisible(announcement));
```

- [ ] **Step 3: Pass only the selected arrays to `getServiceDetail`**

An empty array must return no detail, which hides the corresponding public button.

- [ ] **Step 4: Run the production build**

Run: `npm run build`

Expected: Next.js compiles, type-checks, and generates all routes.

---

### Task 5: Preserve current live content and verify publishing

**Files:**
- No committed migration file; use an authenticated, idempotent one-off script against the existing schedule record.

**Interfaces:**
- Consumes: live song and announcement IDs, current week schedule JSON
- Produces: the same ordered IDs in draft and `publishedSnapshot` without changing schedule overrides, status, or `publishedAt`

- [ ] **Step 1: Read the current live state**

Read the current week key, admin schedule data, public schedule data, and both library APIs. Record identifiers without logging credentials or session cookies.

- [ ] **Step 2: Patch only the two selection arrays**

Update `songIds` and `announcementIds` in both the root weekly data and `publishedSnapshot`. Preserve every other JSON field and timestamp. Run the patch only when the target arrays are empty.

- [ ] **Step 3: Verify the pre-publish draft flow locally**

The flow under test is: Service Planner row -> choose a subset and reorder it -> save draft -> public OS stays unchanged.

- [ ] **Step 4: Verify the publish flow locally**

The flow under test is: Publish -> public OS button count, membership, and popup order match the saved selections.

- [ ] **Step 5: Check desktop and mobile rendering**

Use the Browser plugin at the default desktop viewport and 428 by 806 pixels. Confirm page identity, meaningful DOM, no framework overlay, no relevant console errors, visible picker controls, and working reorder buttons.

- [ ] **Step 6: Run final repository checks**

Run: `npx tsc --noEmit && npm run lint && npm run build && git diff --check`

Expected: every command passes.

- [ ] **Step 7: Commit, push, and verify production**

Push `main`, wait for the deployment, then repeat the public and admin target flows on `https://os.alphacolors.org/`.
