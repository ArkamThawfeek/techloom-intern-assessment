import { LayoutDashboard, Package, ShoppingCart, ListOrdered, Store } from 'lucide-react';

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'pos', label: 'POS / New Order', icon: ShoppingCart },
  { id: 'orders', label: 'Orders', icon: ListOrdered }
];

export default function Sidebar({ active, onNavigate }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="brand-icon"><Store size={16} /></span>
        POS System
      </div>
      <nav className="sidebar-nav">
        {NAV.map(({ id, label, icon: Icon }) => (
          <button key={id} className={active === id ? 'active' : ''} onClick={() => onNavigate(id)}>
            <Icon size={17} />
            {label}
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="avatar">A</div>
        <div className="who">
          <div className="name">Admin</div>
          <div className="role">Store owner</div>
        </div>
      </div>
    </aside>
  );
}
