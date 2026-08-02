import AdminFrame from '@/components/AdminFrame';
import LibraryManager from '@/components/LibraryManager';
import {requireAdmin} from '@/lib/admin-auth';

export default async function AnnouncementsPage() {
    await requireAdmin();
    return (
        <AdminFrame active="announcements">
            <LibraryManager kind="announcements" />
        </AdminFrame>
    );
}
