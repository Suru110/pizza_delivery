import React, { useEffect, useState } from 'react';
import { ClipboardList, ShoppingBag, Clock, CheckCircle2, Flame, Bike, Smile, AlertCircle, RefreshCw, Star } from 'lucide-react';

export default function OrderTracker({ token, API_URL, socket, orders, setOrders, addToCart, setCurrentTab }) {
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [loading, setLoading] = useState(orders.length === 0);
  const [error, setError] = useState('');

  // Fetch orders from database
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await fetch(`${API_URL}/orders`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to load orders.');
        const data = await res.json();
        setOrders(data);
        if (data.length > 0 && !selectedOrderId) {
          setSelectedOrderId(data[0]._id);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [API_URL, token]);

  const activeOrder = orders.find(o => o._id === selectedOrderId) || orders[0];

  const getStepStatusClass = (stepName, currentStatus) => {
    const sequence = ['Order Received', 'Sent to kitchen', 'Sent to delivery', 'Delivered'];
    const currentIdx = sequence.indexOf(currentStatus);
    const stepIdx = sequence.indexOf(stepName);

    if (currentIdx === stepIdx) return 'active';
    if (currentIdx > stepIdx) return 'completed';
    return 'upcoming';
  };

  const handleOrderAgain = () => {
    if (!activeOrder || !addToCart || !setCurrentTab) return;
    activeOrder.items.forEach(item => {
      const cartItem = { ...item };
      delete cartItem._id;
      addToCart(cartItem);
    });
    setCurrentTab('menu');
  };

  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [ratingLoading, setRatingLoading] = useState(false);

  const handleSubmitRating = async () => {
    if (rating === 0) return;
    setRatingLoading(true);
    try {
      const res = await fetch(`${API_URL}/orders/${activeOrder._id}/rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ rating, review })
      });
      if (res.ok) {
        const updatedOrder = await res.json();
        setOrders(prev => prev.map(o => o._id === updatedOrder._id ? updatedOrder : o));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRatingLoading(false);
    }
  };

  // Reset rating state when selected order changes
  useEffect(() => {
    if (activeOrder) {
      setRating(activeOrder.rating || 0);
      setReview(activeOrder.review || '');
    }
  }, [selectedOrderId]);

  if (loading) {
    return (
      <div className="flex-center" style={{ height: '300px' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-error">{error}</div>;
  }

  return (
    <div className="tracker-layout fade-in">
      {/* History Column */}
      <div className="history-sidebar glass-card">
        <div className="sidebar-title-row">
          <h3 className="serif-title sidebar-title">
            <ShoppingBag size={20} />
            <span>My Orders</span>
          </h3>
          {orders.length > 0 && (
            <span className="order-count-badge">{orders.length} order{orders.length !== 1 ? 's' : ''}</span>
          )}
        </div>
        
        {orders.length === 0 ? (
          <div className="empty-tracker">
            <ClipboardList size={40} className="text-muted" style={{ marginBottom: '1rem' }} />
            <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>No orders yet!</p>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4, display: 'block', marginBottom: '1rem' }}>
              Place your first order to see it here.
            </span>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setCurrentTab('menu')}
            >
              Browse Menu
            </button>
          </div>
        ) : (
          <div className="order-list">
            {orders.map((o) => {
              const statusColors = {
                'Order Received': { bg: 'rgba(234,179,8,0.12)', color: '#eab308', border: 'rgba(234,179,8,0.3)' },
                'Sent to kitchen': { bg: 'rgba(249,115,22,0.12)', color: '#f97316', border: 'rgba(249,115,22,0.3)' },
                'Sent to delivery': { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6', border: 'rgba(59,130,246,0.3)' },
                'Delivered': { bg: 'rgba(34,197,94,0.12)', color: '#22c55e', border: 'rgba(34,197,94,0.3)' },
              };
              const sc = statusColors[o.orderStatus] || statusColors['Order Received'];
              const orderDate = new Date(o.createdAt);
              const isToday = new Date().toDateString() === orderDate.toDateString();
              const dateStr = isToday
                ? `Today, ${orderDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : orderDate.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

              return (
                <div
                  key={o._id}
                  className={`order-list-item ${selectedOrderId === o._id ? 'selected' : ''}`}
                  onClick={() => setSelectedOrderId(o._id)}
                >
                  <div className="item-header flex-between">
                    <span className="order-id-tag">#{o._id.toString().slice(-6).toUpperCase()}</span>
                    <span className="order-date">{dateStr}</span>
                  </div>
                  <div className="item-body flex-between" style={{ marginTop: '0.5rem' }}>
                    <span className="item-amount">${o.totalAmount.toFixed(2)}</span>
                    <span
                      className="order-status-pill"
                      style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}
                    >
                      {o.orderStatus}
                    </span>
                  </div>
                  <div className="item-footer" style={{ marginTop: '0.4rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {o.items.length} item{o.items.length !== 1 ? 's' : ''} · {o.paymentStatus === 'paid' ? '✅ Paid' : '⏳ Pending'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>


      {/* Live Track Detail Column */}
      <div className="tracker-main">
        {activeOrder ? (
          <div className="tracker-main-container fade-in">
            {/* Live Progress Card */}
            <div className="glass-card progress-card">
              <div className="progress-header flex-between">
                <div>
                  <span className="order-sub">TRACKING ORDER</span>
                  <h3 className="serif-title">Order #{activeOrder._id.toUpperCase()}</h3>
                </div>
                <div className="flex-center gap-2">
                  <button className="btn btn-secondary btn-sm flex-center gap-2" onClick={handleOrderAgain}>
                    <RefreshCw size={14} /> Order Again
                  </button>
                  <div className="flex-center gap-2 ml-2">
                    <Clock size={16} className="text-muted" />
                    <span className="order-time-text">{new Date(activeOrder.createdAt).toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>

              {/* Visual Preparation Stepper */}
              <div className="tracker-stepper">
                {/* Step 1: Received */}
                <div className={`track-step ${getStepStatusClass('Order Received', activeOrder.orderStatus)}`}>
                  <div className="step-circle">
                    <CheckCircle2 size={20} />
                  </div>
                  <div className="step-content">
                    <span className="step-title">Order Received</span>
                    <span className="step-desc">Confirming payment and sending to oven.</span>
                  </div>
                </div>
                
                {/* Step 2: Kitchen */}
                <div className={`track-step ${getStepStatusClass('Sent to kitchen', activeOrder.orderStatus)}`}>
                  <div className="step-circle">
                    <Flame size={20} className={activeOrder.orderStatus === 'Sent to kitchen' ? 'animate-pulse' : ''} />
                  </div>
                  <div className="step-content">
                    <span className="step-title">Sent to Kitchen</span>
                    <span className="step-desc">Chefs are baking your gourmet custom pizza.</span>
                  </div>
                </div>

                {/* Step 3: Delivery */}
                <div className={`track-step ${getStepStatusClass('Sent to delivery', activeOrder.orderStatus)}`}>
                  <div className="step-circle">
                    <Bike size={20} className={activeOrder.orderStatus === 'Sent to delivery' ? 'animate-bounce' : ''} />
                  </div>
                  <div className="step-content">
                    <span className="step-title">Sent to Delivery</span>
                    <span className="step-desc">Rider has left with your fresh, hot pizza.</span>
                  </div>
                </div>

                {/* Step 4: Delivered */}
                <div className={`track-step ${getStepStatusClass('Delivered', activeOrder.orderStatus)}`}>
                  <div className="step-circle">
                    <Smile size={20} />
                  </div>
                  <div className="step-content">
                    <span className="step-title">Delivered</span>
                    <span className="step-desc">Enjoy your delicious pizza meal!</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Rating Section for Delivered Orders */}
            {activeOrder.orderStatus === 'Delivered' && (
              <div className="glass-card rating-card" style={{ padding: '1.75rem', marginBottom: '2rem' }}>
                <h4 className="serif-title" style={{ marginBottom: '1rem' }}>Rate your experience</h4>
                <div className="flex-center" style={{ gap: '0.5rem', marginBottom: '1rem' }}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <Star 
                      key={star} 
                      size={28} 
                      onClick={() => !activeOrder.rating && setRating(star)}
                      fill={star <= rating ? 'var(--secondary)' : 'none'}
                      color={star <= rating ? 'var(--secondary)' : 'var(--text-muted)'}
                      style={{ cursor: activeOrder.rating ? 'default' : 'pointer' }}
                    />
                  ))}
                </div>
                {!activeOrder.rating && (
                  <div className="review-input-container">
                    <textarea 
                      className="form-control" 
                      placeholder="Leave a review (optional)..."
                      rows="3"
                      value={review}
                      onChange={(e) => setReview(e.target.value)}
                      style={{ marginBottom: '1rem', resize: 'vertical' }}
                    ></textarea>
                    <button 
                      className="btn btn-primary w-full"
                      onClick={handleSubmitRating}
                      disabled={rating === 0 || ratingLoading}
                    >
                      {ratingLoading ? 'Submitting...' : 'Submit Rating'}
                    </button>
                  </div>
                )}
                {activeOrder.rating && activeOrder.review && (
                  <div className="submitted-review" style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginTop: '1rem' }}>
                    <p style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>"{activeOrder.review}"</p>
                  </div>
                )}
              </div>
            )}

            {/* Order Items Summary Card */}
            <div className="glass-card items-summary-card">
              <h4 className="serif-title summary-title">Order Details</h4>
              <div className="summary-items-list">
                {activeOrder.items.map((item, idx) => (
                  <div className="summary-item" key={idx}>
                    <div className="summary-item-left">
                      <span className="item-qty">{item.quantity}x</span>
                      <div>
                        <span className="item-name">{item.name}</span>
                        <div className="item-customizations-list">
                          <span>Base: {item.base}</span>
                          <span>Sauce: {item.sauce}</span>
                          <span>Cheese: {item.cheese}</span>
                          {item.veggies.length > 0 && <span>Veggies: {item.veggies.join(', ')}</span>}
                          {item.meats.length > 0 && <span>Meats: {item.meats.join(', ')}</span>}
                        </div>
                      </div>
                    </div>
                    <span className="item-price">${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="summary-footer">
                <div className="summary-row">
                  <span>Payment status:</span>
                  <span className={`badge ${activeOrder.paymentStatus === 'paid' ? 'badge-paid' : 'badge-pending'}`}>
                    {activeOrder.paymentStatus}
                  </span>
                </div>
                <div className="summary-row text-lg font-bold">
                  <span>Grand Total:</span>
                  <span className="text-primary">${activeOrder.totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="no-active-state glass-card flex-center">
            <div style={{ textAlign: 'center' }}>
              <AlertCircle size={40} className="text-muted" style={{ marginBottom: '1rem' }} />
              <p>Select an order from the list to track its live status.</p>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .tracker-layout {
          display: grid;
          grid-template-columns: 320px 1fr;
          gap: 2rem;
          align-items: start;
        }

        .history-sidebar {
          max-height: calc(100vh - 120px);
          display: flex;
          flex-direction: column;
          padding: 1.5rem;
        }

        .sidebar-title-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1.25rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid var(--border-light);
        }

        .sidebar-title {
          font-size: 1.15rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin: 0;
        }

        .order-count-badge {
          background: rgba(0, 122, 255, 0.12);
          color: var(--primary);
          border: 1px solid rgba(0, 122, 255, 0.25);
          font-size: 0.7rem;
          font-weight: 700;
          padding: 0.2rem 0.6rem;
          border-radius: 50px;
          letter-spacing: 0.03em;
        }

        .order-status-pill {
          font-size: 0.7rem;
          font-weight: 700;
          padding: 0.2rem 0.55rem;
          border-radius: 50px;
          white-space: nowrap;
          letter-spacing: 0.02em;
        }

        .empty-tracker {
          text-align: center;
          padding: 2.5rem 1rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          flex: 1;
        }

        .order-list {
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          padding-right: 0.25rem;
        }

        .order-list-item {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-light);
          border-radius: var(--radius-sm);
          padding: 1rem;
          cursor: pointer;
          transition: var(--transition-fast);
        }

        .order-list-item:hover {
          background: rgba(255, 255, 255, 0.04);
          border-color: rgba(255, 255, 255, 0.15);
        }

        .order-list-item.selected {
          border-color: var(--primary);
          background: hsla(var(--primary-hue), 100%, 55%, 0.04);
        }

        .order-id-tag {
          font-weight: 700;
          font-size: 0.9rem;
          color: var(--text-primary);
        }

        .order-date {
          font-size: 0.8rem;
          color: var(--text-muted);
        }

        .item-body {
          margin: 0.5rem 0;
        }

        .item-amount {
          font-weight: 700;
          color: var(--secondary);
          font-size: 0.95rem;
        }

        .item-footer {
          font-size: 0.8rem;
          color: var(--text-secondary);
        }

        .tracker-main-container {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .progress-card {
          padding: 2rem;
        }

        .progress-header {
          border-bottom: 1px solid var(--border-light);
          padding-bottom: 1.25rem;
          margin-bottom: 2rem;
        }

        .order-sub {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--primary);
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .order-time-text {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-secondary);
        }

        /* Preparation Stepper */
        .tracker-stepper {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          position: relative;
        }

        .tracker-stepper::before {
          content: '';
          position: absolute;
          left: 17px;
          top: 15px;
          bottom: 15px;
          width: 2px;
          background: var(--border-light);
          z-index: 1;
        }

        .track-step {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          position: relative;
          z-index: 2;
        }

        .step-circle {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: var(--bg-dark);
          border: 2px solid var(--border-light);
          color: var(--text-muted);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: var(--transition);
        }

        .step-content {
          display: flex;
          flex-direction: column;
          line-height: 1.3;
        }

        .step-title {
          font-weight: 600;
          font-size: 1rem;
          color: var(--text-muted);
          transition: var(--transition);
        }

        .step-desc {
          font-size: 0.8rem;
          color: var(--text-muted);
        }

        /* Stepper states */
        .track-step.completed .step-circle {
          background: var(--success);
          border-color: var(--success);
          color: white;
        }

        .track-step.completed .step-title {
          color: var(--success);
        }

        .track-step.active .step-circle {
          background: var(--primary);
          border-color: var(--primary);
          color: white;
          box-shadow: var(--shadow-glow);
        }

        .track-step.active .step-title {
          color: var(--primary);
          font-weight: 700;
          font-size: 1.05rem;
        }

        .track-step.active .step-desc {
          color: var(--text-primary);
        }

        /* Summary Card */
        .items-summary-card {
          padding: 1.75rem;
        }

        .summary-items-list {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          margin-bottom: 1.5rem;
        }

        .summary-item {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
          padding-bottom: 1rem;
        }

        .summary-item-left {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
        }

        .item-qty {
          background: var(--bg-input);
          border: 1px solid var(--border-light);
          padding: 0.1rem 0.4rem;
          border-radius: 4px;
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--secondary);
        }

        .item-name {
          font-weight: 600;
          font-size: 1rem;
        }

        .item-customizations-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 0.25rem;
        }

        .item-customizations-list span {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-light);
          border-radius: 4px;
          font-size: 0.75rem;
          padding: 0.1rem 0.4rem;
          color: var(--text-secondary);
        }

        .item-price {
          font-weight: 700;
          color: var(--secondary);
          font-size: 0.95rem;
        }

        .summary-footer {
          border-top: 1px solid var(--border-light);
          padding-top: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .summary-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.95rem;
        }

        .no-active-state {
          min-height: 300px;
        }

        .gap-2 {
          gap: 0.5rem;
        }

        @media (max-width: 768px) {
          .tracker-layout {
            grid-template-columns: 1fr;
          }
          
          .history-sidebar {
            max-height: none;
          }
        }
      `}</style>
    </div>
  );
}
