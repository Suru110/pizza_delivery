import React, { useState, useEffect } from 'react';
import { ClipboardList, Package, Edit, DollarSign, Check, RefreshCw, AlertTriangle, Play, Users, Phone, Mail, TrendingUp, Award } from 'lucide-react';

export default function AdminDashboard({ token, API_URL, socket }) {
  const STATUS_SEQUENCE = ['Order Received', 'Sent to kitchen', 'Sent to delivery', 'Delivered'];
  
  const [activeTab, setActiveTab] = useState('orders'); // 'orders', 'inventory', 'analytics', 'customers', 'coupons'
  const [orders, setOrders] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [coupons, setCoupons] = useState([]);
  const [settings, setSettings] = useState(null);
  
  // Loading and error states
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingInventory, setLoadingInventory] = useState(true);
  const [loadingExtras, setLoadingExtras] = useState(true);
  const [error, setError] = useState('');
  
  // Inline editing states for inventory
  const [editingItemId, setEditingItemId] = useState(null);
  const [editStock, setEditStock] = useState(0);
  const [editThreshold, setEditThreshold] = useState(0);
  const [editPrice, setEditPrice] = useState(0);

  // Fetch data
  useEffect(() => {
    fetchOrders();
    fetchInventory();
    fetchCustomers();
    fetchAnalytics();
    fetchCoupons();
    fetchSettings();

    // Listen for new orders and update automatically
    if (socket) {
      socket.emit('join-admin');
      
      socket.on('new-order', (newOrder) => {
        setOrders(prev => [newOrder, ...prev]);
        fetchInventory(); // refetch inventory as stock was deducted
      });

      socket.on('order-status-changed-admin', (updatedOrder) => {
        setOrders(prev => prev.map(o => o._id === updatedOrder._id ? updatedOrder : o));
      });
    }

    return () => {
      if (socket) {
        socket.off('new-order');
        socket.off('order-status-changed-admin');
      }
    };
  }, [socket]);

  const fetchOrders = async () => {
    try {
      const res = await fetch(`${API_URL}/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load orders.');
      const data = await res.json();
      setOrders(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingOrders(false);
    }
  };

  const fetchInventory = async () => {
    try {
      const res = await fetch(`${API_URL}/inventory`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load inventory.');
      const data = await res.json();
      setInventory(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingInventory(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/customers`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setCustomers(await res.json());
    } catch (err) { console.error(err); }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/analytics`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setAnalytics(await res.json());
    } catch (err) { console.error(err); }
  };

  const fetchCoupons = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/coupons`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        setCoupons(await res.json());
        setLoadingExtras(false);
      }
    } catch (err) { console.error(err); }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/settings`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setSettings(await res.json());
    } catch (err) { console.error(err); }
  };

  const toggleDynamicPricing = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ key: 'dynamicPricingEnabled', value: !settings?.dynamicPricingEnabled })
      });
      if (res.ok) {
        const updatedSettings = await res.json();
        setSettings(updatedSettings);
      }
    } catch (err) { console.error(err); }
  };

  const toggleBlockCustomer = async (id) => {
    try {
      const res = await fetch(`${API_URL}/admin/customers/${id}/block`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) fetchCustomers();
    } catch (err) { console.error(err); }
  };

  const createCoupon = async (e) => {
    e.preventDefault();
    const form = e.target;
    const code = form.code.value;
    const discountValue = form.discountValue.value;
    
    try {
      const res = await fetch(`${API_URL}/admin/coupons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code, discountType: 'percent', discountValue, minAmount: 0 })
      });
      if (res.ok) {
        fetchCoupons();
        form.reset();
      }
    } catch (err) { console.error(err); }
  };

  const toggleCoupon = async (id) => {
    try {
      const res = await fetch(`${API_URL}/admin/coupons/${id}/toggle`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) fetchCoupons();
    } catch (err) { console.error(err); }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      const res = await fetch(`${API_URL}/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error('Failed to update status.');
      const data = await res.json();
      setOrders(prev => prev.map(o => o._id === orderId ? data.order : o));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleStartEdit = (item) => {
    setEditingItemId(item._id);
    setEditStock(item.stock);
    setEditThreshold(item.threshold);
    setEditPrice(item.price);
  };

  const handleSaveEdit = async (itemId) => {
    try {
      const res = await fetch(`${API_URL}/inventory/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          stock: editStock,
          threshold: editThreshold,
          price: editPrice
        })
      });
      if (!res.ok) throw new Error('Failed to update inventory.');
      const updatedItem = await res.json();
      
      setInventory(prev => prev.map(item => item._id === itemId ? updatedItem : item));
      setEditingItemId(null);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRefillAll = async () => {
    if (!confirm('Are you sure you want to refill all ingredients to 100?')) return;
    try {
      const refillList = inventory.map(item => ({ id: item._id, stock: 100 }));
      const res = await fetch(`${API_URL}/inventory/refill`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ items: refillList })
      });
      if (!res.ok) throw new Error('Failed to refill inventory.');
      fetchInventory();
      alert('All stock refilled to 100 successfully.');
    } catch (err) {
      alert(err.message);
    }
  };

  const totalRevenue = orders
    .filter(o => o.paymentStatus === 'paid')
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const lowStockCount = inventory.filter(item => item.stock < item.threshold).length;

  return (
    <div className="admin-layout fade-in">
      {/* Top Stats Cards */}
      <div className="admin-stats-row">
        <div className="stat-card glass-card">
          <div className="stat-icon-wrapper blue">
            <ClipboardList size={22} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Orders</span>
            <span className="stat-value">{orders.length}</span>
          </div>
        </div>
        
        <div className="stat-card glass-card">
          <div className="stat-icon-wrapper green">
            <DollarSign size={22} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Revenue</span>
            <span className="stat-value">${totalRevenue.toFixed(2)}</span>
          </div>
        </div>

        <div className="stat-card glass-card">
          <div className="stat-icon-wrapper red">
            <AlertTriangle size={22} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Low Stock Ingredients</span>
            <span className={`stat-value ${lowStockCount > 0 ? 'text-danger' : 'text-success'}`}>
              {lowStockCount}
            </span>
          </div>
        </div>
      </div>

      {/* Admin Panel Sections */}
      <div className="admin-card glass-card">
        <div className="card-header flex-between">
          <div className="tab-buttons">
            <button 
              className={`tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
              onClick={() => setActiveTab('orders')}
            >
              Order Management
            </button>
            <button 
              className={`tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
              onClick={() => setActiveTab('inventory')}
            >
              Inventory Management
            </button>
            <button 
              className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
              onClick={() => setActiveTab('analytics')}
            >
              Sales Analytics
            </button>
            <button 
              className={`tab-btn ${activeTab === 'customers' ? 'active' : ''}`}
              onClick={() => setActiveTab('customers')}
            >
              Customers
            </button>
            <button 
              className={`tab-btn ${activeTab === 'coupons' ? 'active' : ''}`}
              onClick={() => setActiveTab('coupons')}
            >
              Coupons & Settings
            </button>
          </div>
          
          {activeTab === 'inventory' && (
            <button className="btn btn-secondary btn-sm" onClick={handleRefillAll}>
              <RefreshCw size={14} />
              <span>Reset All Stock to 100</span>
            </button>
          )}
        </div>

        {error && <div className="alert alert-error" style={{ margin: '1rem 0' }}>{error}</div>}

        {/* Tab 1: Orders List */}
        {activeTab === 'orders' && (
          <div className="orders-table-wrapper">
            {loadingOrders ? (
              <div className="flex-center" style={{ height: '200px' }}>
                <div className="spinner" />
              </div>
            ) : orders.length === 0 ? (
              <p className="no-data-text">No orders placed in the system yet.</p>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>User</th>
                    <th>Date</th>
                    <th>Items Summary</th>
                    <th>Amount</th>
                    <th>Payment</th>
                    <th>Preparation Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o._id}>
                      <td className="bold-text">#{o._id.toString().slice(-6).toUpperCase()}</td>
                      <td>
                        <span className="user-name-tag">{o.user?.name || 'Guest'}</span>
                        <span className="user-email-tag">{o.user?.email || 'N/A'}</span>
                      </td>
                      <td>{new Date(o.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}</td>
                      <td>
                        <div className="order-items-summary">
                          {o.items.map((item, index) => (
                            <span key={index} className="summary-item-badge">
                              {item.quantity}x {item.name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="amount-text">${o.totalAmount.toFixed(2)}</td>
                      <td>
                        <span className={`badge ${o.paymentStatus === 'paid' ? 'badge-paid' : 'badge-pending'}`}>
                          {o.paymentStatus}
                        </span>
                      </td>
                      <td>
                        <select 
                          className="status-select"
                          value={o.orderStatus}
                          onChange={(e) => handleStatusChange(o._id, e.target.value)}
                        >
                          {STATUS_SEQUENCE.map(status => (
                            <option 
                              key={status} 
                              value={status}
                              disabled={STATUS_SEQUENCE.indexOf(status) < STATUS_SEQUENCE.indexOf(o.orderStatus)}
                            >
                              {status}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab 2: Inventory List */}
        {activeTab === 'inventory' && (
          <div className="inventory-table-wrapper">
            {loadingInventory ? (
              <div className="flex-center" style={{ height: '200px' }}>
                <div className="spinner" />
              </div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Ingredient Name</th>
                    <th>Category</th>
                    <th>Current Stock</th>
                    <th>Threshold</th>
                    <th>Price</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map((item) => {
                    const isEditing = editingItemId === item._id;
                    const isLowStock = item.stock < item.threshold;
                    
                    return (
                      <tr key={item._id} className={isLowStock ? 'row-warning' : ''}>
                        <td className="bold-text">
                          <div className="flex-center" style={{ justifyContent: 'flex-start', gap: '0.5rem' }}>
                            {isLowStock && <AlertTriangle size={14} className="text-danger" title="Low stock warning" />}
                            <span>{item.name}</span>
                          </div>
                        </td>
                        <td><span className="category-tag">{item.category}</span></td>
                        
                        {/* Stock Column */}
                        <td>
                          {isEditing ? (
                            <input 
                              type="number" 
                              className="table-input"
                              value={editStock} 
                              onChange={(e) => setEditStock(parseInt(e.target.value) || 0)} 
                            />
                          ) : (
                            <span className={`stock-text ${isLowStock ? 'text-danger font-bold animate-pulse' : 'text-success'}`}>
                              {item.stock} / 100
                            </span>
                          )}
                        </td>

                        {/* Threshold Column */}
                        <td>
                          {isEditing ? (
                            <input 
                              type="number" 
                              className="table-input"
                              value={editThreshold} 
                              onChange={(e) => setEditThreshold(parseInt(e.target.value) || 0)} 
                            />
                          ) : (
                            <span>{item.threshold}</span>
                          )}
                        </td>

                        {/* Price Column */}
                        <td>
                          {isEditing ? (
                            <input 
                              type="number" 
                              step="0.01"
                              className="table-input"
                              value={editPrice} 
                              onChange={(e) => setEditPrice(parseFloat(e.target.value) || 0)} 
                            />
                          ) : (
                            <span className="price-tag">${item.price.toFixed(2)}</span>
                          )}
                        </td>

                        {/* Actions Column */}
                        <td>
                          {isEditing ? (
                            <button className="btn-action save" onClick={() => handleSaveEdit(item._id)} title="Save changes">
                              <Check size={16} />
                            </button>
                          ) : (
                            <button className="btn-action edit" onClick={() => handleStartEdit(item)} title="Edit ingredient info">
                              <Edit size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab 3: Analytics */}
        {activeTab === 'analytics' && analytics && (
          <div className="fade-in">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
              <div className="glass-card" style={{ padding: '2rem', textAlign: 'center' }}>
                <h3 style={{ color: 'var(--text-secondary)' }}>Total Revenue</h3>
                <h1 style={{ color: 'var(--success)', marginTop: '1rem', fontSize: '3rem' }}>${analytics.revenue.toFixed(2)}</h1>
              </div>
              <div className="glass-card" style={{ padding: '2rem', textAlign: 'center' }}>
                <h3 style={{ color: 'var(--text-secondary)' }}>Total Orders</h3>
                <h1 style={{ color: 'var(--info)', marginTop: '1rem', fontSize: '3rem' }}>{analytics.totalOrders}</h1>
              </div>
              <div className="glass-card" style={{ padding: '2rem', textAlign: 'center' }}>
                <h3 style={{ color: 'var(--text-secondary)' }}>Total Customers</h3>
                <h1 style={{ color: 'var(--secondary)', marginTop: '1rem', fontSize: '3rem' }}>{analytics.totalUsers}</h1>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Customers */}
        {activeTab === 'customers' && (
          <div className="customers-section fade-in">
            {loadingExtras ? (
              <div className="flex-center" style={{ height: '200px' }}>
                <div className="spinner" />
              </div>
            ) : customers.length === 0 ? (
              <p className="no-data-text">No customers found.</p>
            ) : (
              <>
                <div className="customers-grid">
                  {customers.map(c => (
                    <div key={c._id} className="customer-card glass-card">
                      <div className="customer-header">
                        <div className="customer-avatar">
                          <Users size={20} />
                        </div>
                        <div className="customer-title">
                          <h4>{c.name}</h4>
                          <span className={`badge ${c.isBlocked ? 'badge-pending' : 'badge-paid'}`}>
                            {c.isBlocked ? 'Blocked' : 'Active'}
                          </span>
                        </div>
                      </div>

                      <div className="customer-details">
                        <div className="detail-item">
                          <Mail size={14} className="detail-icon" />
                          <div>
                            <span className="detail-label">Email</span>
                            <span className="detail-value">{c.email}</span>
                          </div>
                        </div>

                        <div className="detail-item">
                          <Phone size={14} className="detail-icon" />
                          <div>
                            <span className="detail-label">Phone</span>
                            <span className="detail-value">{c.phone || 'N/A'}</span>
                          </div>
                        </div>

                        <div className="detail-item">
                          <TrendingUp size={14} className="detail-icon" />
                          <div>
                            <span className="detail-label">Total Orders</span>
                            <span className="detail-value">{c.totalOrders}</span>
                          </div>
                        </div>

                        <div className="detail-item">
                          <DollarSign size={14} className="detail-icon" />
                          <div>
                            <span className="detail-label">Total Spent</span>
                            <span className="detail-value">${c.totalSpent.toFixed(2)}</span>
                          </div>
                        </div>

                        <div className="detail-item">
                          <Award size={14} className="detail-icon" />
                          <div>
                            <span className="detail-label">Reward Points</span>
                            <span className="detail-value">{c.rewardPoints}</span>
                          </div>
                        </div>

                        <div className="detail-item">
                          <Check size={14} className="detail-icon" />
                          <div>
                            <span className="detail-label">Member Since</span>
                            <span className="detail-value">{new Date(c.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="customer-actions">
                        <button 
                          className={`btn btn-sm ${c.isBlocked ? 'btn-primary' : 'btn-secondary'}`}
                          onClick={() => toggleBlockCustomer(c._id)}
                        >
                          {c.isBlocked ? 'Unblock User' : 'Block User'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Tab 5: Coupons & Settings */}
        {activeTab === 'coupons' && (
          <div className="fade-in">
            <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ marginBottom: '0.5rem' }}>Global Settings</h4>
                <p className="text-muted" style={{ fontSize: '0.9rem' }}>Enable or disable manual dynamic pricing (surge pricing during peak hours).</p>
              </div>
              <button 
                className={`btn ${settings?.dynamicPricingEnabled ? 'btn-danger' : 'btn-primary'}`}
                onClick={toggleDynamicPricing}
              >
                {settings?.dynamicPricingEnabled ? 'Disable Dynamic Pricing' : 'Enable Dynamic Pricing'}
              </button>
            </div>

            <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
              <h4>Create New Promo Code</h4>
              <form onSubmit={createCoupon} style={{ display: 'flex', gap: '1rem', marginTop: '1rem', alignItems: 'center' }}>
                <input name="code" className="form-control" placeholder="Code (e.g. SUMMER10)" required style={{ width: '200px' }} />
                <input name="discountValue" type="number" className="form-control" placeholder="Discount %" required style={{ width: '150px' }} />
                <button type="submit" className="btn btn-primary">Create</button>
              </form>
            </div>
            
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Discount</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map(c => (
                  <tr key={c._id}>
                    <td className="bold-text">{c.code}</td>
                    <td>{c.discountValue}%</td>
                    <td>
                      <span className={`badge ${c.isActive ? 'badge-paid' : 'badge-pending'}`}>
                        {c.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => toggleCoupon(c._id)}>
                        Toggle Status
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`
        .admin-layout {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        /* Stats Cards Styling */
        .admin-stats-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1.5rem;
        }

        .stat-card {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          padding: 1.5rem;
        }

        .stat-icon-wrapper {
          width: 48px;
          height: 48px;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .stat-icon-wrapper.blue { background: rgba(0, 123, 255, 0.15); color: #007bff; }
        .stat-icon-wrapper.green { background: rgba(40, 167, 69, 0.15); color: #28a745; }
        .stat-icon-wrapper.red { background: rgba(220, 53, 69, 0.15); color: #dc3545; }

        .stat-content {
          display: flex;
          flex-direction: column;
        }

        .stat-label {
          font-size: 0.8rem;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .stat-value {
          font-size: 1.8rem;
          font-weight: 800;
          color: var(--text-primary);
        }

        .text-danger { color: var(--danger) !important; }
        .text-success { color: var(--success) !important; }
        .font-bold { font-weight: 700; }

        /* Main Panel Styling */
        .admin-card {
          padding: 1.75rem;
        }

        .card-header {
          border-bottom: 1px solid var(--border-light);
          padding-bottom: 1.25rem;
          margin-bottom: 1.5rem;
        }

        .tab-buttons {
          display: flex;
          gap: 1rem;
        }

        .tab-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          padding: 0.5rem 1rem;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: var(--transition-fast);
          border-bottom: 2px solid transparent;
        }

        .tab-btn:hover {
          color: var(--text-primary);
        }

        .tab-btn.active {
          color: var(--primary);
          border-color: var(--primary);
        }

        /* Table Styling */
        .orders-table-wrapper, .inventory-table-wrapper {
          overflow-x: auto;
        }

        .admin-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 0.9rem;
        }

        .admin-table th, .admin-table td {
          padding: 1rem;
          border-bottom: 1px solid var(--border-light);
        }

        .admin-table th {
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          font-size: 0.75rem;
          letter-spacing: 0.05em;
          background: rgba(255,255,255,0.01);
        }

        .admin-table tr {
          transition: var(--transition-fast);
        }

        .admin-table tr:hover {
          background: rgba(255,255,255,0.01);
        }

        .admin-table tr.row-warning {
          background: rgba(220, 53, 69, 0.03);
        }

        .admin-table tr.row-warning:hover {
          background: rgba(220, 53, 69, 0.05);
        }

        .bold-text {
          font-weight: 700;
          color: var(--text-primary);
        }

        .user-name-tag {
          font-weight: 600;
          display: block;
        }

        .user-email-tag {
          font-size: 0.75rem;
          color: var(--text-muted);
          display: block;
        }

        .order-items-summary {
          display: flex;
          flex-wrap: wrap;
          gap: 0.35rem;
          max-width: 250px;
        }

        .summary-item-badge {
          background: var(--bg-input);
          border: 1px solid var(--border-light);
          padding: 0.1rem 0.4rem;
          border-radius: 4px;
          font-size: 0.75rem;
          white-space: nowrap;
        }

        .amount-text {
          font-weight: 700;
          color: var(--secondary);
        }

        .status-select {
          background: var(--bg-input);
          border: 1px solid var(--border-light);
          color: var(--text-primary);
          padding: 0.4rem 0.75rem;
          border-radius: var(--radius-sm);
          font-family: inherit;
          font-size: 0.85rem;
          font-weight: 600;
          outline: none;
          cursor: pointer;
          transition: var(--transition-fast);
        }

        .status-select:focus {
          border-color: var(--primary);
        }

        .category-tag {
          background: rgba(255,255,255,0.05);
          border: 1px solid var(--border-light);
          padding: 0.15rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          text-transform: capitalize;
        }

        .table-input {
          background: var(--bg-input);
          border: 1px solid var(--primary);
          color: var(--text-primary);
          width: 70px;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-family: inherit;
          font-size: 0.9rem;
          outline: none;
        }

        /* Action Buttons */
        .btn-action {
          width: 30px;
          height: 30px;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          border: none;
          transition: var(--transition-fast);
        }

        .btn-action.edit {
          background: var(--bg-input);
          color: var(--text-secondary);
          border: 1px solid var(--border-light);
        }

        .btn-action.edit:hover {
          color: var(--primary);
          border-color: var(--primary);
        }

        .btn-action.save {
          background: var(--success);
          color: white;
        }

        .btn-action.save:hover {
          background: hsl(145, 80%, 35%);
          box-shadow: 0 0 10px rgba(40, 167, 69, 0.4);
        }

        .no-data-text {
          text-align: center;
          padding: 3rem;
          color: var(--text-muted);
        }

        /* Customer Cards Styles */
        .customers-section {
          padding: 1rem 0;
        }

        .customers-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 1.5rem;
          margin-top: 1.5rem;
        }

        .customer-card {
          background: linear-gradient(135deg, rgba(0, 122, 255, 0.08), rgba(255, 0, 127, 0.04));
          border: 1px solid rgba(0, 122, 255, 0.2);
          border-radius: var(--radius-md);
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          transition: var(--transition-fast);
        }

        .customer-card:hover {
          border-color: rgba(0, 122, 255, 0.4);
          box-shadow: 0 4px 16px rgba(0, 122, 255, 0.1);
        }

        .customer-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .customer-avatar {
          width: 45px;
          height: 45px;
          border-radius: 50%;
          background: var(--primary);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          flex-shrink: 0;
        }

        .customer-title {
          flex: 1;
        }

        .customer-title h4 {
          font-size: 1rem;
          font-weight: 700;
          margin: 0 0 0.25rem 0;
          color: var(--text-primary);
        }

        .customer-details {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .detail-item {
          display: flex;
          gap: 0.5rem;
          align-items: flex-start;
        }

        .detail-icon {
          color: var(--secondary);
          margin-top: 0.1rem;
          flex-shrink: 0;
        }

        .detail-item > div {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          min-width: 0;
        }

        .detail-label {
          font-size: 0.7rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 600;
        }

        .detail-value {
          font-size: 0.9rem;
          color: var(--text-primary);
          font-weight: 600;
          word-break: break-word;
        }

        .customer-actions {
          display: flex;
          gap: 0.75rem;
          padding-top: 0.75rem;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          margin-top: auto;
        }

        .customer-actions .btn {
          flex: 1;
          font-size: 0.85rem;
        }

        @media (max-width: 768px) {
          .customers-grid {
            grid-template-columns: 1fr;
          }

          .customer-details {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
