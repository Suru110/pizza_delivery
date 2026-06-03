import React, { useState, useEffect } from 'react';
import { User, MapPin, Star, Plus, Trash2, Award, Edit2, Lock, Mail, Phone } from 'lucide-react';

export default function Profile({ token, API_URL }) {
  const [profile, setProfile] = useState(null);
  const [totalOrders, setTotalOrders] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Address form
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newLabel, setNewLabel] = useState('Home');
  const [newAddress, setNewAddress] = useState('');
  
  // Edit profile states
  const [editMode, setEditMode] = useState(null); // 'phone', 'email', 'password', null
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [API_URL, token]);

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${API_URL}/user/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data.user);
        setTotalOrders(data.totalOrders);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAddress = async (e) => {
    e.preventDefault();
    if (!newAddress.trim()) return;
    
    try {
      const res = await fetch(`${API_URL}/user/addresses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ label: newLabel, address: newAddress })
      });
      if (res.ok) {
        const updatedAddresses = await res.json();
        setProfile({ ...profile, addresses: updatedAddresses });
        setShowAddAddress(false);
        setNewAddress('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAddress = async (addressId) => {
    try {
      const res = await fetch(`${API_URL}/user/addresses/${addressId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const updatedAddresses = await res.json();
        setProfile({ ...profile, addresses: updatedAddresses });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdatePhone = async () => {
    setEditError('');
    setEditSuccess('');
    setUpdateLoading(true);
    try {
      const res = await fetch(`${API_URL}/user/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ phone: editPhone })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      
      setProfile(data.user);
      setEditSuccess('Phone number updated successfully!');
      setTimeout(() => {
        setEditMode(null);
        setEditSuccess('');
      }, 2000);
    } catch (err) {
      setEditError(err.message);
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleUpdateEmail = async () => {
    setEditError('');
    setEditSuccess('');
    if (!editEmail.includes('@')) {
      setEditError('Invalid email address');
      return;
    }
    setUpdateLoading(true);
    try {
      const res = await fetch(`${API_URL}/user/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: editEmail })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      
      setProfile(data.user);
      setEditSuccess('Email updated successfully!');
      setTimeout(() => {
        setEditMode(null);
        setEditSuccess('');
      }, 2000);
    } catch (err) {
      setEditError(err.message);
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleChangePassword = async () => {
    setEditError('');
    setEditSuccess('');
    
    if (!oldPassword || !editPassword || !confirmPassword) {
      setEditError('All fields are required');
      return;
    }
    if (editPassword !== confirmPassword) {
      setEditError('New passwords do not match');
      return;
    }
    if (editPassword.length < 6) {
      setEditError('Password must be at least 6 characters');
      return;
    }
    
    setUpdateLoading(true);
    try {
      const res = await fetch(`${API_URL}/user/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ oldPassword, newPassword: editPassword, confirmPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      
      setEditSuccess('Password changed successfully!');
      setTimeout(() => {
        setEditMode(null);
        setEditSuccess('');
        setOldPassword('');
        setEditPassword('');
        setConfirmPassword('');
      }, 2000);
    } catch (err) {
      setEditError(err.message);
    } finally {
      setUpdateLoading(false);
    }
  };

  const openEditMode = (mode) => {
    setEditMode(mode);
    setEditError('');
    setEditSuccess('');
    if (mode === 'phone' && profile) setEditPhone(profile.phone || '');
    if (mode === 'email' && profile) setEditEmail(profile.email);
    if (mode === 'password') {
      setOldPassword('');
      setEditPassword('');
      setConfirmPassword('');
    }
  };

  if (loading) return <div className="flex-center" style={{height: '300px'}}><div className="spinner"></div></div>;
  if (!profile) return <div className="alert alert-error">Failed to load profile.</div>;

  return (
    <div className="profile-layout fade-in">
      {/* Profile Header Stats */}
      <div className="profile-stats-grid">
        <div className="glass-card stat-card">
          <div className="stat-icon-wrapper" style={{background: 'rgba(255, 107, 53, 0.1)', color: 'var(--primary)'}}>
            <User size={24} />
          </div>
          <div>
            <h3>{profile.name}</h3>
            <p className="text-muted">{profile.email}</p>
          </div>
        </div>
        
        <div className="glass-card stat-card">
          <div className="stat-icon-wrapper" style={{background: 'rgba(40, 167, 69, 0.1)', color: 'var(--success)'}}>
            <Award size={24} />
          </div>
          <div>
            <h3>{profile.rewardPoints} Points</h3>
            <p className="text-muted">Available Wallet Balance</p>
          </div>
        </div>
        
        <div className="glass-card stat-card">
          <div className="stat-icon-wrapper" style={{background: 'rgba(23, 162, 184, 0.1)', color: 'var(--info)'}}>
            <Star size={24} />
          </div>
          <div>
            <h3>{totalOrders} Orders</h3>
            <p className="text-muted">Total Lifetime Orders</p>
          </div>
        </div>
      </div>

      {/* Contact Info Section */}
      <div className="glass-card contact-info-section">
        <div className="section-header">
          <h3 className="serif-title">Contact Information</h3>
        </div>

        {editError && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{editError}</div>}
        {editSuccess && <div className="alert alert-success" style={{ marginBottom: '1rem' }}>{editSuccess}</div>}

        <div className="contact-grid">
          <div className="contact-item">
            <div className="contact-label-row">
              <Phone size={14} className="contact-icon" />
              <span className="contact-label">Phone Number</span>
            </div>
            {editMode === 'phone' ? (
              <div className="edit-form">
                <input 
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="Enter phone number"
                  className="form-control"
                  style={{ marginBottom: '0.75rem' }}
                />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-primary btn-sm" onClick={handleUpdatePhone} disabled={updateLoading}>
                    {updateLoading ? 'Saving...' : 'Save'}
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setEditMode(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="contact-value">{profile.phone || 'Not provided'}</span>
                <button className="btn-icon-small" onClick={() => openEditMode('phone')} title="Edit phone">
                  <Edit2 size={12} />
                </button>
              </div>
            )}
          </div>

          <div className="contact-item">
            <div className="contact-label-row">
              <Mail size={14} className="contact-icon" />
              <span className="contact-label">Email Address</span>
            </div>
            {editMode === 'email' ? (
              <div className="edit-form">
                <input 
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="Enter email"
                  className="form-control"
                  style={{ marginBottom: '0.75rem' }}
                />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-primary btn-sm" onClick={handleUpdateEmail} disabled={updateLoading}>
                    {updateLoading ? 'Saving...' : 'Save'}
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setEditMode(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="contact-value">{profile.email}</span>
                <button className="btn-icon-small" onClick={() => openEditMode('email')} title="Edit email">
                  <Edit2 size={12} />
                </button>
              </div>
            )}
          </div>
        </div>

        <hr className="divider" style={{ margin: '1.5rem 0' }} />

        {editMode === 'password' && (
          <div className="edit-form" style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 'var(--radius-sm)' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Current Password</label>
            <input 
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="Enter current password"
              className="form-control"
              style={{ marginBottom: '0.75rem' }}
            />
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>New Password</label>
            <input 
              type="password"
              value={editPassword}
              onChange={(e) => setEditPassword(e.target.value)}
              placeholder="Enter new password"
              className="form-control"
              style={{ marginBottom: '0.75rem' }}
            />
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Confirm New Password</label>
            <input 
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="form-control"
              style={{ marginBottom: '0.75rem' }}
            />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-primary btn-sm" onClick={handleChangePassword} disabled={updateLoading}>
                {updateLoading ? 'Saving...' : 'Save'}
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => setEditMode(null)}>Cancel</button>
            </div>
          </div>
        )}

        {editMode !== 'password' && (
          <button 
            className="btn btn-secondary"
            onClick={() => openEditMode('password')}
          >
            <Lock size={14} style={{ marginRight: '0.5rem' }} />
            Change Password
          </button>
        )}
      </div>

      {/* Addresses Section */}
      <div className="glass-card address-section mt-4">
        <div className="flex-between mb-4">
          <h3 className="serif-title"><MapPin size={20} className="inline-icon" /> My Addresses</h3>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowAddAddress(!showAddAddress)}>
            <Plus size={16} /> Add Address
          </button>
        </div>

        {showAddAddress && (
          <form className="add-address-form" onSubmit={handleAddAddress}>
            <div className="form-row">
              <div className="form-group" style={{ flex: '1' }}>
                <label className="form-label">Label</label>
                <select className="form-control" value={newLabel} onChange={(e) => setNewLabel(e.target.value)}>
                  <option value="Home">Home</option>
                  <option value="Office">Office</option>
                  <option value="Hostel">Hostel</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="form-group" style={{ flex: '3' }}>
                <label className="form-label">Full Address</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. 123 Pizza Street, Apt 4B" 
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  required
                />
              </div>
              <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button type="submit" className="btn btn-primary" style={{ height: '42px' }}>Save</button>
              </div>
            </div>
          </form>
        )}

        {(!profile.addresses || profile.addresses.length === 0) ? (
          <p className="text-muted text-center py-4">No saved addresses yet.</p>
        ) : (
          <div className="address-grid">
            {profile.addresses.map(addr => (
              <div key={addr._id} className="address-card">
                <div className="address-header flex-between">
                  <span className="badge badge-received">{addr.label}</span>
                  <button className="btn-icon text-danger" onClick={() => handleDeleteAddress(addr._id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
                <p className="address-text">{addr.address}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .profile-layout {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          max-width: 900px;
          margin: 0 auto;
        }
        
        .profile-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
        }
        
        .stat-card {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          padding: 1.5rem;
        }
        
        .stat-icon-wrapper {
          width: 54px;
          height: 54px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .inline-icon {
          display: inline-block;
          vertical-align: text-bottom;
          margin-right: 0.5rem;
        }
        
        .contact-info-section {
          padding: 1.5rem;
        }
        
        .section-header {
          margin-bottom: 1.5rem;
        }
        
        .contact-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
          margin-bottom: 1rem;
        }
        
        .contact-item {
          padding: 1rem;
          background: rgba(0,0,0,0.05);
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-light);
        }
        
        .contact-label-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }
        
        .contact-icon {
          color: var(--primary);
          flex-shrink: 0;
        }
        
        .contact-label {
          font-weight: 600;
          font-size: 0.9rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .contact-value {
          color: var(--text-primary);
          font-size: 0.95rem;
        }
        
        .edit-form {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        
        .btn-icon-small {
          background: none;
          border: none;
          cursor: pointer;
          color: var(--primary);
          padding: 0;
          opacity: 0.7;
          transition: opacity 0.2s;
        }
        
        .btn-icon-small:hover {
          opacity: 1;
        }
        
        .divider {
          border: none;
          border-top: 1px solid var(--border-light);
        }
        
        .add-address-form {
          background: rgba(0,0,0,0.1);
          padding: 1.5rem;
          border-radius: var(--radius-sm);
          margin-bottom: 1.5rem;
          border: 1px dashed var(--border-light);
        }
        
        .form-row {
          display: flex;
          gap: 1rem;
          align-items: flex-start;
        }
        
        .address-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1rem;
        }
        
        .address-card {
          border: 1px solid var(--border-light);
          padding: 1.25rem;
          border-radius: var(--radius-sm);
          background: var(--bg-input);
          transition: var(--transition-fast);
        }
        
        .address-card:hover {
          border-color: var(--primary);
        }
        
        .address-text {
          margin-top: 1rem;
          color: var(--text-primary);
          line-height: 1.5;
        }
        
        .btn-icon {
          background: none;
          border: none;
          cursor: pointer;
          opacity: 0.7;
          transition: var(--transition-fast);
        }
        
        .btn-icon:hover {
          opacity: 1;
        }
        
        .text-danger { color: var(--danger); }
        .text-center { text-align: center; }
        .py-4 { padding-top: 2rem; padding-bottom: 2rem; }
        .mb-4 { margin-bottom: 1.5rem; }
        .mt-4 { margin-top: 1.5rem; }
      `}</style>
    </div>
  );
}
