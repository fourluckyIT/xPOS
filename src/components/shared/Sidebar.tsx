import { NavLink } from 'react-router-dom';
import { useAppStore } from '@/store/app-store';
import { hasAccess } from '@/lib/roles';
import {
  ShoppingCart, LayoutGrid, Package, Users, BarChart3,
  Settings, LogOut, ChefHat, Receipt, UtensilsCrossed, UserCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

import type { BusinessType } from '@/types';

type NavItem = {
  to: string;
  icon: typeof ShoppingCart;
  label: string;
  minRole: 'staff' | 'manager' | 'super_admin';
  hideFor?: BusinessType;
};

const navItems: NavItem[] = [
  { to: '/pos', icon: ShoppingCart, label: 'ขาย', minRole: 'staff' },
  { to: '/tables', icon: LayoutGrid, label: 'โต๊ะ', minRole: 'staff', hideFor: 'retail' },
  { to: '/kitchen', icon: ChefHat, label: 'ครัว', minRole: 'staff', hideFor: 'retail' },
  { to: '/menu', icon: UtensilsCrossed, label: 'เมนู', minRole: 'manager' },
  { to: '/inventory', icon: Package, label: 'สต๊อก', minRole: 'manager' },
  { to: '/employees', icon: Users, label: 'พนักงาน', minRole: 'manager' },
  { to: '/crm', icon: UserCircle, label: 'ลูกค้า', minRole: 'manager' },
  { to: '/history', icon: Receipt, label: 'บิล', minRole: 'staff' },
  { to: '/reports', icon: BarChart3, label: 'รายงาน', minRole: 'manager' },
  { to: '/settings', icon: Settings, label: 'ตั้งค่า', minRole: 'manager' },
];

export default function Sidebar() {
  const { currentUser, currentStore, logout } = useAppStore();

  if (!currentUser) return null;

  return (
    <aside className="w-[72px] h-screen bg-foreground flex flex-col items-center py-3 gap-1 shrink-0">
      {/* Store logo */}
      <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg mb-2">
        {currentStore?.name?.charAt(0) || 'x'}
      </div>

      <div className="w-10 h-px bg-gray-700 mb-1" />

      {/* Nav items */}
      <nav className="flex-1 flex flex-col gap-0.5 w-full px-2">
        {navItems
          .filter((item) => hasAccess(currentUser.role, item.minRole))
          .filter((item) => !item.hideFor || currentStore?.businessType !== item.hideFor)
          .map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-0.5 py-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-all text-[10px]',
                  isActive && 'text-white bg-gray-800'
                )
              }
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
      </nav>

      {/* User + Logout */}
      <div className="flex flex-col items-center gap-2 px-2">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">
          {currentUser.name.charAt(0)}
        </div>
        <button
          onClick={logout}
          className="flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl text-gray-500 hover:text-red-400 hover:bg-gray-800 transition-all text-[10px] w-full"
        >
          <LogOut className="w-4 h-4" />
          <span>ออก</span>
        </button>
      </div>
    </aside>
  );
}
