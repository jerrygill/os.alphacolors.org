import { useState, useEffect } from 'react';
import { CustomAct } from '@/lib/storage';

interface AddPerformanceProps {
    onAdd: (act: Omit<CustomAct, 'id' | 'isNew'>) => void;
    initialData?: Partial<CustomAct>;
}

export default function AddPerformance({ onAdd, initialData }: AddPerformanceProps) {
    const [isOpen, setIsOpen] = useState(!!initialData);
    
    const [formData, setFormData] = useState({
        timeFrom: '',
        timeTo: '',
        duration: initialData?.duration || '',
        event: initialData?.event || '',
        host: initialData?.host || '',
        remarks: initialData?.remarks || ''
    });

    useEffect(() => {
        if (initialData) {
            setFormData(prev => ({
                ...prev,
                duration: initialData.duration || '',
                event: initialData.event || '',
                host: initialData.host || '',
                remarks: initialData.remarks || ''
            }));
            setIsOpen(true);
        }
    }, [initialData]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onAdd(formData);
        // Reset form
        setFormData({
            timeFrom: '',
            timeTo: '',
            duration: '',
            event: '',
            host: '',
            remarks: ''
        });
        setIsOpen(false);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="mt-4 flex items-center justify-center w-full p-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl text-gray-500 hover:border-blue-500 hover:text-blue-500 transition-colors"
            >
                + Add Performance / Act
            </button>
        );
    }

    return (
        <div className="mt-4 bg-gray-50 dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-bold mb-4">Add Custom Performance</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                    <div className="col-span-1">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Duration (Minutes)</label>
                        <input
                            required
                            name="duration"
                            type="number"
                            min="0"
                            placeholder="10"
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-black focus:ring-2 focus:ring-blue-500"
                            value={formData.duration}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="col-span-1 lg:col-span-3">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Event Name</label>
                        <input
                            required
                            name="event"
                            type="text"
                            placeholder="Worship / Solo Item"
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-black focus:ring-2 focus:ring-blue-500"
                            value={formData.event}
                            onChange={handleChange}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Host / Team</label>
                        <input
                            name="host"
                            type="text"
                            placeholder="Person Name"
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-black focus:ring-2 focus:ring-blue-500"
                            value={formData.host}
                            onChange={handleChange}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Remarks</label>
                        <input
                            name="remarks"
                            type="text"
                            placeholder="Details..."
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-black focus:ring-2 focus:ring-blue-500"
                            value={formData.remarks}
                            onChange={handleChange}
                        />
                    </div>
                </div>

                <div className="flex justify-end space-x-3 pt-2">
                    <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
                    >
                        Add Item
                    </button>
                </div>
            </form>
        </div>
    );
}
