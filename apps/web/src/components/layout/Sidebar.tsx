import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ArrowLeftRight,
  PiggyBank,
  Settings,
  LogOut,
  TrendingUp,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { useGroupStore } from '@/store/group.store';
import { Button } from '@/components/ui/button';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/transactions', label: 'Transações', icon: ArrowLeftRight },
  { to: '/budgets', label: 'Orçamentos', icon: PiggyBank },
  { to: '/settings', label: 'Configurações', icon: Settings },
];

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { logout, user } = useAuthStore();
  const { activeGroup } = useGroupStore();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-5 border-b border-sidebar-border">
        <TrendingUp className="h-6 w-6 text-sidebar-primary" />
        <span className="text-lg font-bold text-sidebar-foreground">FinTrack</span>
      </div>

      {/* Group name */}
      {activeGroup && (
        <div className="px-6 py-3 border-b border-sidebar-border">
          <p className="text-xs text-sidebar-foreground/60 uppercase tracking-wide">Grupo ativo</p>
          <p className="text-sm font-medium text-sidebar-foreground truncate">{activeGroup.name}</p>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User + logout */}
      <div className="px-4 py-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-8 w-8 rounded-full bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground text-sm font-semibold">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">{user?.name}</p>
            <p className="text-xs text-sidebar-foreground/60 truncate">{user?.email}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="w-full justify-start text-sidebar-foreground/70" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" />
          Sair
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-sidebar border-r border-sidebar-border h-screen sticky top-0">
        <SidebarContent />
      </aside>

      {/* Mobile toggle */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-background border shadow-sm"
        onClick={() => setMobileOpen((v) => !v)}
        aria-label="Menu"
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="w-64 bg-sidebar border-r border-sidebar-border h-full overflow-y-auto">
            <SidebarContent />
          </div>
          <div className="flex-1 bg-black/40" onClick={() => setMobileOpen(false)} />
        </div>
      )}
    </>
  );
}
