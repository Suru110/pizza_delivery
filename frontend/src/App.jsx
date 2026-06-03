import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import Navbar from './components/Navbar';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import PizzaBuilder from './pages/PizzaBuilder';
import OrderTracker from './pages/OrderTracker';
import AdminDashboard from './pages/AdminDashboard';
import Profile from './pages/Profile';
import { ChefHat, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';

const API_URL = 'http://localhost:5000/api';
const SOCKET_URL = 'http://localhost:5000';

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState('');
  const [currentTab, setCurrentTab] = useState('login');
  
  // Theme state
  const [theme, setTheme] = useState(localStorage.getItem('pizza_theme') || 'dark');
  
  // Cart & Order states
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  
  // Real-time socket reference
  const [socket, setSocket] = useState(null);

  // Simulation modal state
  const [simulatedCheckoutOrder, setSimulatedCheckoutOrder] = useState(null);
  const [simulationLoading, setSimulationLoading] = useState(false);

  // Load user details and cart from LocalStorage on startup
  useEffect(() => {
    const storedUser = localStorage.getItem('pizza_user');
    const storedToken = localStorage.getItem('pizza_token');
    const storedCart = localStorage.getItem('pizza_cart');

    if (storedUser && storedToken) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      setToken(storedToken);
      setCurrentTab(parsedUser.role === 'admin' ? 'admin-orders' : 'menu');
    }
    if (storedCart) {
      setCart(JSON.parse(storedCart));
    }
  }, []);

  // Save cart to LocalStorage when modified
  useEffect(() => {
    localStorage.setItem('pizza_cart', JSON.stringify(cart));
  }, [cart]);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('pizza_theme', theme);
  }, [theme]);

  // Handle Socket.io WebSockets connection
  useEffect(() => {
    if (user && token) {
      const newSocket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        withCredentials: true
      });
      
      setSocket(newSocket);

      newSocket.on('connect', () => {
        console.log('Socket.io connected to server.');
        // Join user's personal room for updates
        newSocket.emit('join', user.id);
      });

      // Listen for order status updates
      newSocket.on('order-update', (updatedOrder) => {
        console.log('Order status updated in real-time:', updatedOrder);
        setOrders(prev => {
          const index = prev.findIndex(o => o._id === updatedOrder._id);
          if (index !== -1) {
            const copy = [...prev];
            copy[index] = updatedOrder;
            return copy;
          } else {
            return [updatedOrder, ...prev];
          }
        });
        
        // Show an in-app browser alert for immediate user feedback
        alert(`Order Status Update: Your order is now "${updatedOrder.orderStatus}"!`);
      });

      return () => {
        newSocket.disconnect();
      };
    } else {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
    }
  }, [user, token]);

  const handleLoginSuccess = (loggedInUser, userToken) => {
    setUser(loggedInUser);
    setToken(userToken);
    localStorage.setItem('pizza_user', JSON.stringify(loggedInUser));
    localStorage.setItem('pizza_token', userToken);
    setCurrentTab(loggedInUser.role === 'admin' ? 'admin-orders' : 'menu');
  };

  const handleLogout = () => {
    setUser(null);
    setToken('');
    localStorage.removeItem('pizza_user');
    localStorage.removeItem('pizza_token');
    setCurrentTab('login');
    if (socket) socket.disconnect();
  };

  // Cart operations
  const addToCart = (item) => {
    setCart(prevCart => {
      // Find if item already exists
      const matchIdx = prevCart.findIndex(i => 
        i.name === item.name && 
        i.isCustom === item.isCustom &&
        i.base === item.base &&
        i.sauce === item.sauce &&
        i.cheese === item.cheese &&
        JSON.stringify(i.veggies) === JSON.stringify(item.veggies) &&
        JSON.stringify(i.meats) === JSON.stringify(item.meats)
      );

      if (matchIdx !== -1) {
        const updated = [...prevCart];
        updated[matchIdx].quantity += 1;
        return updated;
      }
      return [...prevCart, item];
    });
  };

  const removeFromCart = (index) => {
    setCart(prev => prev.filter((_, idx) => idx !== index));
  };

  const updateCartQty = (index, newQty) => {
    if (newQty < 1) return;
    setCart(prev => {
      const copy = [...prev];
      copy[index].quantity = newQty;
      return copy;
    });
  };

  // Checkout and payment integration
  const triggerCheckout = async ({ deliveryAddress = 'Pickup', discountApplied = 0, pointsUsed = 0, walletDiscount = 0, finalTotal } = {}) => {
    if (cart.length === 0) return;
    // Use the finalTotal (after discounts/wallet) if provided, else sum cart
    const baseTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalAmount = finalTotal !== undefined ? finalTotal : Math.max(0, baseTotal - discountApplied - walletDiscount);

    try {
      // 1. Create Order in backend
      const res = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ items: cart, totalAmount, deliveryAddress, discountApplied, pointsUsed })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Checkout failed');

      // 2. Determine if order uses real Razorpay or falls back to simulation mode
      if (data.isMock) {
        // Open simulated checkout modal
        setSimulatedCheckoutOrder(data.order);
      } else {
        // Open standard Razorpay popup interface
        const options = {
          key: data.razorpayKeyId,
          amount: Math.round(data.order.totalAmount * 100),
          currency: 'INR',
          name: 'Pizza Oven',
          description: 'Payment for your Pizza order',
          order_id: data.order.razorpayOrderId,
          handler: async (response) => {
            await verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              order_id: data.order._id
            });
          },
          prefill: {
            name: user.name,
            email: user.email,
          },
          theme: {
            color: '#ff6b35'
          }
        };
        const rzp = new window.Razorpay(options);
        rzp.open();
      }

    } catch (error) {
      alert(`Checkout Error: ${error.message}`);
    }
  };

  // Verify payment endpoint caller
  const verifyPayment = async (payload) => {
    try {
      const res = await fetch(`${API_URL}/orders/verify-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Payment verification failed');

      setCart([]); // Clear cart
      
      // Route user to tracking dashboard — OrderTracker will re-fetch orders from API on mount
      setOrders([]);
      setCurrentTab('orders');
      alert('🍕 Order placed successfully! Track your pizza below.');
    } catch (err) {
      alert(`Payment Error: ${err.message}`);
    }
  };

  // Handle Simulated success checkout action
  const handleSimulatePaymentSuccess = async () => {
    if (!simulatedCheckoutOrder) return;
    setSimulationLoading(true);
    
    await verifyPayment({
      order_id: simulatedCheckoutOrder._id,
      is_simulated: true
    });

    setSimulationLoading(false);
    setSimulatedCheckoutOrder(null);
  };

  return (
    <div className="app-container">
      <Navbar 
        user={user} 
        onLogout={handleLogout} 
        currentTab={currentTab} 
        setCurrentTab={setCurrentTab} 
        theme={theme}
        setTheme={setTheme}
      />

      <main className="main-content">
        {/* Guest Router: Authentication Screens */}
        {!user && (
          <Auth 
            onLoginSuccess={handleLoginSuccess} 
            initialView={currentTab === 'register' ? 'register' : 'login'} 
            API_URL={API_URL}
          />
        )}

        {/* Logged In Router */}
        {user && (
          <>
            {user.role === 'admin' ? (
              <>
                {currentTab === 'admin-orders' && (
                  <AdminDashboard token={token} API_URL={API_URL} socket={socket} />
                )}
                {currentTab === 'admin-inventory' && (
                  <AdminDashboard token={token} API_URL={API_URL} socket={socket} />
                )}
              </>
            ) : (
              <>
                {currentTab === 'menu' && (
                  <Dashboard 
                    token={token} 
                    API_URL={API_URL} 
                    setCurrentTab={setCurrentTab} 
                    addToCart={addToCart} 
                    cart={cart}
                    removeFromCart={removeFromCart}
                    updateCartQty={updateCartQty}
                    triggerCheckout={triggerCheckout}
                  />
                )}
                {currentTab === 'custom' && (
                  <PizzaBuilder 
                    token={token} 
                    API_URL={API_URL} 
                    addToCart={addToCart} 
                    setCurrentTab={setCurrentTab} 
                  />
                )}
                {currentTab === 'orders' && (
                  <OrderTracker 
                    token={token} 
                    API_URL={API_URL} 
                    socket={socket} 
                    orders={orders}
                    setOrders={setOrders}
                    addToCart={addToCart}
                    setCurrentTab={setCurrentTab}
                  />
                )}
                {currentTab === 'profile' && (
                  <Profile 
                    token={token} 
                    API_URL={API_URL} 
                  />
                )}
              </>
            )}
          </>
        )}
      </main>

      <footer className="app-footer">
        <div className="footer-content">
          <p>© 2026 Pizza Oven Corp. Premium Artisanal Pizza Delivery System.</p>
        </div>
      </footer>

      {/* Simulated Razorpay Test Checkout Dialog */}
      {simulatedCheckoutOrder && (
        <div className="simulation-overlay">
          <div className="simulation-modal glass-card fade-in">
            <div className="simulation-header">
              <Sparkles className="sim-icon" size={32} />
              <h3 className="serif-title">Razorpay Sandbox</h3>
              <p>Simulating secure test payment environment</p>
            </div>
            
            <div className="simulation-summary">
              <div className="sim-row">
                <span>Order Ref:</span>
                <span className="bold">#{simulatedCheckoutOrder._id.substring(12).toUpperCase()}</span>
              </div>
              <div className="sim-row">
                <span>Total Amount:</span>
                <span className="bold text-primary">${simulatedCheckoutOrder.totalAmount.toFixed(2)}</span>
              </div>
            </div>

            <div className="simulation-details">
              <p>Since the application is running in local test mode, you can bypass real credit card authorization details and simulate a successful payment instantly.</p>
            </div>

            <div className="simulation-actions">
              <button 
                className="btn btn-primary w-full sim-btn" 
                onClick={handleSimulatePaymentSuccess}
                disabled={simulationLoading}
              >
                {simulationLoading ? <div className="spinner" /> : (
                  <>
                    <CheckCircle2 size={18} />
                    <span>Authorize & Confirm Payment</span>
                  </>
                )}
              </button>
              <button 
                className="btn btn-secondary w-full"
                onClick={() => setSimulatedCheckoutOrder(null)}
                disabled={simulationLoading}
              >
                Cancel Payment
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .app-footer {
          background: #0e1114;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          padding: 1.5rem;
          margin-top: 3rem;
          text-align: center;
          color: var(--text-muted);
          font-size: 0.85rem;
        }

        /* Simulation Modal Styles */
        .simulation-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.85);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
        }

        .simulation-modal {
          width: 100%;
          max-width: 440px;
          padding: 2.25rem;
          border: 1.5px solid var(--primary-glow);
          box-shadow: 0 0 30px var(--primary-glow);
          text-align: center;
        }

        .simulation-header {
          margin-bottom: 1.75rem;
        }

        .sim-icon {
          color: var(--primary);
          margin-bottom: 0.75rem;
          animation: spin 8s linear infinite;
        }

        .simulation-header h3 {
          font-size: 1.5rem;
          color: var(--text-primary);
        }

        .simulation-header p {
          font-size: 0.8rem;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .simulation-summary {
          background: var(--bg-dark);
          border: 1px solid var(--border-light);
          border-radius: var(--radius-sm);
          padding: 1rem;
          margin-bottom: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .sim-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.9rem;
        }

        .sim-row .bold {
          font-weight: 700;
        }

        .simulation-details {
          font-size: 0.85rem;
          color: var(--text-secondary);
          line-height: 1.5;
          margin-bottom: 2rem;
        }

        .simulation-actions {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .sim-btn {
          box-shadow: var(--shadow-glow);
        }
      `}</style>
    </div>
  );
}
