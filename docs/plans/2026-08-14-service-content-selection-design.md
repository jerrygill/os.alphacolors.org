# Service Content Selection Design

## Purpose

The Songs and Announcements pages are reusable catalogs. A service may use only a few records from either catalog, so catalog membership must never decide what appears on the public Order of Service.

The Service Planner owns the selection for each week. The `Praise & Worship` row selects songs, and the `Announcement` row selects announcements. The published Order of Service shows only the selected records, in the selected order.

## Planner experience

Recognized song and announcement rows display a content action beside the row title:

- `Choose songs` for song rows.
- `Choose announcements` for announcement rows.

The action opens a searchable dialog backed by the corresponding native library. The dialog has two responsibilities:

1. Add or remove catalog records from the current service.
2. Reorder selected records with explicit move-up and move-down controls.

Each service row shows the selected count and a short title summary. An empty selection is valid and produces no public popup button.

The dialog uses the existing Astryx controls, visible labels, keyboard-accessible buttons, disabled boundary actions, loading feedback, and inline errors. Desktop and mobile use the same data model; mobile uses a full-screen dialog.

## Data ownership and publishing

`WeekData.songIds` and `WeekData.announcementIds` already store ordered identifiers. The Planner edits these arrays in the weekly draft. The existing Publish action copies them into `publishedSnapshot` with the schedule overrides.

The public view resolves the published identifiers against the native libraries:

- Missing or deleted identifiers are ignored.
- Empty arrays produce no detail button.
- Song visibility depends only on the published song selection.
- Announcement visibility requires both published selection and the existing active/display-window rules.
- The identifier array defines popup order.

The library pages remain responsible for catalog fields, search, creation, editing, and deletion. They do not control service membership or service order.

## Current-service migration

Before the new filtering behavior reaches production, copy the currently displayed four song identifiers and six announcement identifiers into the current week's draft and published snapshot. Preserve every existing schedule override and publication timestamp. This keeps the live service unchanged until an administrator edits and republishes the selections.

## Failure handling

- If either library fails to load, the Planner shows an error and keeps the saved identifiers intact.
- Saving a selection keeps the dialog open until the server confirms the draft update.
- Publishing remains the only action that changes the public selection.
- Deleted catalog records disappear safely because public resolution ignores unknown identifiers.

## Verification

Verify both content types through the same flow:

1. Open the Service Planner.
2. Open the row-level selector.
3. Select a subset, reorder it, and save the draft.
4. Confirm the public OS remains unchanged before Publish.
5. Publish the service.
6. Confirm the public button count, item membership, and popup order match the saved selection.

Run TypeScript, lint, production build, diff checks, desktop browser checks, a 428-pixel mobile check, and a live deployment check.
