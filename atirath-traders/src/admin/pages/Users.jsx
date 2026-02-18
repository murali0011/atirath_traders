import React, { useEffect, useState } from "react";
import { getAllAccounts, getAllUsers, getAllVendors, updateVendorStatus } from "../../firebase";
import {
  FiUser,
  FiMail,
  FiPhone,
  FiMapPin,
  FiCalendar,
  FiEye,
  FiX,
  FiDatabase,
  FiRefreshCw,
  FiDownload,
  FiBriefcase,
  FiCheckCircle,
  FiAlertCircle,
  FiClock,
  FiUsers
} from "react-icons/fi";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    active: 0,
    vendors: 0,
    pendingVendors: 0,
    approvedVendors: 0
  });
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'users', 'vendors'
  const [error, setError] = useState(null);

  useEffect(() => {
    loadUsersAndVendors();
  }, []);

  const loadUsersAndVendors = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('🔍 Loading users and vendors from separate collections...');
      
      // OPTION 1: Use getAllAccounts which combines users + vendors
      const allAccounts = await getAllAccounts();
      console.log(`✅ Loaded ${allAccounts.length} total accounts from Firebase`, allAccounts);
      
      // OPTION 2: If you want separate control, use both functions
      // const [usersList, vendorsList] = await Promise.all([
      //   getAllUsers(),
      //   getAllVendors()
      // ]);
      // const allAccounts = [...usersList, ...vendorsList];
      // console.log(`✅ Loaded ${usersList.length} users + ${vendorsList.length} vendors = ${allAccounts.length} total accounts`);
      
      // Check if data is coming through properly
      if (allAccounts.length > 0) {
        console.log('Sample account data:', allAccounts[0]);
      }
      
      setUsers(allAccounts);
      
      // Separate regular users and vendors for stats
      const regularUsers = allAccounts.filter(account => account.userType === 'user');
      const vendorUsers = allAccounts.filter(account => account.userType === 'vendor');
      console.log(`📊 Stats: ${regularUsers.length} users, ${vendorUsers.length} vendors`);
      
      calculateStats(regularUsers, vendorUsers);

    } catch (error) {
      console.error("❌ Error loading data:", error);
      setError('Failed to load data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (regularUsers, vendorUsers) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const allAccounts = [...regularUsers, ...vendorUsers];
    
    const todayUsers = allAccounts.filter(account => {
      if (!account.createdAt) return false;
      const accountDate = new Date(account.createdAt);
      return accountDate >= today;
    });

    const activeUsers = allAccounts.filter(account => {
      if (!account.lastLogin) return false;
      const lastLogin = new Date(account.lastLogin);
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(now.getDate() - 30);
      return lastLogin >= thirtyDaysAgo;
    });

    const pendingVendors = vendorUsers.filter(vendor => vendor.vendorStatus === 'pending');
    const approvedVendors = vendorUsers.filter(vendor => vendor.vendorStatus === 'approved' || vendor.vendorApproved === true);

    setStats({
      total: allAccounts.length,
      today: todayUsers.length,
      active: activeUsers.length,
      vendors: vendorUsers.length,
      pendingVendors: pendingVendors.length,
      approvedVendors: approvedVendors.length
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Not Available";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Invalid Date";
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return "Invalid Date";
    }
  };

  const formatPhone = (phone, countryCode) => {
    if (!phone || phone === "N/A") return "Not Provided";
    const code = countryCode?.startsWith('+') ? countryCode : `+${countryCode || '91'}`;
    return `${code} ${phone}`;
  };

  const getUserStatus = (user) => {
    if (!user) return "inactive";
    if (!user.lastLogin) return "inactive";
    const lastLogin = new Date(user.lastLogin);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return lastLogin >= thirtyDaysAgo ? "active" : "inactive";
  };

  const getCountryFlag = (country) => {
    const flags = {
      'India': '🇮🇳',
      'Oman': '🇴🇲',
      'United Kingdom': '🇬🇧',
      'United States': '🇺🇸',
      'USA': '🇺🇸',
      'UAE': '🇦🇪',
      'Canada': '🇨🇦',
      'Australia': '🇦🇺',
      'Germany': '🇩🇪',
      'France': '🇫🇷',
      'Singapore': '🇸🇬',
      'Japan': '🇯🇵',
      'China': '🇨🇳'
    };
    return flags[country] || '🌍';
  };

  const getVendorStatusBadge = (user) => {
    if (!user) return <span className="user-type-badge unknown">❓ Unknown</span>;
    
    if (user.userType === 'user') {
      return <span className="user-type-badge user">👤 User</span>;
    }
    
    if (user.userType !== 'vendor') {
      return <span className="user-type-badge unknown">❓ Unknown</span>;
    }
    
    const status = user.vendorStatus || 'pending';
    const isApproved = user.vendorApproved || false;
    
    if (isApproved || status === 'approved') {
      return <span className="vendor-status-badge approved">✅ Approved Vendor</span>;
    } else if (status === 'pending') {
      return <span className="vendor-status-badge pending">⏳ Pending Approval</span>;
    } else if (status === 'rejected') {
      return <span className="vendor-status-badge rejected">❌ Rejected</span>;
    }
    
    return <span className="vendor-status-badge pending">🏢 Vendor</span>;
  };

  const getFilteredUsers = () => {
    if (!users || users.length === 0) return [];
    
    switch (activeTab) {
      case 'users':
        return users.filter(user => user.userType === 'user');
      case 'vendors':
        return users.filter(user => user.userType === 'vendor');
      default:
        return users;
    }
  };

  const exportUsersToCSV = () => {
    const filteredUsers = getFilteredUsers();
    if (filteredUsers.length === 0) {
      alert("No users to export!");
      return;
    }

    const csvContent = [
      ['User ID', 'Type', 'Name', 'Email', 'Phone', 'Country Code', 'Country', 'State', 'City', 'Pincode', 'User Status', 'Vendor Status', 'GST No', 'Registered By', 'Account Created', 'Last Login'],
      ...filteredUsers.map(user => [
        user.userKey || user.vendorKey || user.uid || '',
        user.userType === 'vendor' ? 'Vendor' : 'User',
        user.name || '',
        user.email || '',
        user.phone || '',
        user.countryCode || '',
        user.country || '',
        user.state || '',
        user.city || '',
        user.pincode || '',
        getUserStatus(user),
        user.userType === 'vendor' ? (user.vendorStatus || 'pending') : 'N/A',
        user.userType === 'vendor' ? (user.gstNo || '') : '',
        user.userType === 'vendor' ? (user.registeredBy || '') : '',
        formatDate(user.createdAt),
        formatDate(user.lastLogin)
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${activeTab}_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    alert(`✅ Exported ${filteredUsers.length} ${activeTab} to CSV file!`);
  };

  const handleApproveVendor = async (vendorKey) => {
    if (!vendorKey || !window.confirm('Are you sure you want to approve this vendor?')) return;
    
    try {
      console.log('✅ Approving vendor with key:', vendorKey);
      
      const statusData = {
        status: 'approved',
        approvedBy: 'admin',
        reason: 'Approved by administrator'
      };
      
      const success = await updateVendorStatus(vendorKey, statusData);
      
      if (success) {
        alert('✅ Vendor approved successfully!');
        // Refresh the data
        await loadUsersAndVendors();
        
        // If modal is open, update selected user
        if (selectedUser && selectedUser.vendorKey === vendorKey) {
          const updatedUser = { ...selectedUser, vendorStatus: 'approved', vendorApproved: true };
          setSelectedUser(updatedUser);
        }
      } else {
        alert('❌ Failed to approve vendor');
      }
    } catch (error) {
      console.error('Error approving vendor:', error);
      alert('❌ Error approving vendor: ' + error.message);
    }
  };

  const handleRejectVendor = async (vendorKey) => {
    if (!vendorKey) return;
    
    const reason = prompt('Please enter reason for rejection:');
    if (!reason) return;
    
    try {
      console.log('❌ Rejecting vendor with key:', vendorKey);
      
      const statusData = {
        status: 'rejected',
        approvedBy: null,
        reason: reason
      };
      
      const success = await updateVendorStatus(vendorKey, statusData);
      
      if (success) {
        alert('✅ Vendor rejected successfully!');
        // Refresh the data
        await loadUsersAndVendors();
        
        // If modal is open, update selected user
        if (selectedUser && selectedUser.vendorKey === vendorKey) {
          const updatedUser = { ...selectedUser, vendorStatus: 'rejected', vendorApproved: false };
          setSelectedUser(updatedUser);
        }
      } else {
        alert('❌ Failed to reject vendor');
      }
    } catch (error) {
      console.error('Error rejecting vendor:', error);
      alert('❌ Error rejecting vendor: ' + error.message);
    }
  };

  const testFirebaseConnection = async () => {
    try {
      console.log('🧪 Testing Firebase connection...');
      
      // Test users collection
      const usersTest = await getAllUsers();
      console.log('📊 Users collection test:', usersTest.length, 'users found');
      if (usersTest.length > 0) {
        console.log('Sample user:', usersTest[0]);
      }
      
      // Test vendors collection
      const vendorsTest = await getAllVendors();
      console.log('📊 Vendors collection test:', vendorsTest.length, 'vendors found');
      if (vendorsTest.length > 0) {
        console.log('Sample vendor:', vendorsTest[0]);
      }
      
      // Test combined accounts
      const accountsTest = await getAllAccounts();
      console.log('📊 All accounts test:', accountsTest.length, 'total accounts found');
      
      alert(`✅ Firebase Connection Test Successful!\nUsers: ${usersTest.length}\nVendors: ${vendorsTest.length}\nTotal: ${accountsTest.length}`);
      
      return {
        users: usersTest,
        vendors: vendorsTest,
        accounts: accountsTest
      };
    } catch (error) {
      console.error('❌ Firebase connection test failed:', error);
      alert('❌ Firebase connection failed: ' + error.message);
      throw error;
    }
  };

  return (
    <div className="users-container admin-content">
      {/* Header Section */}
      <div className="users-header">
        <div className="header-content">
          <h1 className="users-title">
            <FiUsers className="title-icon" />
            Users & Vendors Management
          </h1>
          <p className="users-subtitle">
            Manage and monitor all registered users and vendors in real-time
            <span className="user-count">{users.length} total accounts</span>
          </p>
        </div>
        <div className="header-stats">
          <div className="header-stat-card">
            <div className="stat-icon-small">
              <FiUser />
            </div>
            <div>
              <div className="stat-value">{stats.total}</div>
              <div className="stat-label">Total</div>
            </div>
          </div>
          <div className="header-stat-card">
            <div className="stat-icon-small">
              <FiBriefcase />
            </div>
            <div>
              <div className="stat-value">{stats.vendors}</div>
              <div className="stat-label">Vendors</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="stats-grid">
        <div className="stat-card total-stat">
          <div className="stat-icon">
            <FiDatabase />
          </div>
          <div className="stat-content">
            <h3>{stats.total}</h3>
            <p>Total Accounts</p>
            <div className="stat-trend">All registered accounts</div>
          </div>
        </div>

        <div className="stat-card today-stat">
          <div className="stat-icon">
            <FiUser />
          </div>
          <div className="stat-content">
            <h3>{stats.today}</h3>
            <p>Today's Registrations</p>
            <div className="stat-trend">Registered today</div>
          </div>
        </div>

        <div className="stat-card vendors-stat">
          <div className="stat-icon">
            <FiBriefcase />
          </div>
          <div className="stat-content">
            <h3>{stats.vendors}</h3>
            <p>Vendors</p>
            <div className="stat-trend">
              {stats.approvedVendors} approved • {stats.pendingVendors} pending
            </div>
          </div>
        </div>

        <div className="stat-card active-stat">
          <div className="stat-icon">
            <FiUser />
          </div>
          <div className="stat-content">
            <h3>{stats.active}</h3>
            <p>Active Users</p>
            <div className="stat-trend">Last 30 days activity</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        <button 
          className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          <FiUsers /> All Accounts ({users.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <FiUser /> Regular Users ({users.filter(u => u && u.userType === 'user').length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'vendors' ? 'active' : ''}`}
          onClick={() => setActiveTab('vendors')}
        >
          <FiBriefcase /> Vendors ({users.filter(u => u && u.userType === 'vendor').length})
        </button>
      </div>

      {/* Toolbar with Export and Refresh */}
      <div className="users-toolbar">
        <div className="toolbar-left">
          <button
            className="export-btn"
            onClick={exportUsersToCSV}
            disabled={getFilteredUsers().length === 0}
          >
            <FiDownload /> Export CSV
          </button>
          
          
        </div>
        <div className="toolbar-right">
          <button
            className="refresh-btn"
            onClick={loadUsersAndVendors}
          >
            <FiRefreshCw /> Refresh Data
          </button>
        </div>
      </div>

      {/* Main Users Table */}
      <div className="users-table-container">
        {loading ? (
          <div className="loading-state">
            <div className="loader"></div>
            <p>Loading users and vendors from Firebase...</p>
            <small>Checking collections: users, vendors</small>
          </div>
        ) : error ? (
          <div className="error-state">
            <FiAlertCircle size={48} />
            <h3>Error Loading Data</h3>
            <p>{error}</p>
            <button onClick={loadUsersAndVendors} className="refresh-btn">
              <FiRefreshCw /> Try Again
            </button>
          </div>
        ) : getFilteredUsers().length === 0 ? (
          <div className="empty-state">
            {activeTab === 'users' ? <FiUser size={48} /> : <FiBriefcase size={48} />}
            <h3>No {activeTab} found</h3>
            <p>No {activeTab} have registered yet</p>
            <button onClick={loadUsersAndVendors} className="refresh-btn">
              <FiRefreshCw /> Refresh
            </button>
          </div>
        ) : (
          <>
            <div className="table-info">
              <span>Showing {getFilteredUsers().length} {activeTab === 'all' ? 'accounts' : activeTab}</span>
              <span className="export-hint">
                <FiDownload size={12} /> Click Export CSV to download all data
              </span>
            </div>
            <table className="users-table">
              <thead>
                <tr>
                  <th>Account Type</th>
                  <th>User Details</th>
                  <th>Contact</th>
                  <th>Location</th>
                  <th>User Status</th>
                  <th>Vendor Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredUsers().map((user) => (
                  <tr key={user.userKey || user.vendorKey || user.uid || Math.random()} className="user-row">
                    <td className="account-type-cell">
                      {getVendorStatusBadge(user)}
                    </td>
                    <td>
                      <div className="user-info">
                        <div className="user-name">
                          <FiUser size={12} />
                          {user.name || "Unnamed User"}
                          {user.userType === 'vendor' && <span className="vendor-indicator">🏢</span>}
                        </div>
                        <div className="user-email">
                          <FiMail size={12} />
                          <span className="email-text">
                            {user.email || "No email"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="contact-info">
                        <div className="phone-info">
                          <FiPhone size={12} />
                          <span className="phone-text">
                            {formatPhone(user.phone, user.countryCode)}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="location-info">
                        <FiMapPin size={12} />
                        <div className="location-summary">
                          {user.city || user.country || "Not set"}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className={`status-badge-user ${getUserStatus(user)}`}>
                        <span className="status-dot"></span>
                        {getUserStatus(user) === "active" ? "Active" : "Inactive"}
                      </div>
                    </td>
                    <td>
                      {user.userType === 'vendor' ? (
                        <div className={`vendor-status ${user.vendorStatus || 'pending'} ${user.vendorApproved ? 'approved' : ''}`}>
                          {user.vendorApproved ? (
                            <><FiCheckCircle /> Approved</>
                          ) : user.vendorStatus === 'pending' ? (
                            <><FiClock /> Pending</>
                          ) : user.vendorStatus === 'rejected' ? (
                            <><FiAlertCircle /> Rejected</>
                          ) : (
                            <><FiAlertCircle /> {user.vendorStatus || 'Pending'}</>
                          )}
                        </div>
                      ) : (
                        <div className="vendor-status not-vendor">
                          Regular User
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="date-info">
                        <FiCalendar size={12} />
                        <div className="date-summary">
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="view-btn"
                          onClick={() => setSelectedUser(user)}
                          title="View Details"
                        >
                          <FiEye /> View
                        </button>
                        {user.userType === 'vendor' && user.vendorStatus === 'pending' && (
                          <>
                            <button
                              className="approve-btn"
                              onClick={() => handleApproveVendor(user.vendorKey || user.uid)}
                              title="Approve Vendor"
                            >
                              <FiCheckCircle /> Approve
                            </button>
                            <button
                              className="reject-btn"
                              onClick={() => handleRejectVendor(user.vendorKey || user.uid)}
                              title="Reject Vendor"
                            >
                              <FiX /> Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      {/* User/Vendor Details Modal */}
      {selectedUser && (
        <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="modal-content user-details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {selectedUser.userType === 'vendor' ? 'Vendor Details' : 'User Details'}
                {getVendorStatusBadge(selectedUser)}
              </h2>
              <button
                className="modal-close-blue"
                onClick={() => setSelectedUser(null)}
              >
                <FiX size={24} />
              </button>
            </div>

            <div className="user-id-section">
              <div className="user-id-label">UID:</div>
              <div className="user-id-value">{selectedUser.uid || selectedUser.userKey || selectedUser.vendorKey || "N/A"}</div>
            </div>

            <div className="modal-body">
              <div className="user-details-grid">
                <div className="details-section">
                  <div className="section-header">
                    <FiUser className="section-icon" />
                    <h3 className="section-title">Personal Information</h3>
                  </div>
                  <div className="section-content">
                    <div className="detail-row">
                      <span className="detail-label">Full Name:</span>
                      <span className="detail-value">{selectedUser.name || "Not provided"}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Email:</span>
                      <span className="detail-value">{selectedUser.email || "Not provided"}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Phone:</span>
                      <span className="detail-value">{formatPhone(selectedUser.phone, selectedUser.countryCode)}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Account Type:</span>
                      <span className="detail-value">
                        {selectedUser.userType === 'vendor' ? 'Vendor' : 'Regular User'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="details-section">
                  <div className="section-header">
                    <FiMapPin className="section-icon" />
                    <h3 className="section-title">Location Details</h3>
                  </div>
                  <div className="section-content">
                    <div className="detail-row">
                      <span className="detail-label">Country:</span>
                      <span className="detail-value">
                        <span className="country-flag">{getCountryFlag(selectedUser.country)}</span>
                        {selectedUser.country || "Not provided"}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">State:</span>
                      <span className="detail-value">{selectedUser.state || "Not provided"}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">City:</span>
                      <span className="detail-value">{selectedUser.city || "Not provided"}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Pincode:</span>
                      <span className="detail-value">{selectedUser.pincode || "Not provided"}</span>
                    </div>
                  </div>
                </div>

                {selectedUser.userType === 'vendor' && (
                  <div className="details-section">
                    <div className="section-header">
                      <FiBriefcase className="section-icon" />
                      <h3 className="section-title">Vendor Information</h3>
                    </div>
                    <div className="section-content">
                      <div className="detail-row">
                        <span className="detail-label">GST Number:</span>
                        <span className="detail-value vendor-gst">{selectedUser.gstNo || "Not provided"}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Registered By:</span>
                        <span className="detail-value">{selectedUser.registeredBy || "Not provided"}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Vendor Status:</span>
                        <span className="detail-value">
                          <span className={`vendor-status-indicator ${selectedUser.vendorStatus || 'pending'}`}>
                            {selectedUser.vendorApproved ? '✅ Approved' : 
                             selectedUser.vendorStatus === 'pending' ? '⏳ Pending Approval' : 
                             selectedUser.vendorStatus === 'rejected' ? '❌ Rejected' : 
                             selectedUser.vendorStatus || 'Pending'}
                          </span>
                        </span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Vendor ID:</span>
                        <span className="detail-value">{selectedUser.vendorKey || "N/A"}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="details-section">
                  <div className="section-header">
                    <FiDatabase className="section-icon" />
                    <h3 className="section-title">Account Information</h3>
                  </div>
                  <div className="section-content">
                    <div className="detail-row">
                      <span className="detail-label">Account Created:</span>
                      <span className="detail-value">{formatDate(selectedUser.createdAt)}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Last Login:</span>
                      <span className="detail-value">{formatDate(selectedUser.lastLogin) || "Never"}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Last Updated:</span>
                      <span className="detail-value">{formatDate(selectedUser.updatedAt) || "Never"}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Profile Photo:</span>
                      <span className="detail-value">
                        {selectedUser.photoURL ?
                          <span className="photo-status uploaded">✓ Uploaded</span> :
                          <span className="photo-status not-uploaded">No photo</span>
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              {selectedUser.userType === 'vendor' && selectedUser.vendorStatus === 'pending' && (
                <div className="vendor-actions">
                  <button
                    className="btn-approve"
                    onClick={() => {
                      handleApproveVendor(selectedUser.vendorKey || selectedUser.uid);
                      setSelectedUser(null);
                    }}
                  >
                    <FiCheckCircle /> Approve Vendor
                  </button>
                  <button
                    className="btn-reject"
                    onClick={() => {
                      handleRejectVendor(selectedUser.vendorKey || selectedUser.uid);
                      setSelectedUser(null);
                    }}
                  >
                    <FiX /> Reject Vendor
                  </button>
                </div>
              )}
              <button
                className="btn-secondary-blue"
                onClick={() => setSelectedUser(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}