import { useState, useEffect, useRef } from 'react';

interface EditableCellProps {
    initialValue: string;
    onSave: (value: string) => void;
    isOverridden?: boolean;
}

export default function EditableCell({ initialValue, onSave, isOverridden }: EditableCellProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [value, setValue] = useState(initialValue);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setValue(initialValue);
    }, [initialValue]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleBlur = () => {
        setIsEditing(false);
        if (value !== initialValue) {
            onSave(value);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleBlur();
        } else if (e.key === 'Escape') {
            setIsEditing(false);
            setValue(initialValue);
        }
    };

    if (isEditing) {
        return (
            <input
                ref={inputRef}
                type="text"
                className="w-full px-2 py-1 bg-white border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-200"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
            />
        );
    }

    return (
        <div
            onClick={() => setIsEditing(true)}
            className={`relative cursor-pointer hover:bg-black/5 dark:hover:bg-white/10 px-2 py-1 rounded transition-colors group ${isOverridden ? 'bg-amber-100 dark:bg-amber-900/30' : ''
                }`}
        >
            <span className={!value ? 'text-gray-400 italic' : ''}>
                {value || 'Empty'}
            </span>
            <span className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-xs text-gray-400">
                ✎
            </span>
        </div>
    );
}
