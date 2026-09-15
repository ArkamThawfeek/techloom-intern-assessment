import { Search, ShoppingCart, ShoppingBag } from 'lucide-react';

export default function TopNav({ query, onQueryChange, cartCount, onNavigate, active }) {
  return (
    <div>
      <div className="topnav">
        <div className="brand">
          <span className="brand-icon"><ShoppingBag size={15} /></span>
          ShopMate
        </div>
        <form className="search-input" onSubmit={(e) => e.preventDefault()}>
          <Search size={20} />
          <input
            placeholder="Search for products..."
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
          />
        </form>
        <div className="topnav-icons">
          <button className="icon-btn" aria-label="Cart" onClick={() => onNavigate('cart')}>
            <ShoppingCart size={26} />
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </button>
        </div>
      </div>
      <div className="subnav">
        <button className={active === 'browse' ? 'active' : ''} onClick={() => onNavigate('browse')}>Home</button>
        <button className={active === 'orders' ? 'active' : ''} onClick={() => onNavigate('orders')}>My orders</button>
        <button className={active === 'admin' ? 'active' : ''} onClick={() => onNavigate('admin')}>Manage products</button>
      </div>
    </div>
  );
}
