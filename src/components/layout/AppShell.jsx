import BottomNav from './BottomNav'

export default function AppShell({ children, hideNav = false }) {
  return (
    <div className="min-h-screen bg-surface-2 relative">
      <div className={hideNav ? '' : 'with-bottom-nav'}>
        {children}
      </div>
      {!hideNav && <BottomNav />}
    </div>
  )
}
