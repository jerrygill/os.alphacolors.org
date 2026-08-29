# Batched Service Planner Editing Design

## Purpose

The Service Planner currently saves many actions immediately. Reordering a row, editing service details, or changing selected content pauses while the server responds. The planner should instead feel like an editor: administrators make several changes without waiting, review the pending result, and save once.

This change also makes the song and announcement choosers faster, allows new library records to be created without leaving the planner, and gives recurring announcements a clear public label such as `Every Wednesday`.

## Editing model

The planner loads the saved weekly draft into a local working copy. Every planner interaction updates that working copy immediately:

- Edit service details and serving-team assignments.
- Add, edit, duplicate, delete, or reorder service rows.
- Select and reorder songs.
- Select and reorder announcements.

The page compares the working copy with the last saved draft. A persistent action area shows when changes are pending and provides these actions:

- `Discard changes` restores the last saved draft.
- `Save changes` sends the complete working draft in one request.
- `Publish` remains separate and is disabled while unsaved changes exist.

Publishing continues to copy the saved draft into `publishedSnapshot`. The public Order of Service never reads unsaved planner state. If saving fails, the working copy and all pending changes remain on screen.

## Service-row ordering

Each planner row has a drag handle. Dragging updates the local `rowOrder` without a request. Desktop users can drag with a pointer; touch users can drag on mobile. An accessible action menu retains `Move up` and `Move down` controls for keyboard users and as a reliable fallback.

The planner derives the visible schedule from the local working copy, so time recalculation and row order update together before saving.

## Song and announcement selection

The content chooser separates available records from records selected for this service.

The available area provides search and checkboxes. Administrators may select several records, then use `Add selected` once. The selected area shows the public order and supports drag-to-reorder, removal, and the same keyboard move fallback used by planner rows. Zero, one, or many records are valid; the interface shows no minimum-selection warning.

`Done` returns the ordered selection to the planner's local working copy. It does not contact the weekly schedule API. The planner's `Save changes` action persists both content selections with the other pending changes.

Each chooser also provides `New song` or `New announcement`. The compact form uses the existing native library fields and a `Create & add` action. Creating the library record makes one focused request because the record needs a durable identifier. The chooser stays open, adds the new record to the service selection, and allows another record to be created without leaving the workflow. Discarding planner changes keeps the new record in its reusable library but removes it from the unsaved service selection.

## Announcement occurrences

Each announcement occurrence has one of two modes:

- `Specific date` stores an ISO date.
- `Recurring weekday` stores a weekday from Monday through Sunday.

Both modes may also store a time and location. An announcement may contain multiple occurrence rows, which supports schedules such as two dates at different locations.

The public announcement dialog renders the occurrence parts separately:

- A recurring weekday becomes a badge such as `Every Wednesday`.
- A specific date keeps the existing formatted date badge.
- Time receives its own badge.
- Location appears as adjacent text.

Remarks remain a separate body section. Speaker remains optional and appears as structured announcement metadata. New announcements default to low priority in the form, API normalization, and database default. Existing records keep their saved priority.

## Responsive interface

Desktop choosers use a wide dialog with available and selected regions. Mobile choosers use a full-screen dialog with the same order of operations and large touch targets. Dense collections remain lists or rows rather than nested cards.

The page uses Astryx layout, form, list, dialog, feedback, and action components. Status text identifies saved, unsaved, saving, and error states without relying on color alone. Focus returns to the control that opened a dialog. Destructive actions retain confirmation.

## Failure handling

- A failed planner save keeps the complete local working copy and enables retry.
- A failed inline library creation keeps the form values and chooser selection.
- A library refresh never drops saved identifiers silently; unresolved records remain excluded from the public view as they are today.
- Publish stays disabled until the weekly draft saves successfully.
- Reset remains an explicit destructive action and reloads the resulting server state after confirmation.

## Verification

Verify these flows on desktop and a 428-pixel mobile viewport:

1. Make several planner changes, including multiple reorders, without observing schedule requests.
2. Discard the changes and confirm the last saved draft returns.
3. Repeat the edits, save once, and confirm one complete weekly draft persists.
4. Confirm the public Order of Service remains unchanged before Publish and updates after Publish.
5. Select zero songs, one song, and several songs without validation warnings.
6. Batch-add and reorder existing songs and announcements.
7. Create a song and announcement inside their choosers and confirm each reusable library receives the new record.
8. Create specific-date and recurring-weekday announcement occurrences, including multiple occurrences.
9. Confirm `Every Wednesday`, time, location, speaker, and remarks render in their intended public regions.
10. Force failed saves and confirm pending changes and form input remain available for retry.

Run focused unit tests, TypeScript checks, lint, the production build, `git diff --check`, and browser verification before deployment.
