import AdminFrame from '@/components/AdminFrame';
import LibraryManager from '@/components/LibraryManager';
import {requireAdmin} from '@/lib/admin-auth';

export default async function SongsPage() {
    await requireAdmin();
    return (
        <AdminFrame active="songs">
            <LibraryManager kind="songs" />
        </AdminFrame>
    );
}
