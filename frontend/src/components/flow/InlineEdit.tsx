"use client";

import React, { useState, useRef, useEffect } from 'react';

interface InlineEditProps {
    value: string | number;
    onChange: (value: string | number) => void;
    type?: 'text' | 'number' | 'select';
    options?: { value: string; label: string }[];
    placeholder?: string;
    className?: string;
    displayClassName?: string;
    inputClassName?: string;
}

export default function InlineEdit({
    value,
    onChange,
    type = 'text',
    options = [],
    placeholder = 'Click to edit',
    className = '',
    displayClassName = '',
    inputClassName = '',
}: InlineEditProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(String(value));
    const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

    useEffect(() => {
        setEditValue(String(value));
    }, [value]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            if (inputRef.current instanceof HTMLInputElement) {
                inputRef.current.select();
            }
        }
    }, [isEditing]);

    const handleSave = () => {
        setIsEditing(false);
        const newValue = type === 'number' ? Number(editValue) : editValue;
        if (newValue !== value) {
            onChange(newValue);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSave();
        } else if (e.key === 'Escape') {
            setEditValue(String(value));
            setIsEditing(false);
        }
    };

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsEditing(true);
    };

    if (type === 'select') {
        return (
            <div className={`inline-edit ${className}`} onClick={handleClick}>
                {isEditing ? (
                    <select
                        ref={inputRef as React.RefObject<HTMLSelectElement>}
                        value={editValue}
                        onChange={(e) => {
                            setEditValue(e.target.value);
                            onChange(e.target.value);
                            setIsEditing(false);
                        }}
                        onBlur={handleSave}
                        className={`inline-edit-input ${inputClassName}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {options.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                ) : (
                    <span className={`inline-edit-display ${displayClassName}`}>
                        {options.find((o) => o.value === String(value))?.label || value || placeholder}
                    </span>
                )}
            </div>
        );
    }

    return (
        <div className={`inline-edit ${className}`} onClick={handleClick}>
            {isEditing ? (
                <input
                    ref={inputRef as React.RefObject<HTMLInputElement>}
                    type={type}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={handleSave}
                    onKeyDown={handleKeyDown}
                    className={`inline-edit-input ${inputClassName}`}
                    onClick={(e) => e.stopPropagation()}
                />
            ) : (
                <span className={`inline-edit-display ${displayClassName}`}>
                    {value || placeholder}
                </span>
            )}
        </div>
    );
}
