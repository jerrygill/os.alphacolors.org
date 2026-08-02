import {
    Announcement,
    AnnouncementInput,
    LibraryKind,
    Song,
    SongInput,
} from './library-types';

type LibraryItem = Song | Announcement;
type LibraryInput = SongInput | AnnouncementInput;

async function readResponse<T>(response: Response): Promise<T> {
    const result = await response.json().catch(() => ({})) as {error?: string} & T;
    if (!response.ok) throw new Error(result.error || 'Library request failed.');
    return result;
}

export async function getLibrary<T extends LibraryItem>(kind: LibraryKind): Promise<T[]> {
    const response = await fetch(`/api/library/${kind}`, {cache: 'no-store'});
    const result = await readResponse<{items: T[]}>(response);
    return result.items;
}

export async function createLibraryItem<T extends LibraryItem>(
    kind: LibraryKind,
    input: LibraryInput,
): Promise<T> {
    const response = await fetch(`/api/library/${kind}`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(input),
    });
    const result = await readResponse<{item: T}>(response);
    return result.item;
}

export async function updateLibraryItem<T extends LibraryItem>(
    kind: LibraryKind,
    id: string,
    input: LibraryInput,
): Promise<T> {
    const response = await fetch(`/api/library/${kind}/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(input),
    });
    const result = await readResponse<{item: T}>(response);
    return result.item;
}

export async function deleteLibraryItem(kind: LibraryKind, id: string): Promise<void> {
    const response = await fetch(`/api/library/${kind}/${encodeURIComponent(id)}`, {
        method: 'DELETE',
    });
    await readResponse<{deleted: boolean}>(response);
}
