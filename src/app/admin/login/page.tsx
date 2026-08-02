import {redirect} from 'next/navigation';
import AdminLoginForm from '@/components/AdminLoginForm';
import {hasAdminSession} from '@/lib/admin-auth';

export default async function AdminLoginPage() {
    if (await hasAdminSession()) redirect('/admin');
    return <AdminLoginForm />;
}
