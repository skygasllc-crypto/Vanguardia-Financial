import type { SVGProps } from 'react'

const base = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

export const DashboardIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <rect x="3" y="3" width="8" height="10" rx="1.5" /><rect x="13" y="3" width="8" height="6" rx="1.5" />
    <rect x="13" y="13" width="8" height="8" rx="1.5" /><rect x="3" y="15" width="8" height="6" rx="1.5" />
  </svg>
)
export const MarketsIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><path d="M4 19V10M10 19V5M16 19V13M22 19V8" /></svg>
)
export const TradeIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><path d="M3 17L9 11L13 15L21 7" /><path d="M15 7H21V13" /></svg>
)
export const PortfolioIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="9" /><path d="M12 3V12L18 15" /></svg>
)
export const WatchlistIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><path d="M12 17.3L5.8 21l1.6-7.1L2 9.2l7.2-.6L12 2l2.8 6.6 7.2.6-5.4 4.7 1.6 7.1z" /></svg>
)
export const WalletIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10H21" /><circle cx="16.5" cy="14" r="1" fill="currentColor" /></svg>
)
export const SecurityIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><path d="M12 3L4 6V11C4 16 7.4 20 12 21C16.6 20 20 16 20 11V6L12 3Z" /></svg>
)
export const ProfileIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21C4 16.6 7.6 14 12 14C16.4 14 20 16.6 20 21" /></svg>
)
export const AdminIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><path d="M12 2L4 5V11C4 16.5 7.4 20.7 12 22C16.6 20.7 20 16.5 20 11V5L12 2Z" /><path d="M9.5 12L11 13.5L14.5 10" /></svg>
)
export const LogoutIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></svg>
)
export const BellIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 01-3.4 0" /></svg>
)
export const ChevronDownIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><path d="M6 9L12 15L18 9" /></svg>
)
export const MenuIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><path d="M3 6H21M3 12H21M3 18H21" /></svg>
)
