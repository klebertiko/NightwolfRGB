import React from 'react';

export const BrandMark: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
    <span className={`inline-flex shrink-0 overflow-visible shadow-ember ${className}`}>
        <img src="/mark.svg" alt="" aria-hidden="true" className="block w-full h-full" />
    </span>
);
