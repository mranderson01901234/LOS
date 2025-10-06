import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface NavItemProps {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: number | string;
  collapsed?: boolean;
}

export function NavItem({ to, icon: Icon, label, badge, collapsed }: NavItemProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'group flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-all duration-150',
          isActive 
            ? 'bg-accent-subtle text-text-primary shadow-premium' 
            : 'text-text-secondary hover:bg-accent-subtle hover:text-text-primary',
          collapsed && 'justify-center px-3'
        )
      }
      title={collapsed ? label : undefined}
    >
      <Icon className="h-5 w-5" />
      {!collapsed && <span className="flex-1 truncate font-medium">{label}</span>}
      {!collapsed && badge !== undefined && (
        <span className="text-xs rounded-md bg-bg-elevated px-2 py-1 text-text-tertiary">
          {badge}
        </span>
      )}
    </NavLink>
  );
}
