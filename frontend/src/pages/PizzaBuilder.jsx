import React, { useState, useEffect } from 'react';
import { ChefHat, ArrowLeft, ArrowRight, Check, AlertTriangle } from 'lucide-react';

export default function PizzaBuilder({ token, API_URL, addToCart, setCurrentTab }) {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Step Wizard States
  const [step, setStep] = useState(1); // 1: Base, 2: Sauce, 3: Cheese, 4: Toppings
  
  // Custom Choices
  const [selectedBase, setSelectedBase] = useState(null);
  const [selectedSauce, setSelectedSauce] = useState(null);
  const [selectedCheese, setSelectedCheese] = useState(null);
  const [selectedVeggies, setSelectedVeggies] = useState([]);
  const [selectedMeats, setSelectedMeats] = useState([]);

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const res = await fetch(`${API_URL}/inventory`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to load ingredients.');
        const data = await res.json();
        setInventory(data);
        
        // Auto-select first in-stock option for convenience
        const bases = data.filter(i => i.category === 'base' && i.stock > 0);
        const sauces = data.filter(i => i.category === 'sauce' && i.stock > 0);
        const cheeses = data.filter(i => i.category === 'cheese' && i.stock > 0);
        
        if (bases.length > 0) setSelectedBase(bases[0]);
        if (sauces.length > 0) setSelectedSauce(sauces[0]);
        if (cheeses.length > 0) setSelectedCheese(cheeses[0]);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchInventory();
  }, [API_URL, token]);

  // Categories list
  const bases = inventory.filter(item => item.category === 'base');
  const sauces = inventory.filter(item => item.category === 'sauce');
  const cheeses = inventory.filter(item => item.category === 'cheese');
  const veggies = inventory.filter(item => item.category === 'veggies');
  const meats = inventory.filter(item => item.category === 'meat');

  // Toggle multiple toppings
  const handleToggleVeggie = (item) => {
    if (item.stock === 0) return; // Out of stock
    if (selectedVeggies.some(v => v._id === item._id)) {
      setSelectedVeggies(selectedVeggies.filter(v => v._id !== item._id));
    } else {
      setSelectedVeggies([...selectedVeggies, item]);
    }
  };

  const handleToggleMeat = (item) => {
    if (item.stock === 0) return; // Out of stock
    if (selectedMeats.some(m => m._id === item._id)) {
      setSelectedMeats(selectedMeats.filter(m => m._id !== item._id));
    } else {
      setSelectedMeats([...selectedMeats, item]);
    }
  };

  // Pricing formula: Base $5.00 + selected options prices
  const baseCost = 5.00;
  const basePrice = selectedBase ? selectedBase.price : 0;
  const saucePrice = selectedSauce ? selectedSauce.price : 0;
  const cheesePrice = selectedCheese ? selectedCheese.price : 0;
  const toppingsPrice = 
    selectedVeggies.reduce((sum, v) => sum + v.price, 0) + 
    selectedMeats.reduce((sum, m) => sum + m.price, 0);

  const totalPrice = baseCost + basePrice + saucePrice + cheesePrice + toppingsPrice;

  const handleAddToCart = () => {
    if (!selectedBase || !selectedSauce || !selectedCheese) {
      alert('Please complete steps 1-3 to customize your pizza!');
      return;
    }

    const customPizza = {
      id: `custom_${Date.now()}`,
      name: 'Custom Gourmet Pizza',
      isCustom: true,
      base: selectedBase.name,
      sauce: selectedSauce.name,
      cheese: selectedCheese.name,
      veggies: selectedVeggies.map(v => v.name),
      meats: selectedMeats.map(m => m.name),
      price: totalPrice,
      quantity: 1
    };

    addToCart(customPizza);
    setCurrentTab('menu'); // send back to menu dashboard to check out
  };

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
    <div className="builder-layout fade-in">
      {/* Wizard Step Panel */}
      <div className="builder-main glass-card">
        <div className="builder-header">
          <div className="builder-title-row">
            <ChefHat className="builder-icon animate-bounce" size={28} />
            <h2 className="serif-title">Pizza Customizer</h2>
          </div>
          {/* Stepper Navigation Tracker */}
          <div className="stepper">
            <div className={`step-node ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`} onClick={() => setStep(1)}>
              <span className="step-num">{step > 1 ? <Check size={12} /> : '1'}</span>
              <span className="step-label">Base</span>
            </div>
            <div className="step-connector" />
            <div className={`step-node ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`} onClick={() => setStep(2)}>
              <span className="step-num">{step > 2 ? <Check size={12} /> : '2'}</span>
              <span className="step-label">Sauce</span>
            </div>
            <div className="step-connector" />
            <div className={`step-node ${step >= 3 ? 'active' : ''} ${step > 3 ? 'completed' : ''}`} onClick={() => setStep(3)}>
              <span className="step-num">{step > 3 ? <Check size={12} /> : '3'}</span>
              <span className="step-label">Cheese</span>
            </div>
            <div className="step-connector" />
            <div className={`step-node ${step >= 4 ? 'active' : ''} ${step > 4 ? 'completed' : ''}`} onClick={() => setStep(4)}>
              <span className="step-num">4</span>
              <span className="step-label">Toppings</span>
            </div>
          </div>
        </div>

        {/* Step 1: Choose Base */}
        {step === 1 && (
          <div className="step-content fade-in">
            <h3 className="step-title">Choose Your Crust Base (Select 1)</h3>
            <div className="options-grid">
              {bases.map(item => (
                <div 
                  key={item._id}
                  className={`option-card ${selectedBase?._id === item._id ? 'selected' : ''} ${item.stock === 0 ? 'disabled' : ''}`}
                  onClick={() => item.stock > 0 && setSelectedBase(item)}
                >
                  <div className="option-header">
                    <h4>{item.name}</h4>
                    {selectedBase?._id === item._id && <Check size={16} className="check-icon" />}
                  </div>
                  <div className="option-footer">
                    <span className="price-tag">+${item.price.toFixed(2)}</span>
                    {item.stock === 0 ? (
                      <span className="stock-alert danger"><AlertTriangle size={12} /> Out of stock</span>
                    ) : item.stock < 20 ? (
                      <span className="stock-alert warning">Limited stock</span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Choose Sauce */}
        {step === 2 && (
          <div className="step-content fade-in">
            <h3 className="step-title">Choose Your Sauce Base (Select 1)</h3>
            <div className="options-grid">
              {sauces.map(item => (
                <div 
                  key={item._id}
                  className={`option-card ${selectedSauce?._id === item._id ? 'selected' : ''} ${item.stock === 0 ? 'disabled' : ''}`}
                  onClick={() => item.stock > 0 && setSelectedSauce(item)}
                >
                  <div className="option-header">
                    <h4>{item.name}</h4>
                    {selectedSauce?._id === item._id && <Check size={16} className="check-icon" />}
                  </div>
                  <div className="option-footer">
                    <span className="price-tag">+${item.price.toFixed(2)}</span>
                    {item.stock === 0 ? (
                      <span className="stock-alert danger"><AlertTriangle size={12} /> Out of stock</span>
                    ) : item.stock < 20 ? (
                      <span className="stock-alert warning">Limited stock</span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Choose Cheese */}
        {step === 3 && (
          <div className="step-content fade-in">
            <h3 className="step-title">Choose Cheese Type (Select 1)</h3>
            <div className="options-grid">
              {cheeses.map(item => (
                <div 
                  key={item._id}
                  className={`option-card ${selectedCheese?._id === item._id ? 'selected' : ''} ${item.stock === 0 ? 'disabled' : ''}`}
                  onClick={() => item.stock > 0 && setSelectedCheese(item)}
                >
                  <div className="option-header">
                    <h4>{item.name}</h4>
                    {selectedCheese?._id === item._id && <Check size={16} className="check-icon" />}
                  </div>
                  <div className="option-footer">
                    <span className="price-tag">+${item.price.toFixed(2)}</span>
                    {item.stock === 0 ? (
                      <span className="stock-alert danger"><AlertTriangle size={12} /> Out of stock</span>
                    ) : item.stock < 20 ? (
                      <span className="stock-alert warning">Limited stock</span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Choose Toppings */}
        {step === 4 && (
          <div className="step-content fade-in">
            {/* Veggies */}
            <h3 className="step-title" style={{ marginTop: 0 }}>Veggies Toppings</h3>
            <div className="options-grid" style={{ marginBottom: '2rem' }}>
              {veggies.map(item => {
                const isSelected = selectedVeggies.some(v => v._id === item._id);
                return (
                  <div 
                    key={item._id}
                    className={`option-card ${isSelected ? 'selected' : ''} ${item.stock === 0 ? 'disabled' : ''}`}
                    onClick={() => handleToggleVeggie(item)}
                  >
                    <div className="option-header">
                      <h4>{item.name}</h4>
                      {isSelected && <Check size={16} className="check-icon" />}
                    </div>
                    <div className="option-footer">
                      <span className="price-tag">+${item.price.toFixed(2)}</span>
                      {item.stock === 0 ? (
                        <span className="stock-alert danger"><AlertTriangle size={12} /> Out of stock</span>
                      ) : item.stock < 20 ? (
                        <span className="stock-alert warning">Low stock ({item.stock})</span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Meats */}
            <h3 className="step-title">Meat Toppings</h3>
            <div className="options-grid">
              {meats.map(item => {
                const isSelected = selectedMeats.some(m => m._id === item._id);
                return (
                  <div 
                    key={item._id}
                    className={`option-card ${isSelected ? 'selected' : ''} ${item.stock === 0 ? 'disabled' : ''}`}
                    onClick={() => handleToggleMeat(item)}
                  >
                    <div className="option-header">
                      <h4>{item.name}</h4>
                      {isSelected && <Check size={16} className="check-icon" />}
                    </div>
                    <div className="option-footer">
                      <span className="price-tag">+${item.price.toFixed(2)}</span>
                      {item.stock === 0 ? (
                        <span className="stock-alert danger"><AlertTriangle size={12} /> Out of stock</span>
                      ) : item.stock < 20 ? (
                        <span className="stock-alert warning">Low stock ({item.stock})</span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="builder-nav flex-between">
          <button 
            className="btn btn-secondary" 
            onClick={() => setStep(s => Math.max(1, s - 1))}
            disabled={step === 1}
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>
          
          {step < 4 ? (
            <button 
              className="btn btn-primary"
              onClick={() => setStep(s => Math.min(4, s + 1))}
              disabled={(step === 1 && !selectedBase) || (step === 2 && !selectedSauce) || (step === 3 && !selectedCheese)}
            >
              <span>Next Step</span>
              <ArrowRight size={16} />
            </button>
          ) : (
            <button 
              className="btn btn-primary builder-finish-btn"
              onClick={handleAddToCart}
            >
              <span>Add Custom Pizza to Cart</span>
              <Check size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Choice Summary Panel */}
      <div className="summary-sidebar glass-card">
        <h3 className="serif-title summary-title">Pizza Recipe Summary</h3>
        <div className="recipe-grid">
          <div className="recipe-row">
            <span className="recipe-label">Custom Base:</span>
            <span className="recipe-val">{selectedBase ? selectedBase.name : <em className="text-muted">None selected</em>}</span>
          </div>
          <div className="recipe-row">
            <span className="recipe-label">Sauce Base:</span>
            <span className="recipe-val">{selectedSauce ? selectedSauce.name : <em className="text-muted">None selected</em>}</span>
          </div>
          <div className="recipe-row">
            <span className="recipe-label">Cheese Choice:</span>
            <span className="recipe-val">{selectedCheese ? selectedCheese.name : <em className="text-muted">None selected</em>}</span>
          </div>
          <div className="recipe-row span-full">
            <span className="recipe-label">Veggie Toppings:</span>
            <div className="toppings-tags">
              {selectedVeggies.length === 0 ? (
                <span className="tag tag-empty">No veggies selected</span>
              ) : (
                selectedVeggies.map(v => <span key={v._id} className="tag">{v.name}</span>)
              )}
            </div>
          </div>
          <div className="recipe-row span-full">
            <span className="recipe-label">Meat Toppings:</span>
            <div className="toppings-tags">
              {selectedMeats.length === 0 ? (
                <span className="tag tag-empty">No meats selected</span>
              ) : (
                selectedMeats.map(m => <span key={m._id} className="tag">{m.name}</span>)
              )}
            </div>
          </div>
        </div>

        <div className="price-breakdown">
          <div className="breakdown-row">
            <span>Oven Base Prep Fee</span>
            <span>${baseCost.toFixed(2)}</span>
          </div>
          {selectedBase && (
            <div className="breakdown-row">
              <span>Crust ({selectedBase.name})</span>
              <span>${selectedBase.price.toFixed(2)}</span>
            </div>
          )}
          {selectedSauce && (
            <div className="breakdown-row">
              <span>Sauce ({selectedSauce.name})</span>
              <span>${selectedSauce.price.toFixed(2)}</span>
            </div>
          )}
          {selectedCheese && (
            <div className="breakdown-row">
              <span>Cheese ({selectedCheese.name})</span>
              <span>${selectedCheese.price.toFixed(2)}</span>
            </div>
          )}
          {toppingsPrice > 0 && (
            <div className="breakdown-row">
              <span>Selected Toppings</span>
              <span>${toppingsPrice.toFixed(2)}</span>
            </div>
          )}
          <hr className="summary-divider" />
          <div className="breakdown-row final-price">
            <span>Total Price</span>
            <span>${totalPrice.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <style>{`
        .builder-layout {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 2rem;
          align-items: start;
        }

        .builder-main {
          padding: 2rem;
        }

        .builder-header {
          margin-bottom: 2.5rem;
        }

        .builder-title-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
        }

        .builder-icon {
          color: var(--primary);
        }

        /* Stepper Styles */
        .stepper {
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: relative;
        }

        .step-node {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          z-index: 2;
          cursor: pointer;
        }

        .step-num {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--bg-input);
          border: 2px solid var(--border-light);
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.9rem;
          transition: var(--transition);
        }

        .step-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          transition: var(--transition);
        }

        .step-connector {
          flex: 1;
          height: 2px;
          background: var(--border-light);
          margin-top: -1.75rem;
          z-index: 1;
        }

        .step-node.active .step-num {
          border-color: var(--primary);
          color: var(--primary);
          background: hsla(var(--primary-hue), 100%, 55%, 0.1);
        }

        .step-node.active .step-label {
          color: var(--text-primary);
        }

        .step-node.completed .step-num {
          background: var(--primary);
          border-color: var(--primary);
          color: white;
        }

        /* Wizard Options Styles */
        .step-content {
          margin-bottom: 2.5rem;
        }

        .step-title {
          font-size: 1.2rem;
          color: var(--text-primary);
          margin-bottom: 1.5rem;
        }

        .options-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 1rem;
        }

        .option-card {
          background: rgba(255,255,255,0.02);
          border: 1px solid var(--border-light);
          border-radius: var(--radius-sm);
          padding: 1.25rem;
          cursor: pointer;
          transition: var(--transition);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 100px;
        }

        .option-card:hover:not(.disabled) {
          border-color: rgba(255, 255, 255, 0.2);
          background: rgba(255,255,255,0.04);
        }

        .option-card.selected {
          border-color: var(--primary);
          background: hsla(var(--primary-hue), 100%, 55%, 0.05);
          box-shadow: 0 0 10px var(--primary-glow);
        }

        .option-card.disabled {
          opacity: 0.4;
          cursor: not-allowed;
          background: rgba(0,0,0,0.1);
        }

        .option-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          width: 100%;
        }

        .option-header h4 {
          font-size: 0.95rem;
          color: var(--text-primary);
          line-height: 1.3;
        }

        .check-icon {
          color: var(--primary);
          flex-shrink: 0;
        }

        .option-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          margin-top: 0.5rem;
        }

        .price-tag {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--secondary);
        }

        .stock-alert {
          font-size: 0.7rem;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
        }

        .stock-alert.danger {
          color: var(--danger);
        }

        .stock-alert.warning {
          color: var(--warning);
        }

        .builder-nav {
          border-top: 1px solid var(--border-light);
          padding-top: 1.5rem;
        }

        .builder-finish-btn {
          box-shadow: var(--shadow-glow);
        }

        /* Summary Sidebar Styles */
        .summary-sidebar {
          position: sticky;
          top: 85px;
          padding: 1.5rem;
        }

        .summary-title {
          font-size: 1.2rem;
          margin-bottom: 1.25rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid var(--border-light);
        }

        .recipe-grid {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 1.75rem;
        }

        .recipe-row {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          font-size: 0.85rem;
        }

        .recipe-label {
          color: var(--text-muted);
          font-weight: 600;
          text-transform: uppercase;
          font-size: 0.75rem;
          letter-spacing: 0.05em;
        }

        .recipe-val {
          color: var(--text-primary);
          font-weight: 500;
        }

        .toppings-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.35rem;
          margin-top: 0.25rem;
        }

        .tag {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border-light);
          padding: 0.15rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .tag-empty {
          background: transparent;
          border: 1px dashed var(--border-light);
          color: var(--text-muted);
        }

        .price-breakdown {
          border-top: 1px solid var(--border-light);
          padding-top: 1.25rem;
        }

        .breakdown-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.85rem;
          margin-bottom: 0.4rem;
          color: var(--text-secondary);
        }

        .summary-divider {
          border: 0;
          height: 1px;
          background: var(--border-light);
          margin: 0.75rem 0;
        }

        .final-price {
          font-size: 1.15rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 0;
        }

        @media (max-width: 992px) {
          .builder-layout {
            grid-template-columns: 1fr;
          }
          
          .summary-sidebar {
            position: static;
          }
        }
      `}</style>
    </div>
  );
}
