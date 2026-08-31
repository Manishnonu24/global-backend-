'use client';

import Link from 'next/link';

export default function Button({
  children,
  variant = 'primary', // 'primary' | 'secondary' | 'outline' | 'white' | 'glass' | 'transparent'
  href,
  onClick,
  type = 'button',
  className = '',
  disabled = false,
  isLoading = false,
  ...props
}) {
  // Base classes for the AHP premium design system (padding and size now matched to global standard)
  const baseClasses = 'btn inline-flex items-center justify-center font-heading font-medium text-[15px] md:text-base px-6 py-3 md:px-7 md:py-3.5 rounded-full transition-all duration-300 select-none no-underline cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none';

  // Variant mappings matching AHP brand colors and shadows
  const variants = {
    primary: 'bg-[#0f7c85] hover:bg-[#0c6b73] text-white shadow-[0_8px_24px_rgba(15,124,133,0.2)] hover:shadow-[0_12px_32px_rgba(15,124,133,0.4)] hover:-translate-y-1 hover:scale-105',
    secondary: 'bg-[#27ae60] hover:bg-[#219653] text-white shadow-[0_8px_24px_rgba(39,174,96,0.2)] hover:shadow-[0_12px_32px_rgba(39,174,96,0.4)] hover:-translate-y-1 hover:scale-105',
    outline: 'bg-transparent border border-[#0f7c85]/30 text-[#0f7c85] hover:bg-[#0f7c85]/5 hover:border-[#0f7c85] hover:-translate-y-1 hover:scale-105',
    white: 'bg-white hover:bg-slate-50 text-[#0f7c85] border border-slate-200/80 hover:-translate-y-1 hover:scale-105 shadow-sm hover:shadow-md',
    glass: 'bg-white/80 hover:bg-white text-[#0f7c85] border border-[#0f7c85]/10 backdrop-blur-sm hover:-translate-y-1 hover:scale-105 shadow-sm hover:shadow-md',
    transparent: 'bg-white/10 hover:bg-white/20 border border-white/20 text-white hover:-translate-y-1 hover:scale-105'
  };

  const finalClasses = `${baseClasses} ${variants[variant] || variants.primary} ${className}`;

  const buttonContent = (
    <>
      {isLoading && (
        <svg className="animate-spin -ml-1 mr-2.5 h-4.5 w-4.5 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {children}
    </>
  );

  // If href is provided, render as Next.js Link
  if (href) {
    const isAnchor = href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:');
    const isExternal = href.startsWith('http://') || href.startsWith('https://');

    if (isAnchor || isExternal) {
      return (
        <a href={href} className={finalClasses} {...props}>
          {buttonContent}
        </a>
      );
    }

    return (
      <Link href={href} className={finalClasses} {...props}>
        {buttonContent}
      </Link>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={finalClasses}
      {...props}
    >
      {buttonContent}
    </button>
  );
}
