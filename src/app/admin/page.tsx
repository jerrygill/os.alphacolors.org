import AdminFrame from '@/components/AdminFrame';
import ServicePlanner from '@/components/ServicePlanner';
import {requireAdmin} from '@/lib/admin-auth';

export default async function AdminPage() {
    await requireAdmin();
    return (
        <AdminFrame active="planner">
            <ServicePlanner />
        </AdminFrame>
    );
}
