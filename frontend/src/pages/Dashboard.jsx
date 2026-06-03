import React, { useState, useEffect } from 'react';
import { ShoppingCart, Compass, Plus, Minus, Trash2, Award, Zap, Search, Filter, MapPin, Tag, User, X, ClipboardList, History } from 'lucide-react';

export default function Dashboard({ token, API_URL, setCurrentTab, addToCart, cart, removeFromCart, updateCartQty, triggerCheckout }) {
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  
  const [profile, setProfile] = useState(null);
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [selectedAddress, setSelectedAddress] = useState('Pickup');
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState('');
  const [discount, setDiscount] = useState(0);
  const [useWallet, setUseWallet] = useState(false);
  const [selectedPizza, setSelectedPizza] = useState(null);
  
  // Address management
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newAddressLabel, setNewAddressLabel] = useState('Home');
  const [newAddressText, setNewAddressText] = useState('');

  useEffect(() => {
    const fetchMenuAndProfile = async () => {
      try {
        const resMenu = await fetch(`${API_URL}/menu`, { headers: { Authorization: `Bearer ${token}` } });
        if (!resMenu.ok) throw new Error('Failed to load menu');
        const dataMenu = await resMenu.json();
        setMenu(dataMenu);

        const resProfile = await fetch(`${API_URL}/user/profile`, { headers: { Authorization: `Bearer ${token}` } });
        if (resProfile.ok) {
          const dataProfile = await resProfile.json();
          setTotalOrders(dataProfile.totalOrders);
          setAvailableCoupons(dataProfile.availableCoupons || []);
          setProfile(dataProfile.user);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMenuAndProfile();
  }, [API_URL, token]);

  const handleAddPresetToCart = (pizza) => {
    addToCart({
      id: pizza._id,
      name: pizza.name,
      price: pizza.price,
      isCustom: false,
      base: 'Thin Crust', // default representation
      sauce: 'Classic Marinara',
      cheese: 'Mozzarella',
      veggies: [],
      meats: [],
      quantity: 1
    });
  };

  const baseTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const getWalletDiscountPercent = (points) => {
    const redeemablePoints = Math.floor(points / 50) * 50;
    return Math.min(100, Math.floor((redeemablePoints / 50) * 2.5));
  };
  
  const handleValidateCoupon = async () => {
    setCouponError('');
    try {
      const res = await fetch(`${API_URL}/coupons/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code: couponCode, cartTotal: baseTotal })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      
      let disc = 0;
      if (data.discountType === 'percent') {
        disc = baseTotal * (data.discountValue / 100);
      } else {
        disc = data.discountValue;
      }
      setDiscount(disc);
      setCouponError('Coupon applied!');
    } catch (err) {
      setCouponError(err.message);
      setDiscount(0);
    }
  };

  const payableBeforeWallet = Math.max(0, baseTotal - discount);
  const walletPointsToUse = useWallet && profile ? Math.min(Math.floor(profile.rewardPoints / 50) * 50, 2000) : 0;
  const walletDiscountPercent = walletPointsToUse > 0 ? getWalletDiscountPercent(walletPointsToUse) : 0;
  const walletDiscount = payableBeforeWallet * (walletDiscountPercent / 100);
  const finalTotal = Math.max(0, payableBeforeWallet - walletDiscount);

  const handleCheckout = () => {
    triggerCheckout({
      deliveryAddress: selectedAddress,
      discountApplied: discount,
      pointsUsed: walletPointsToUse,
      walletDiscount,
      finalTotal
    });
  };

  const handleAddAddress = async (e) => {
    e.preventDefault();
    if (!newAddressText.trim()) return;
    
    try {
      const res = await fetch(`${API_URL}/user/addresses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ label: newAddressLabel, address: newAddressText })
      });
      if (res.ok) {
        const updatedAddresses = await res.json();
        setProfile({ ...profile, addresses: updatedAddresses });
        setNewAddressText('');
        setNewAddressLabel('Home');
        setShowAddressForm(false);
        setSelectedAddress(updatedAddresses[updatedAddresses.length - 1].address);
      }
    } catch (err) {
      console.error('Error adding address:', err);
    }
  };

  const filteredMenu = menu.filter(pizza => {
    if (searchTerm && !pizza.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filterType === 'Veg') {
      return !pizza.description.toLowerCase().match(/(chicken|bacon|pepperoni|sausage|meat)/);
    }
    if (filterType === 'Non-Veg') {
      return pizza.description.toLowerCase().match(/(chicken|bacon|pepperoni|sausage|meat)/);
    }
    return true;
  });

  return (
    <div className="dashboard-layout fade-in">
      {/* Main Column */}
      <div className="menu-section">
        {/* Special Custom Pizza Banner */}
        <div className="custom-banner">
          <div className="banner-content">
            <div className="badge badge-paid banner-badge">
              <Zap size={12} style={{ marginRight: '4px' }} />
              Chef's Special
            </div>
            <h2>Design Your Own Masterpiece</h2>
            <p>Choose from 5 premium bases, 5 artisanal sauces, rich cheeses, and fresh toppings to bake the pizza of your dreams.</p>
            <button className="btn btn-primary" onClick={() => setCurrentTab('custom')}>
              <Plus size={18} />
              <span>Create Custom Pizza</span>
            </button>
          </div>
          <div className="banner-visual">
            <div className="pizza-slice-glow">🍕</div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="filters-bar flex-between" style={{ gap: '1rem', flexWrap: 'wrap' }}>
          <div className="search-box" style={{ flex: '1', minWidth: '200px', position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              className="form-control" 
              placeholder="Search pizzas..." 
              style={{ paddingLeft: '2.5rem' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="filter-chips flex-between" style={{ gap: '0.5rem' }}>
            <Filter size={18} className="text-muted" />
            {['All', 'Veg', 'Non-Veg'].map(type => (
              <button 
                key={type}
                className={`badge ${filterType === type ? 'badge-delivery' : 'badge-pending'}`}
                style={{ cursor: 'pointer', border: 'none' }}
                onClick={() => setFilterType(type)}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Menu Items */}
        <h3 className="section-title serif-title">Preset Chef Creations</h3>
        {loading ? (
          <div className="flex-center" style={{ height: '200px' }}>
            <div className="spinner" />
          </div>
        ) : error ? (
          <div className="alert alert-error">{error}</div>
        ) : (
          <div className="menu-grid">
            {filteredMenu.map((pizza) => (
              <div 
                className="pizza-card glass-card" 
                key={pizza._id}
                onClick={() => setSelectedPizza(pizza)}
                style={{ cursor: 'pointer' }}
              >
                <div className="pizza-card-image">
                  <img 
                    src={pizza.image || '/pizza-placeholder.png'} 
                    alt={pizza.name}
                    className="pizza-image"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextElementSibling.style.display = 'flex';
                    }}
                  />
                  <div className="pizza-image-placeholder">🍕</div>
                  <span className="pizza-price">${pizza.price.toFixed(2)}</span>
                </div>
                <div className="pizza-card-body">
                  <h4>{pizza.name}</h4>
                  <p style={{ marginBottom: '1rem' }}>Click to see details</p>
                </div>
              </div>
            ))}
            {filteredMenu.length === 0 && <p className="text-muted">No pizzas found matching your filters.</p>}
          </div>
        )}
      </div>

      {/* Pizza Details Modal */}
      {selectedPizza && (
        <div className="pizza-modal-overlay" onClick={() => setSelectedPizza(null)}>
          <div className="pizza-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="pizza-modal-close" onClick={() => setSelectedPizza(null)}>✕</button>
            
            <div className="pizza-modal-grid">
              {/* Pizza Image */}
              <div className="pizza-modal-image">
                <img 
                  src={selectedPizza.image || '/pizza-placeholder.png'} 
                  alt={selectedPizza.name}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextElementSibling.style.display = 'flex';
                  }}
                />
                <div className="pizza-modal-placeholder">🍕</div>
              </div>

              {/* Pizza Details */}
              <div className="pizza-modal-details">
                <h2 className="pizza-modal-title">{selectedPizza.name}</h2>
                <p className="pizza-modal-description">{selectedPizza.description}</p>

                <div className="pizza-modal-price">
                  <span className="price-label">Price</span>
                  <span className="price-value">${selectedPizza.price.toFixed(2)}</span>
                </div>

                {/* Crust Options */}
                {selectedPizza.bases && selectedPizza.bases.length > 0 && (
                  <div className="modal-section">
                    <h4 className="modal-section-title">🥖 Available Crusts</h4>
                    <div className="options-list">
                      {selectedPizza.bases.map((base, idx) => (
                        <span key={idx} className="option-badge">{base}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sauce Options */}
                {selectedPizza.sauces && selectedPizza.sauces.length > 0 && (
                  <div className="modal-section">
                    <h4 className="modal-section-title">🍅 Available Sauces</h4>
                    <div className="options-list">
                      {selectedPizza.sauces.map((sauce, idx) => (
                        <span key={idx} className="option-badge">{sauce}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cheese Options */}
                {selectedPizza.cheeses && selectedPizza.cheeses.length > 0 && (
                  <div className="modal-section">
                    <h4 className="modal-section-title">🧀 Available Cheeses</h4>
                    <div className="options-list">
                      {selectedPizza.cheeses.map((cheese, idx) => (
                        <span key={idx} className="option-badge">{cheese}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Veggie Toppings */}
                {selectedPizza.veggies && selectedPizza.veggies.length > 0 && (
                  <div className="modal-section">
                    <h4 className="modal-section-title">🥦 Veggie Toppings</h4>
                    <div className="options-list">
                      {selectedPizza.veggies.map((veggie, idx) => (
                        <span key={idx} className="option-badge veggie">{veggie}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Meat Toppings */}
                {selectedPizza.meats && selectedPizza.meats.length > 0 && (
                  <div className="modal-section">
                    <h4 className="modal-section-title">🍖 Meat Toppings</h4>
                    <div className="options-list">
                      {selectedPizza.meats.map((meat, idx) => (
                        <span key={idx} className="option-badge meat">{meat}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add to Cart Button */}
                <button 
                  className="btn btn-primary modal-add-btn"
                  onClick={() => {
                    handleAddPresetToCart(selectedPizza);
                    setSelectedPizza(null);
                  }}
                >
                  <ShoppingCart size={18} />
                  <span>Add to Order</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cart Sidebar */}
      <div className="cart-sidebar glass-card">
        <h3 className="cart-title serif-title">
          <ShoppingCart size={20} />
          <span>My Order</span>
          {cart.length > 0 && <span className="cart-count-badge">{cart.reduce((s, i) => s + i.quantity, 0)}</span>}
        </h3>

        {cart.length === 0 ? (
          <div className="empty-cart-state">
            <Compass size={40} className="empty-cart-icon" />
            <p>Your order is empty</p>
            <span className="empty-cart-sub">Add a preset pizza or craft a custom one to get started!</span>
            <button
              className="btn btn-secondary btn-sm"
              style={{ marginTop: '0.75rem', fontSize: '0.8rem' }}
              onClick={() => setCurrentTab('orders')}
            >
              <ClipboardList size={14} style={{ marginRight: '6px' }} />
              View Order History
            </button>
          </div>
        ) : (
          <div className="cart-container">
            <div className="cart-items-list">
              {cart.map((item, idx) => (
                <div className="cart-item" key={idx}>
                  <div className="cart-item-details">
                    <span className="cart-item-name">{item.name}</span>
                    {item.isCustom ? (
                      <span className="cart-item-customizations">
                        {item.base}, {item.sauce}, {item.cheese}
                        {item.veggies.length > 0 && `, [Veggies: ${item.veggies.join(', ')}]`}
                        {item.meats.length > 0 && `, [Meats: ${item.meats.join(', ')}]`}
                      </span>
                    ) : (
                      <span className="cart-item-customizations">Preset Recipe</span>
                    )}
                    <span className="cart-item-price">${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                  <div className="cart-item-actions">
                    <div className="qty-controls">
                      <button 
                        className="qty-btn" 
                        onClick={() => updateCartQty(idx, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                      >
                        <Minus size={12} />
                      </button>
                      <span className="qty-val">{item.quantity}</span>
                      <button 
                        className="qty-btn" 
                        onClick={() => updateCartQty(idx, item.quantity + 1)}
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                    <button className="delete-item-btn" onClick={() => removeFromCart(idx)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="cart-footer">
              
              {/* Delivery Address */}
              {profile && (
                <div className="delivery-section mb-2">
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)' }}><MapPin size={12} className="inline-icon" style={{ marginRight: '4px' }} /> Delivery To</label>
                    <select className="form-control" style={{ padding: '0.5rem', fontSize: '0.85rem', marginBottom: '0.5rem' }} value={selectedAddress} onChange={(e) => setSelectedAddress(e.target.value)}>
                      <option value="Pickup">🏪 Store Pickup</option>
                      {profile.addresses?.map((a, i) => (
                        <option key={i} value={a.address}>{a.label} - {a.address.substring(0, 25)}</option>
                      ))}
                    </select>
                  </div>

                  {showAddressForm && (
                    <form onSubmit={handleAddAddress} className="add-address-form-inline" style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                      <div style={{ marginBottom: '0.75rem' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: '600', display: 'block', marginBottom: '0.25rem' }}>Label</label>
                        <select className="form-control" value={newAddressLabel} onChange={(e) => setNewAddressLabel(e.target.value)} style={{ padding: '0.4rem', fontSize: '0.85rem' }}>
                          <option value="Home">Home</option>
                          <option value="Office">Office</option>
                          <option value="Hostel">Hostel</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div style={{ marginBottom: '0.75rem' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: '600', display: 'block', marginBottom: '0.25rem' }}>Address</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          placeholder="Enter full address" 
                          value={newAddressText}
                          onChange={(e) => setNewAddressText(e.target.value)}
                          style={{ padding: '0.4rem', fontSize: '0.85rem' }}
                          required
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button type="submit" className="btn btn-primary btn-sm" style={{ flex: 1 }}>Save Address</button>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowAddressForm(false)} style={{ flex: 1 }}>Cancel</button>
                      </div>
                    </form>
                  )}

                  {!showAddressForm && (
                    <button 
                      type="button"
                      className="btn btn-secondary btn-sm w-full"
                      onClick={() => setShowAddressForm(true)}
                      style={{ marginBottom: '1rem', fontSize: '0.8rem', padding: '0.4rem' }}
                    >
                      <Plus size={12} style={{ marginRight: '4px' }} /> Add New Address
                    </button>
                  )}
                </div>
              )}

              {/* Coupons */}
              <div className="coupon-section flex-between mb-2" style={{ gap: '0.5rem' }}>
                <input 
                  type="text" 
                  className="form-control" 
                  style={{ padding: '0.4rem', fontSize: '0.85rem' }} 
                  placeholder="Promo Code" 
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                />
                <button className="btn btn-secondary btn-sm" onClick={handleValidateCoupon}>Apply</button>
              </div>
              {couponError && <p style={{ fontSize: '0.75rem', color: couponError.includes('applied') ? 'var(--success)' : 'var(--danger)', marginBottom: '0.5rem' }}>{couponError}</p>}
              
              {/* Wallet */}
              {profile && (
                <div className="wallet-section flex-between mb-2" style={{ fontSize: '0.85rem' }}>
                  <span>
                    <Award size={14} className="inline-icon text-info" /> Use Wallet Points ({profile.rewardPoints} pts
                    {profile.rewardPoints >= 50 ? ` = ${getWalletDiscountPercent(profile.rewardPoints)}% off` : ', need 50 pts'})
                  </span>
                  <input
                    type="checkbox"
                    checked={profile.rewardPoints >= 50 && useWallet}
                    disabled={profile.rewardPoints < 50}
                    onChange={(e) => setUseWallet(e.target.checked)}
                  />
                </div>
              )}

              <hr className="divider" />

              <div className="cart-summary-row">
                <span>Subtotal</span>
                <span>${baseTotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="cart-summary-row text-success">
                  <span>Discount</span>
                  <span>-${discount.toFixed(2)}</span>
                </div>
              )}
              {walletPointsToUse > 0 && (
                <div className="cart-summary-row text-info">
                  <span>Wallet Discount ({walletPointsToUse} pts, {walletDiscountPercent}%)</span>
                  <span>-${walletDiscount.toFixed(2)}</span>
                </div>
              )}
              <div className="cart-summary-row text-muted text-sm">
                <span>Delivery Fee</span>
                <span className="success-text">FREE</span>
              </div>
              <hr className="divider" />
              <div className="cart-summary-row total-row">
                <span>Total Amount</span>
                <span>${finalTotal.toFixed(2)}</span>
              </div>
              
              <button className="btn btn-primary w-full checkout-btn" onClick={handleCheckout}>
                Place Order & Pay
              </button>
              <button 
                className="btn btn-secondary w-full" 
                style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}
                onClick={() => setCurrentTab('orders')}
              >
                <ClipboardList size={14} style={{ marginRight: '6px' }} />
                View Order History
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .dashboard-layout {
          display: grid;
          grid-template-columns: 1fr 360px;
          gap: 2rem;
          align-items: start;
        }

        .menu-section {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .custom-banner {
          background: linear-gradient(135deg, hsl(210, 24%, 12%), hsl(210, 20%, 8%));
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-left: 4px solid var(--primary);
          border-radius: var(--radius-md);
          padding: 2.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          overflow: hidden;
          position: relative;
          box-shadow: var(--shadow-md);
        }

        .banner-content {
          max-width: 65%;
          z-index: 2;
        }

        .banner-badge {
          margin-bottom: 1rem;
        }

        .custom-banner h2 {
          font-size: 2.2rem;
          margin-bottom: 0.75rem;
          background: linear-gradient(135deg, #fff 40%, var(--secondary) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .custom-banner p {
          color: var(--text-secondary);
          font-size: 1rem;
          margin-bottom: 1.5rem;
          line-height: 1.5;
        }

        .banner-visual {
          position: absolute;
          right: 2rem;
          bottom: -1rem;
          font-size: 9rem;
          opacity: 0.15;
          transform: rotate(20deg);
          user-select: none;
          pointer-events: none;
          z-index: 1;
        }

        .section-title {
          font-size: 1.5rem;
          margin-bottom: 0.5rem;
          position: relative;
          padding-left: 0.75rem;
        }

        .section-title::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0.25rem;
          bottom: 0.25rem;
          width: 3px;
          background: var(--secondary);
          border-radius: 2px;
        }

        .menu-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 1.5rem;
        }

        .pizza-card {
          padding: 0;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .pizza-card-image {
          height: 160px;
          position: relative;
          overflow: hidden;
          background: #f0f0f0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .pizza-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
        }

        .pizza-image-placeholder {
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #ff6b35, #ffa500);
          display: none;
          align-items: center;
          justify-content: center;
          font-size: 4rem;
          position: absolute;
          top: 0;
          left: 0;
        }

        .pizza-price {
          position: absolute;
          right: 1rem;
          top: 1rem;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
          color: var(--secondary);
          padding: 0.35rem 0.75rem;
          font-weight: 700;
          font-size: 0.9rem;
          border-radius: 50px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .pizza-card-body {
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          flex: 1;
        }

        .pizza-card-body h4 {
          font-size: 1.15rem;
          margin-bottom: 0.5rem;
          color: var(--text-primary);
        }

        .pizza-card-body p {
          font-size: 0.85rem;
          color: var(--text-secondary);
          margin-bottom: 1.25rem;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
          height: 3.8em;
        }

        /* Cart Sidebar Styles */
        .cart-sidebar {
          position: sticky;
          top: 85px;
          padding: 1.5rem;
          max-height: calc(100vh - 120px);
          display: flex;
          flex-direction: column;
          overflow-y: auto;
        }

        .cart-title {
          font-size: 1.25rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid var(--border-light);
        }

        .cart-count-badge {
          background: var(--primary);
          color: white;
          font-size: 0.75rem;
          font-weight: 700;
          padding: 0.1rem 0.4rem;
          border-radius: 10px;
          margin-left: auto;
        }

        .empty-cart-state {
          text-align: center;
          padding: 3rem 1rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        .empty-cart-icon {
          color: var(--text-muted);
          animation: spin 60s linear infinite;
        }

        .empty-cart-state p {
          font-weight: 600;
          color: var(--text-secondary);
        }

        .empty-cart-sub {
          font-size: 0.8rem;
          color: var(--text-muted);
          line-height: 1.4;
        }

        .cart-container {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-height: 0;
        }

        .cart-items-list {
          flex: 0 1 auto;
          overflow-y: auto;
          padding-right: 0.25rem;
          margin-bottom: 1.5rem;
          max-height: 240px;
        }

        .cart-item {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 0.75rem;
          padding: 1rem 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
        }

        .cart-item-details {
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
          flex: 1;
          min-width: 0;
        }

        .cart-item-name {
          font-size: 1rem;
          font-weight: 700;
          color: var(--text-primary);
          line-height: 1.25;
          overflow-wrap: anywhere;
        }

        .cart-item-customizations {
          font-size: 0.78rem;
          color: var(--text-secondary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .cart-item-price {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--secondary);
        }

        .cart-item-actions {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.5rem;
          flex-shrink: 0;
        }

        .qty-controls {
          display: flex;
          align-items: center;
          background: var(--bg-input);
          border: 1px solid var(--border-light);
          border-radius: 4px;
          padding: 0.15rem;
        }

        .qty-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: var(--transition-fast);
        }

        .qty-btn:hover:not(:disabled) {
          color: var(--primary);
        }

        .qty-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .qty-val {
          font-size: 0.8rem;
          font-weight: 600;
          width: 20px;
          text-align: center;
        }

        .delete-item-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          transition: var(--transition-fast);
        }

        .delete-item-btn:hover {
          color: var(--danger);
        }

        .cart-footer {
          border-top: 1px solid var(--border-light);
          padding-top: 1rem;
          flex-shrink: 0;
        }

        .wallet-section {
          color: var(--text-secondary);
          gap: 0.75rem;
        }

        .wallet-section span {
          line-height: 1.35;
        }

        .wallet-section input:disabled {
          cursor: not-allowed;
          opacity: 0.45;
        }

        .cart-summary-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.9rem;
          margin-bottom: 0.5rem;
        }

        .divider {
          border: 0;
          height: 1px;
          background: var(--border-light);
          margin: 0.75rem 0;
        }

        .total-row {
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 1.25rem;
        }

        .success-text {
          color: var(--success);
          font-weight: 600;
        }

        .total-val {
          font-weight: 600;
        }

        .checkout-btn {
          box-shadow: var(--shadow-glow);
        }

        .delivery-section {
          border: 1px solid var(--border-light);
          border-radius: var(--radius-sm);
          padding: 1rem;
          background: rgba(0,0,0,0.02);
        }

        .w-full {
          width: 100%;
        }

        .add-address-form-inline {
          animation: slideDown 0.2s ease-out;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 992px) {
          .dashboard-layout {
            grid-template-columns: 1fr;
          }
          
          .cart-sidebar {
            position: static;
            max-height: none;
          }
          
          .custom-banner {
            flex-direction: column;
            text-align: center;
            padding: 2rem;
          }
          
          .banner-content {
            max-width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          
          .banner-visual {
            display: none;
          }
        }

        /* Pizza Modal Styles */
        .pizza-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }

        .pizza-modal-content {
          background: var(--bg-primary);
          border: 1px solid var(--border-light);
          border-radius: var(--radius-md);
          max-width: 900px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
          position: relative;
        }

        .pizza-modal-close {
          position: absolute;
          top: 1.5rem;
          right: 1.5rem;
          background: rgba(255, 0, 127, 0.2);
          border: 1px solid rgba(255, 0, 127, 0.5);
          color: var(--secondary);
          width: 40px;
          height: 40px;
          border-radius: 50%;
          font-size: 1.5rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: var(--transition-fast);
          z-index: 10;
        }

        .pizza-modal-close:hover {
          background: rgba(255, 0, 127, 0.4);
          transform: scale(1.1);
        }

        .pizza-modal-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
          padding: 2rem;
        }

        .pizza-modal-image {
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-md);
          overflow: hidden;
          background: linear-gradient(135deg, rgba(0, 122, 255, 0.1), rgba(255, 0, 127, 0.05));
          border: 1px solid rgba(0, 122, 255, 0.2);
          height: 100%;
          min-height: 350px;
        }

        .pizza-modal-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .pizza-modal-placeholder {
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #ff6b35, #ffa500);
          display: none;
          align-items: center;
          justify-content: center;
          font-size: 7rem;
          position: absolute;
          top: 0;
          left: 0;
        }

        .pizza-modal-details {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          justify-content: flex-start;
        }

        .pizza-modal-title {
          font-size: 2rem;
          font-weight: 800;
          background: linear-gradient(135deg, #fff 40%, var(--secondary) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin: 0;
        }

        .pizza-modal-description {
          font-size: 1rem;
          color: var(--text-secondary);
          line-height: 1.6;
        }

        .pizza-modal-price {
          display: flex;
          align-items: center;
          gap: 1rem;
          background: rgba(0, 122, 255, 0.1);
          border: 1px solid rgba(0, 122, 255, 0.3);
          border-radius: var(--radius-md);
          padding: 1rem 1.25rem;
        }

        .price-label {
          font-size: 0.85rem;
          text-transform: uppercase;
          font-weight: 700;
          color: var(--text-muted);
          letter-spacing: 0.5px;
        }

        .price-value {
          font-size: 1.75rem;
          font-weight: 800;
          color: var(--secondary);
          margin-left: auto;
        }

        .modal-section {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .modal-section-title {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0;
        }

        .options-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
        }

        .option-badge {
          background: var(--bg-input);
          border: 1px solid var(--border-light);
          color: var(--text-primary);
          padding: 0.5rem 0.75rem;
          border-radius: 6px;
          font-size: 0.85rem;
          font-weight: 600;
          transition: var(--transition-fast);
        }

        .option-badge:hover {
          border-color: var(--primary);
          background: rgba(0, 122, 255, 0.1);
        }

        .option-badge.veggie {
          border-color: rgba(34, 197, 94, 0.3);
          background: rgba(34, 197, 94, 0.05);
        }

        .option-badge.veggie:hover {
          background: rgba(34, 197, 94, 0.15);
        }

        .option-badge.meat {
          border-color: rgba(239, 68, 68, 0.3);
          background: rgba(239, 68, 68, 0.05);
        }

        .option-badge.meat:hover {
          background: rgba(239, 68, 68, 0.15);
        }

        .modal-add-btn {
          margin-top: 1rem;
          padding: 0.75rem 1.5rem;
          font-size: 1rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          width: 100%;
        }

        @media (max-width: 768px) {
          .pizza-modal-grid {
            grid-template-columns: 1fr;
            padding: 1.5rem;
            gap: 1.5rem;
          }

          .pizza-modal-image {
            min-height: 250px;
          }

          .pizza-modal-title {
            font-size: 1.5rem;
          }

          .options-list {
            gap: 0.5rem;
          }

          .option-badge {
            font-size: 0.75rem;
            padding: 0.4rem 0.6rem;
          }
        }

        /* Edit Button Styles */
        .btn-icon {
          background: transparent;
          border: 1px solid var(--border-light);
          border-radius: 50%;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--text-secondary);
          transition: var(--transition-fast);
          flex-shrink: 0;
        }

        .btn-icon:hover {
          border-color: var(--primary);
          color: var(--primary);
          background: rgba(0, 122, 255, 0.1);
        }

        .btn-icon-small {
          background: transparent;
          border: none;
          cursor: pointer;
          color: var(--text-secondary);
          padding: 0.25rem;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: var(--transition-fast);
          opacity: 0.7;
        }

        .btn-icon-small:hover {
          color: var(--primary);
          opacity: 1;
        }

        /* Edit Form Styles */
        .edit-form {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .edit-form label {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text-primary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .edit-form input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid var(--border-light);
          border-radius: var(--radius-sm);
          background: var(--bg-secondary);
          color: var(--text-primary);
          font-size: 0.95rem;
          font-family: inherit;
          transition: var(--transition-fast);
        }

        .edit-form input:focus {
          outline: none;
          border-color: var(--primary);
          background: var(--bg-input);
          box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1);
        }

        .w-full {
          width: 100%;
        }

        .btn-sm {
          padding: 0.5rem 1rem;
          font-size: 0.9rem;
        }

        .btn-secondary {
          background: var(--bg-input);
          color: var(--text-primary);
          border: 1px solid var(--border-light);
        }

        .btn-secondary:hover:not(:disabled) {
          background: rgba(0, 122, 255, 0.1);
          border-color: var(--primary);
        }
      `}</style>
    </div>
  );
}
