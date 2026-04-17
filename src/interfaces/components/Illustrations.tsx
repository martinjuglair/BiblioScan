/**
 * Custom SVG illustrations for empty states and onboarding.
 * Bubblegum palette: Grape #EA580C, Bubblegum #FB923C, Mint #34D399, Lemon #FBBF24, Sky #38BDF8
 */

/** Stack of books illustration */
export function BookStackIllustration({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Bottom book */}
      <rect x="20" y="72" width="80" height="16" rx="3" fill="#EA580C" opacity="0.9" />
      <rect x="24" y="76" width="30" height="3" rx="1.5" fill="white" opacity="0.6" />
      {/* Middle book */}
      <rect x="15" y="52" width="85" height="16" rx="3" fill="#FB923C" opacity="0.85" transform="rotate(-3 57 60)" />
      <rect x="22" y="57" width="25" height="3" rx="1.5" fill="white" opacity="0.6" transform="rotate(-3 34 58)" />
      {/* Top book */}
      <rect x="25" y="32" width="70" height="16" rx="3" fill="#34D399" opacity="0.85" transform="rotate(2 60 40)" />
      <rect x="30" y="37" width="20" height="3" rx="1.5" fill="white" opacity="0.6" transform="rotate(2 40 38)" />
      {/* Bookmark */}
      <path d="M75 28V15a2 2 0 014 0v13l-2-2-2 2z" fill="#FB923C" />
      {/* Sparkles */}
      <circle cx="95" cy="25" r="2.5" fill="#FBBF24" opacity="0.7" />
      <circle cx="100" cy="35" r="1.5" fill="#EA580C" opacity="0.5" />
      <circle cx="18" cy="45" r="2" fill="#38BDF8" opacity="0.5" />
    </svg>
  );
}

/** Open book with heart illustration (for wishlist) */
export function WishlistIllustration({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Open book */}
      <path d="M20 85V35c0-2 1-4 3-4h30c5 0 7 3 7 3s2-3 7-3h30c2 0 3 2 3 4v50" stroke="#EA580C" strokeWidth="2.5" fill="none" />
      <path d="M60 34v51" stroke="#FDBA74" strokeWidth="1.5" opacity="0.5" />
      {/* Lines on left page */}
      <rect x="28" y="45" width="24" height="2" rx="1" fill="#E5E7EB" />
      <rect x="28" y="53" width="20" height="2" rx="1" fill="#E5E7EB" />
      <rect x="28" y="61" width="22" height="2" rx="1" fill="#E5E7EB" />
      {/* Heart */}
      <path d="M72 48c0-4 3-7 6.5-7S85 44 85 48c0 0 0 0 0 0 0 4-6.5 10-6.5 10S72 52 72 48z" fill="#FB923C" opacity="0.8" />
      <path d="M85 48c0-4 3-7 6.5-7S98 44 98 48c0 0 0 0 0 0 0 4-6.5 10-6.5 10S85 52 85 48z" fill="#FB923C" opacity="0.8" />
    </svg>
  );
}

/** Empty shelf illustration */
export function EmptyShelfIllustration({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Shelf */}
      <rect x="15" y="80" width="130" height="4" rx="2" fill="#E5E7EB" />
      <rect x="20" y="84" width="3" height="20" rx="1" fill="#EADAC4" />
      <rect x="137" y="84" width="3" height="20" rx="1" fill="#EADAC4" />
      {/* Single leaning book */}
      <rect x="65" y="45" width="14" height="35" rx="2" fill="#EA580C" opacity="0.8" transform="rotate(-8 72 62)" />
      <rect x="69" y="50" width="6" height="2" rx="1" fill="white" opacity="0.5" transform="rotate(-8 72 51)" />
      {/* Dust particles */}
      <circle cx="40" cy="70" r="1.5" fill="#FBBF24" opacity="0.3" />
      <circle cx="110" cy="65" r="2" fill="#38BDF8" opacity="0.3" />
      <circle cx="95" cy="75" r="1" fill="#FB923C" opacity="0.3" />
      {/* Arrow pointing up with "+" */}
      <text x="80" y="38" textAnchor="middle" fill="#9CA3AF" fontSize="28" fontFamily="sans-serif" fontWeight="300" opacity="0.4">+</text>
    </svg>
  );
}

/** Scanner illustration */
export function ScanIllustration({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Phone outline */}
      <rect x="35" y="15" width="50" height="90" rx="8" stroke="#EADAC4" strokeWidth="2" fill="white" />
      {/* Screen */}
      <rect x="39" y="25" width="42" height="65" rx="2" fill="#F5F3FF" />
      {/* Barcode */}
      <rect x="48" y="42" width="2" height="20" rx="0.5" fill="#1E1B4B" />
      <rect x="52" y="42" width="3" height="20" rx="0.5" fill="#1E1B4B" />
      <rect x="57" y="42" width="1.5" height="20" rx="0.5" fill="#1E1B4B" />
      <rect x="60.5" y="42" width="3" height="20" rx="0.5" fill="#1E1B4B" />
      <rect x="65.5" y="42" width="2" height="20" rx="0.5" fill="#1E1B4B" />
      <rect x="69.5" y="42" width="1.5" height="20" rx="0.5" fill="#1E1B4B" />
      {/* Scan line */}
      <rect x="44" y="50" width="32" height="2" rx="1" fill="#EA580C" opacity="0.8" />
      {/* Sparkle */}
      <circle cx="88" cy="30" r="3" fill="#FBBF24" opacity="0.6" />
      <circle cx="30" cy="50" r="2" fill="#34D399" opacity="0.4" />
    </svg>
  );
}

/** Chart/stats illustration */
export function StatsIllustration({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Bars */}
      <rect x="20" y="60" width="16" height="40" rx="3" fill="#EA580C" opacity="0.8" />
      <rect x="42" y="40" width="16" height="60" rx="3" fill="#FB923C" opacity="0.8" />
      <rect x="64" y="25" width="16" height="75" rx="3" fill="#34D399" opacity="0.8" />
      <rect x="86" y="50" width="16" height="50" rx="3" fill="#38BDF8" opacity="0.8" />
      {/* Star */}
      <path d="M50 18l2 4 5 1-4 3 1 5-4-2-4 2 1-5-4-3 5-1z" fill="#FBBF24" opacity="0.6" />
    </svg>
  );
}
