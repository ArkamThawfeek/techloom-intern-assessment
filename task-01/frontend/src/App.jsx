import { useState } from 'react';
import Sidebar from './components/Sidebar.jsx';
import Dashboard from './components/Dashboard.jsx';
import ProductsAdmin from './components/ProductsAdmin.jsx';
import POS from './components/POS.jsx';
import Checkout from './components/Checkout.jsx';
import Payment from './components/Payment.jsx';
import OrdersList from './components/OrdersList.jsx';
import OrderDetail from './components/OrderDetail.jsx';
import ResultModal from './components/ResultModal.jsx';

export default function App() {
  const [tab, setTab] = useState('dashboard');
  const [posStage, setPosStage] = useState('cart'); // cart | checkout | payment
  const [activeOrder, setActiveOrder] = useState(null);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [modal, setModal] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [restoredCart, setRestoredCart] = useState(null);

  function bump() { setRefreshKey((k) => k + 1); }

  function closeModal() {
    const after = modal?.after;
    setModal(null);
    if (after) after();
  }

  function handleNav(id) {
    setTab(id);
    if (id === 'pos') { setPosStage('cart'); setActiveOrder(null); setRestoredCart(null); }
    if (id === 'orders') { setSelectedOrderId(null); }
  }

  function goToOrder(id) {
    setTab('orders');
    setSelectedOrderId(id);
    setPosStage('cart');
    setActiveOrder(null);
    bump();
  }

  function onCheckedOut(order) {
    if (order.duplicate) {
      setModal({
        tone: 'duplicate',
        title: 'Duplicate order detected',
        description: `An order for this cart has already been created (Order #${order.id}). Check your orders.`,
        after: () => goToOrder(order.id)
      });
      return;
    }
    setActiveOrder(order);
    setPosStage('checkout');
  }

  function onCancelledFromCheckout(updated) {
    setModal({
      tone: 'success',
      title: 'Order cancelled',
      description: `Order #${updated.id} has been cancelled. Stock has been restored to inventory.`,
      after: () => { setPosStage('cart'); setActiveOrder(null); bump(); }
    });
  }

  function onExpiredFromCheckout() {
    setModal({
      tone: 'warn',
      title: 'Reservation expired',
      description: 'The 5-minute stock hold passed before payment was completed. Stock has been released back to inventory.',
      after: () => { setPosStage('cart'); setActiveOrder(null); bump(); }
    });
  }

  function onPaymentResolved(updated) {
    if (updated.status === 'PAID') {
      goToOrder(updated.id);
      return;
    }
    if (updated.status === 'FAILED') {
      setModal({
        tone: 'danger',
        title: 'Payment failed',
        description: 'Your payment was not successful. The order has been marked failed and stock has been released back to inventory.',
        after: () => goToOrder(updated.id)
      });
      return;
    }
    setModal({
      tone: 'warn',
      title: 'Payment timeout',
      description: "Payment wasn't completed within the reservation window. The order has expired and stock has been released back to inventory.",
      after: () => goToOrder(updated.id)
    });
  }

  function onOrderCancelledFromDetail(updated) {
    setModal({
      tone: 'success',
      title: 'Order cancelled',
      description: `Order #${updated.id} has been cancelled. Stock has been restored to inventory.`,
      after: () => bump()
    });
  }

  function payFromOrderDetail(order) {
    setTab('pos');
    setActiveOrder(order);
    setPosStage('payment');
  }

  return (
    <div className="app-shell">
      <Sidebar active={tab} onNavigate={handleNav} />
      <main className="main">
        {tab === 'dashboard' && <Dashboard key={refreshKey} />}
        {tab === 'products' && <ProductsAdmin />}

        {tab === 'pos' && posStage === 'cart' && (
          <POS
            onCheckedOut={onCheckedOut}
            initialCart={restoredCart}
            onConsumedInitialCart={() => setRestoredCart(null)}
          />
        )}
        {tab === 'pos' && posStage === 'checkout' && activeOrder && (
          <Checkout
            orderId={activeOrder.id}
            onBack={(items) => { setRestoredCart(items); setPosStage('cart'); setActiveOrder(null); bump(); }}
            onCancelled={onCancelledFromCheckout}
            onExpired={onExpiredFromCheckout}
            onPay={(order) => { setActiveOrder(order); setPosStage('payment'); }}
          />
        )}
        {tab === 'pos' && posStage === 'payment' && activeOrder && (
          <Payment
            order={activeOrder}
            onBack={() => setPosStage('checkout')}
            onResolved={onPaymentResolved}
            onCancelled={onCancelledFromCheckout}
          />
        )}

        {tab === 'orders' && !selectedOrderId && (
          <OrdersList onSelect={setSelectedOrderId} refreshKey={refreshKey} />
        )}
        {tab === 'orders' && selectedOrderId && (
          <OrderDetail
            orderId={selectedOrderId}
            refreshKey={refreshKey}
            onBack={() => setSelectedOrderId(null)}
            onPay={payFromOrderDetail}
            onCancelled={onOrderCancelledFromDetail}
          />
        )}

      </main>

      {modal && (
        <ResultModal tone={modal.tone} title={modal.title} description={modal.description} onClose={closeModal} />
      )}
    </div>
  );
}
