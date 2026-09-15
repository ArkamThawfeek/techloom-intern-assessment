import { useEffect, useRef, useState } from 'react';
import TopNav from './components/TopNav.jsx';
import Browse from './components/Browse.jsx';
import ProductDetails from './components/ProductDetails.jsx';
import Cart from './components/Cart.jsx';
import CheckoutShipping from './components/CheckoutShipping.jsx';
import Payment from './components/Payment.jsx';
import OrderHistory from './components/OrderHistory.jsx';
import OrderDetail from './components/OrderDetail.jsx';
import ProductsAdmin from './components/ProductsAdmin.jsx';
import ResultModal from './components/ResultModal.jsx';
import ToastContainer from './components/ToastContainer.jsx';
import { api, newIdempotencyKey } from './api.js';

export default function App() {
  const [view, setView] = useState('browse');
  const [query, setQuery] = useState('');
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [activeOrder, setActiveOrder] = useState(null);
  const [shippingAddress, setShippingAddress] = useState(null);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [cartRefreshKey, setCartRefreshKey] = useState(0);
  const [ordersRefreshKey, setOrdersRefreshKey] = useState(0);
  const [cartCount, setCartCount] = useState(0);
  const [modal, setModal] = useState(null);
  const [toasts, setToasts] = useState([]);
  const toastIdRef = useRef(0);

  useEffect(() => {
    api.getCart().then((c) => setCartCount(c.items.reduce((n, i) => n + i.quantity, 0)));
  }, [cartRefreshKey]);

  function notify(message) {
    const id = ++toastIdRef.current;
    setToasts((t) => [...t, { id, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }

  function closeModal() {
    const after = modal?.after;
    setModal(null);
    if (after) after();
  }

  function navigate(id) {
    setView(id);
    setSelectedProductId(null);
    if (id === 'orders') setSelectedOrderId(null);
  }

  function handleQueryChange(value) {
    setQuery(value);
    if (view !== 'browse') navigate('browse');
  }

  function openProduct(id) {
    setSelectedProductId(id);
    setView('product');
  }

  async function addToCart(productId, quantity = 1) {
    await api.addToCart(productId, quantity);
    setCartRefreshKey((k) => k + 1);
    notify('Added to cart');
  }

  function goToOrderDetail(id) {
    setSelectedOrderId(id);
    setView('orderDetail');
    setOrdersRefreshKey((k) => k + 1);
  }

  async function checkoutFromCart() {
    const order = await api.checkout(newIdempotencyKey());
    setCartRefreshKey((k) => k + 1);
    if (order.duplicate) {
      setModal({
        tone: 'duplicate',
        title: 'Duplicate order detected',
        description: `An order for this cart has already been created (Order #${order.id}). Check your orders.`,
        after: () => goToOrderDetail(order.id)
      });
      return;
    }
    setActiveOrder(order);
    setShippingAddress(null);
    setView('checkoutShipping');
  }

  function onCancelledDuringCheckout(updated) {
    setModal({
      tone: 'success',
      title: 'Order cancelled',
      description: `Order #${updated.id} has been cancelled. Stock has been restored to inventory.`,
      after: () => { setActiveOrder(null); setView('cart'); }
    });
  }

  function onExpiredDuringCheckout() {
    setModal({
      tone: 'warn',
      title: 'Reservation expired',
      description: 'The 5-minute stock hold passed before checkout was completed. Stock has been released back to inventory.',
      after: () => { setActiveOrder(null); setView('cart'); }
    });
  }

  function onShippingContinue(address, order) {
    setShippingAddress(address);
    setActiveOrder(order);
    setView('checkoutPayment');
  }

  function onPaymentResolved(updated) {
    if (updated.status === 'PAID') {
      setModal({
        tone: 'success',
        title: 'Payment successful',
        description: `Your order has been placed successfully. Order #${updated.id} — Rs. ${Number(updated.total_amount).toFixed(2)}.`,
        actionLabel: 'View order',
        after: () => goToOrderDetail(updated.id)
      });
      return;
    }
    if (updated.status === 'FAILED') {
      setModal({
        tone: 'danger',
        title: 'Payment failed',
        description: 'Your order has not been placed. Stock has been released and no charge was made.',
        actionLabel: 'Try again',
        after: () => goToOrderDetail(updated.id)
      });
      return;
    }
    setModal({
      tone: 'warn',
      title: 'Payment timeout',
      description: 'The payment process took too long and your reservation has been released.',
      actionLabel: 'Back to cart',
      after: () => goToOrderDetail(updated.id)
    });
  }

  function payFromOrderDetail(order) {
    setActiveOrder(order);
    setView('checkoutPayment');
  }

  function startNewOrder() {
    setActiveOrder(null);
    setShippingAddress(null);
    navigate('browse');
  }

  return (
    <div>
      <TopNav
        query={query}
        onQueryChange={handleQueryChange}
        cartCount={cartCount}
        active={view === 'orders' || view === 'orderDetail' ? 'orders' : view === 'admin' ? 'admin' : 'browse'}
        onNavigate={navigate}
      />

      <div className="app-content">
        {view === 'browse' && <Browse query={query} onOpenProduct={openProduct} onAddToCart={addToCart} />}
        {view === 'product' && (
          <ProductDetails productId={selectedProductId} onBack={() => navigate('browse')} onAddToCart={addToCart} />
        )}
        {view === 'cart' && (
          <Cart onContinueShopping={() => navigate('browse')} onCheckout={checkoutFromCart} refreshKey={cartRefreshKey} notify={notify} />
        )}
        {view === 'checkoutShipping' && activeOrder && (
          <CheckoutShipping
            orderId={activeOrder.id}
            savedAddress={shippingAddress}
            onBack={() => { setActiveOrder(null); setCartRefreshKey((k) => k + 1); navigate('cart'); }}
            onCancelled={onCancelledDuringCheckout}
            onExpired={onExpiredDuringCheckout}
            onContinue={onShippingContinue}
          />
        )}
        {view === 'checkoutPayment' && activeOrder && (
          <Payment order={activeOrder} onBack={() => setView('checkoutShipping')} onResolved={onPaymentResolved} />
        )}
        {view === 'orders' && <OrderHistory onSelect={goToOrderDetail} refreshKey={ordersRefreshKey} />}
        {view === 'admin' && <ProductsAdmin notify={notify} />}
        {view === 'orderDetail' && selectedOrderId && (
          <OrderDetail
            orderId={selectedOrderId}
            shippingAddress={shippingAddress}
            onBack={() => navigate('orders')}
            onPay={payFromOrderDetail}
            onStartNewOrder={startNewOrder}
            refreshKey={ordersRefreshKey}
          />
        )}
      </div>

      {modal && <ResultModal {...modal} onClose={closeModal} />}
      <ToastContainer toasts={toasts} />
    </div>
  );
}
