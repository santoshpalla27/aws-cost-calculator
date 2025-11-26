import { ButtonHTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef(
    ({ className, variant = 'primary', size = 'md', ...props }, ref) =& gt; {
    return (
      
    );
}
);

Button.displayName = 'Button';