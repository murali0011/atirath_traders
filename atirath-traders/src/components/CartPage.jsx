// components/CartPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from './CartContext';
import { 
  ShoppingCart, 
  Minus, 
  Plus, 
  Trash2, 
  ArrowLeft, 
  Check,
  Home,
  RefreshCw,
  User,
  LogIn,
  ShoppingBag
} from 'lucide-react';
import CheckoutModal from './CheckoutModal';
import { database, ref, get } from '../firebase'; // 🔥 Import Firebase

const CartPage = () => {
  const navigate = useNavigate();
  const { 
    items, 
    removeFromCart, 
    updateQuantity, 
    getTotalItems, 
    clearCart,
    user,
    loadCartFromFirebase,
    setCheckoutProducts
  } = useCart();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [cartStatus, setCartStatus] = useState('local');
  const [lastSynced, setLastSynced] = useState(null);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [checkoutProducts, setCheckoutProductsLocal] = useState([]);
  
  // 🔥 FIXED: State for complete user profile from database
  const [completeProfile, setCompleteProfile] = useState(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  // 🔥 FIXED: Fetch complete user data from Firebase when user changes
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) {
        setCompleteProfile(null);
        return;
      }

      console.log("👤 Firebase Auth User:", user);
      setIsLoadingProfile(true);

      try {
        // Try to find user in 'users' node first
        const usersRef = ref(database, 'users');
        const usersSnapshot = await get(usersRef);
        
        let userData = null;
        
        if (usersSnapshot.exists()) {
          const users = usersSnapshot.val();
          // Find user by email or uid
          const foundUser = Object.values(users).find(
            u => u.email === user.email || u.uid === user.uid
          );
          
          if (foundUser) {
            console.log("📋 Found user in 'users' node:", foundUser);
            userData = foundUser;
          }
        }

        // If not found in users, try vendors node
        if (!userData) {
          const vendorsRef = ref(database, 'vendors');
          const vendorsSnapshot = await get(vendorsRef);
          
          if (vendorsSnapshot.exists()) {
            const vendors = vendorsSnapshot.val();
            const foundVendor = Object.values(vendors).find(
              v => v.email === user.email || v.uid === user.uid
            );
            
            if (foundVendor) {
              console.log("📋 Found user in 'vendors' node:", foundVendor);
              userData = foundVendor;
            }
          }
        }

        // Create complete profile object
        const profileData = {
          // From Firebase Auth
          uid: user.uid,
          name: user.displayName || userData?.name || "",
          email: user.email || "",
          
          // From database (users/vendors node)
          phone: userData?.phone || user.phoneNumber || "",
          country: userData?.country || "India",
          state: userData?.state || "",
          city: userData?.city || "",
          pincode: userData?.pincode || "",
          
          // Store the entire userData for reference
          ...(userData || {})
        };

        console.log("✅ Complete profile created:", profileData);
        setCompleteProfile(profileData);
      } catch (error) {
        console.error("❌ Error fetching user profile:", error);
        
        // Fallback to basic auth data
        setCompleteProfile({
          uid: user.uid,
          name: user.displayName || "",
          email: user.email || "",
          phone: user.phoneNumber || "",
          country: "India",
          state: "",
          city: "",
          pincode: ""
        });
      } finally {
        setIsLoadingProfile(false);
      }
    };

    fetchUserProfile();
  }, [user]);

  useEffect(() => {
    const checkCartStatus = () => {
      const cartId = user ? `user_${user.uid}` : localStorage.getItem('guestCartId');
      if (cartId) {
        setCartStatus('synced');
        setLastSynced(new Date().toLocaleTimeString());
      }
    };
    
    checkCartStatus();
  }, [user]);

  const handleBack = () => {
    navigate(-1);
  };

  const handleHome = () => {
    navigate('/');
  };

  const handleQuantityChange = (cartItemId, delta) => {
    const item = items.find(item => item.cartItemId === cartItemId);
    if (item) {
      const newQty = Math.max(1, item.quantity + delta);
      updateQuantity(cartItemId, newQty);
    }
  };

  // ============================================
  // Get correct currency symbol based on product
  // ============================================
  const getCurrencySymbol = (item) => {
    if (item.companyName?.toLowerCase().includes('siea') || 
        item.companyName?.toLowerCase().includes('heritage') ||
        item.companyName?.toLowerCase().includes('sai import') ||
        item.category === 'rice' ||
        item.category === 'pulses' ||
        item.category === 'spices' ||
        item.isRice) {
      return '₹';
    }
    
    if (item.price?.currency === 'USD' || 
        item.price_usd_per_carton ||
        item.fob_price_usd ||
        item["Ex-Mill_usd"]) {
      return '$';
    }
    
    return '₹';
  };

  // ============================================
  // Display product price with correct currency
  // ============================================
  const displayProductPrice = (item) => {
    const currencySymbol = getCurrencySymbol(item);
    
    if (item.selectedGradePrice) {
      return `${currencySymbol}${parseFloat(item.selectedGradePrice).toFixed(2)} / kg`;
    }
    
    if (item.price && typeof item.price === 'object') {
      if (item.price.type === 'rice' || (item.price.min !== undefined)) {
        const min = item.price.min || 0;
        const max = item.price.max || 0;
        return `${currencySymbol}${min.toFixed(2)} - ${currencySymbol}${max.toFixed(2)} / kg`;
      }
      if (item.price.type === 'carton' && item.price.value) {
        return `${currencySymbol}${item.price.value.toFixed(2)} / carton`;
      }
      if (item.price.display) {
        return item.price.display;
      }
    }
    
    if (item.price_usd_per_carton) {
      return `$${parseFloat(item.price_usd_per_carton).toFixed(2)} / carton`;
    }
    
    if (item.fob_price_usd) {
      return `$${parseFloat(item.fob_price_usd).toFixed(2)} FOB`;
    }
    
    if (item["Ex-Mill_usd"]) {
      return `$${parseFloat(item["Ex-Mill_usd"]).toFixed(2)} EX-MILL`;
    }
    
    return 'Contact for Price';
  };

  // ============================================
  // Get item total price with correct currency
  // ============================================
  const getItemTotalPrice = (item) => {
    const currencySymbol = getCurrencySymbol(item);
    
    if (item.selectedGradePrice) {
      const pricePerKg = parseFloat(item.selectedGradePrice);
      const packageSize = parseFloat(item.selectedQuantity) || 1;
      const numberOfPackages = item.quantity || 1;
      const total = pricePerKg * packageSize * numberOfPackages;
      
      return {
        value: total.toFixed(2),
        isRange: false,
        currency: currencySymbol,
        display: `${currencySymbol}${total.toFixed(2)}`
      };
    }
    
    if (item.price && typeof item.price === 'object') {
      if (item.price.min !== undefined && item.price.max !== undefined) {
        const min = item.price.min || 0;
        const max = item.price.max || 0;
        const packageSize = parseFloat(item.selectedQuantity) || 1;
        const numberOfPackages = item.quantity || 1;
        return {
          min: (min * packageSize * numberOfPackages).toFixed(2),
          max: (max * packageSize * numberOfPackages).toFixed(2),
          isRange: true,
          unit: 'kg',
          currency: currencySymbol
        };
      }
      
      if (item.price.value !== undefined) {
        const priceValue = parseFloat(item.price.value) || 0;
        const numberOfPackages = item.quantity || 1;
        return {
          value: (priceValue * numberOfPackages).toFixed(2),
          isRange: false,
          currency: currencySymbol,
          display: `${currencySymbol}${(priceValue * numberOfPackages).toFixed(2)}`
        };
      }
    }
    
    if (item.price_usd_per_carton !== undefined) {
      const priceValue = parseFloat(item.price_usd_per_carton);
      const numberOfPackages = item.quantity || 1;
      return {
        value: (priceValue * numberOfPackages).toFixed(2),
        isRange: false,
        currency: '$',
        display: `$${(priceValue * numberOfPackages).toFixed(2)}`
      };
    }
    
    if (item.fob_price_usd !== undefined) {
      const priceValue = parseFloat(item.fob_price_usd);
      const numberOfPackages = item.quantity || 1;
      return {
        value: (priceValue * numberOfPackages).toFixed(2),
        isRange: false,
        currency: '$',
        display: `$${(priceValue * numberOfPackages).toFixed(2)}`
      };
    }
    
    if (item["Ex-Mill_usd"] !== undefined) {
      const priceValue = parseFloat(item["Ex-Mill_usd"]);
      const numberOfPackages = item.quantity || 1;
      return {
        value: (priceValue * numberOfPackages).toFixed(2),
        isRange: false,
        currency: '$',
        display: `$${(priceValue * numberOfPackages).toFixed(2)}`
      };
    }
    
    return {
      value: '0.00',
      isRange: false,
      currency: currencySymbol,
      display: `${currencySymbol}0.00`
    };
  };

  // ============================================
  // Get unit price display with correct currency
  // ============================================
  const getUnitPriceDisplay = (item) => {
    const currencySymbol = getCurrencySymbol(item);
    
    if (item.selectedGradePrice) {
      return `${currencySymbol}${parseFloat(item.selectedGradePrice).toFixed(2)} / kg`;
    }
    
    if (item.price && typeof item.price === 'object') {
      if (item.price.display) {
        return item.price.display;
      }
      
      if (item.price.min !== undefined && item.price.max !== undefined) {
        return `${currencySymbol}${item.price.min.toFixed(2)} - ${currencySymbol}${item.price.max.toFixed(2)} / kg`;
      }
      
      if (item.price.value !== undefined) {
        if (item.price.type === 'carton') {
          return `${currencySymbol}${item.price.value.toFixed(2)} / carton`;
        }
        return `${currencySymbol}${item.price.value.toFixed(2)}`;
      }
    }
    
    if (item.price_usd_per_carton !== undefined) {
      return `$${parseFloat(item.price_usd_per_carton).toFixed(2)} / carton`;
    }
    
    if (item.fob_price_usd !== undefined) {
      return `$${parseFloat(item.fob_price_usd).toFixed(2)} FOB`;
    }
    
    if (item["Ex-Mill_usd"] !== undefined) {
      return `$${parseFloat(item["Ex-Mill_usd"]).toFixed(2)} EX-MILL`;
    }
    
    return 'Contact for Price';
  };

  // ============================================
  // Calculate total cart price correctly
  // ============================================
  const calculateTotalPrice = () => {
    let total = 0;
    items.forEach(item => {
      if (item.selectedGradePrice) {
        const pricePerKg = parseFloat(item.selectedGradePrice);
        const packageSize = parseFloat(item.selectedQuantity) || 1;
        const numberOfPackages = item.quantity || 1;
        total += pricePerKg * packageSize * numberOfPackages;
      } else if (item.price && typeof item.price === 'object') {
        if (item.price.min !== undefined) {
          const avgPrice = (parseFloat(item.price.min) + parseFloat(item.price.max)) / 2;
          const packageSize = parseFloat(item.selectedQuantity) || 1;
          const numberOfPackages = item.quantity || 1;
          total += avgPrice * packageSize * numberOfPackages;
        } else if (item.price.value) {
          total += parseFloat(item.price.value) * (item.quantity || 1);
        }
      } else if (item.price_usd_per_carton) {
        total += parseFloat(item.price_usd_per_carton) * (item.quantity || 1);
      } else if (item.fob_price_usd) {
        total += parseFloat(item.fob_price_usd) * (item.quantity || 1);
      } else if (item["Ex-Mill_usd"]) {
        total += parseFloat(item["Ex-Mill_usd"]) * (item.quantity || 1);
      } else if (typeof item.price === 'number') {
        total += item.price * (item.quantity || 1);
      }
    });
    return total.toFixed(2);
  };

  // ============================================
  // Get display name with grade
  // ============================================
  const getProductDisplayName = (item) => {
    if (item.selectedGradeDisplay) {
      return (
        <>
          <div style={{ fontWeight: 'bold' }}>{item.name}</div>
          <div style={{ color: '#10b981', fontSize: '0.9rem', marginTop: '4px' }}>
            Grade: {item.selectedGradeDisplay}
          </div>
        </>
      );
    }
    return <div>{item.name}</div>;
  };

  const handleCartCheckout = () => {
    if (items.length === 0) {
      alert('Your cart is empty!');
      return;
    }

    console.log("🛒 Preparing products for checkout from cart:", items);
    console.log("👤 Complete profile for checkout:", completeProfile);

    const productsForCheckout = items.map(item => ({
      ...item,
      name: item.name || `Product ${item.id}`,
      price: item.price,
      quantity: item.quantity,
      image: item.image || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=500&auto=format&fit=crop&q=60',
      companyName: item.companyName || 'Unknown Company',
      brandName: item.brandName || 'General',
      unit: item.unit || 'unit',
      category: item.category || 'General',
      selectedGrade: item.selectedGrade,
      selectedGradePrice: item.selectedGradePrice,
      selectedGradeDisplay: item.selectedGradeDisplay,
      selectedPacking: item.selectedPacking,
      selectedQuantity: item.selectedQuantity,
      quantityUnit: item.quantityUnit,
      isRice: item.isRice,
      price_usd_per_carton: item.price_usd_per_carton,
      fob_price_usd: item.fob_price_usd,
      "Ex-Mill_usd": item["Ex-Mill_usd"]
    }));

    setCheckoutProductsLocal(productsForCheckout);
    if (setCheckoutProducts) {
      setCheckoutProducts(productsForCheckout);
    }
    
    // Open checkout modal
    setIsCheckoutModalOpen(true);
  };

  const handleContinueShopping = () => {
    navigate('/products');
  };

  const handleClearCart = () => {
    if (window.confirm('Are you sure you want to clear your cart?')) {
      clearCart();
    }
  };

  const handleSyncCart = async () => {
    setIsSyncing(true);
    try {
      await loadCartFromFirebase();
      setCartStatus('synced');
      setLastSynced(new Date().toLocaleTimeString());
      const message = document.createElement('div');
      message.textContent = 'Cart synced successfully!';
      message.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #10b981;
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        z-index: 10000;
        animation: slideIn 0.3s ease;
      `;
      document.body.appendChild(message);
      setTimeout(() => message.remove(), 3000);
    } catch (error) {
      setCartStatus('error');
      alert('Error syncing cart: ' + error.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLoginToSaveCart = () => {
    navigate('/login', { 
      state: { 
        from: '/cart',
        message: 'Login to save your cart and access it from any device!' 
      } 
    });
  };

  const handleGuestCheckout = () => {
    if (items.length === 0) {
      alert('Your cart is empty!');
      return;
    }

    if (window.confirm('You can checkout as a guest, but your cart will only be saved on this device. Login to save your cart permanently. Continue as guest?')) {
      handleCartCheckout();
    }
  };

  const handleCheckoutModalClose = () => {
    setIsCheckoutModalOpen(false);
    setCheckoutProductsLocal([]);
  };

  const handleOrderSubmitted = () => {
    clearCart();
    setIsCheckoutModalOpen(false);
    setCheckoutProductsLocal([]);
  };

  const totalPrice = calculateTotalPrice();
  const taxAmount = (parseFloat(totalPrice) * 0.1).toFixed(2);
  const finalTotal = (parseFloat(totalPrice) + parseFloat(taxAmount)).toFixed(2);

  if (items.length === 0) {
    return (
      <>
        <div className="cart-page" style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: 'white',
          paddingTop: '80px'
        }}>
          <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <button
                onClick={handleBack}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#8FB3E2',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '1rem',
                  cursor: 'pointer'
                }}
              >
                <ArrowLeft size={20} />
                Back
              </button>
              
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 16px',
                background: 'rgba(30, 41, 59, 0.6)',
                borderRadius: '20px',
                border: `1px solid ${cartStatus === 'synced' ? '#10b981' : cartStatus === 'error' ? '#ef4444' : '#8FB3E2'}`
              }}>
                <div style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: cartStatus === 'synced' ? '#10b981' : cartStatus === 'error' ? '#ef4444' : '#8FB3E2'
                }} />
                <span style={{ fontSize: '0.85rem', color: '#cbd5e0' }}>
                  {cartStatus === 'synced' ? 'Cloud Synced' : cartStatus === 'error' ? 'Sync Error' : 'Local Storage'}
                </span>
              </div>
              
              <button
                onClick={handleHome}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#8FB3E2',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '1rem',
                  cursor: 'pointer'
                }}
              >
                <Home size={20} />
                Home
              </button>
            </div>

            <div style={{
              textAlign: 'center',
              padding: '4rem 2rem',
              background: 'rgba(30, 41, 59, 0.5)',
              borderRadius: '16px',
              border: '2px solid rgba(64, 150, 226, 0.2)',
              marginTop: '2rem'
            }}>
              <ShoppingCart size={80} style={{ margin: '0 auto 1.5rem', color: '#475569', opacity: 0.7 }} />
              <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#f1f5f9' }}>Your Cart is Empty</h1>
              <p style={{ fontSize: '1.1rem', color: '#cbd5e0', marginBottom: '1rem', maxWidth: '500px', margin: '0 auto' }}>
                Looks like you haven't added any products to your cart yet.
              </p>
              
              {!user && (
                <div style={{
                  margin: '1.5rem auto',
                  padding: '1rem',
                  background: 'rgba(59, 130, 246, 0.1)',
                  borderRadius: '10px',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  maxWidth: '400px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.5rem' }}>
                    <User size={20} color="#60a5fa" />
                    <span style={{ color: '#60a5fa', fontWeight: '500' }}>Login Benefits</span>
                  </div>
                  <ul style={{ textAlign: 'left', margin: '0', paddingLeft: '1.5rem', fontSize: '0.9rem', color: '#cbd5e0' }}>
                    <li>Save cart across devices</li>
                    <li>Faster checkout</li>
                    <li>Order history tracking</li>
                  </ul>
                </div>
              )}
              
              <button
                onClick={handleContinueShopping}
                style={{
                  background: 'linear-gradient(135deg, #8FB3E2 0%, #4096e2 100%)',
                  border: 'none',
                  color: 'white',
                  padding: '1rem 2.5rem',
                  borderRadius: '10px',
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                  marginTop: '1.5rem'
                }}
                onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
              >
                Browse Products
              </button>
            </div>
          </div>
        </div>

        <CheckoutModal
          isOpen={isCheckoutModalOpen}
          onClose={handleCheckoutModalClose}
          products={checkoutProducts}
          profile={completeProfile}
          onOrderSubmitted={handleOrderSubmitted}
        />
      </>
    );
  }

  return (
    <>
      <div className="cart-page" style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        color: 'white',
        paddingTop: '80px'
      }}>
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <button
                onClick={handleBack}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#8FB3E2',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '1rem',
                  cursor: 'pointer'
                }}
              >
                <ArrowLeft size={20} />
                Back
              </button>
              
              <button
                onClick={handleSyncCart}
                disabled={isSyncing}
                style={{
                  background: 'rgba(59, 130, 246, 0.2)',
                  border: '1px solid rgba(59, 130, 246, 0.5)',
                  color: '#60a5fa',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  cursor: isSyncing ? 'not-allowed' : 'pointer',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => !isSyncing && (e.target.style.background = 'rgba(59, 130, 246, 0.3)')}
                onMouseOut={(e) => !isSyncing && (e.target.style.background = 'rgba(59, 130, 246, 0.2)')}
              >
                <RefreshCw size={16} className={isSyncing ? 'spinning' : ''} />
                {isSyncing ? 'Syncing...' : 'Sync Cart'}
              </button>
              
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                background: 'rgba(30, 41, 59, 0.6)',
                borderRadius: '20px',
                border: `1px solid ${cartStatus === 'synced' ? '#10b981' : cartStatus === 'error' ? '#ef4444' : '#8FB3E2'}`
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: cartStatus === 'synced' ? '#10b981' : cartStatus === 'error' ? '#ef4444' : '#8FB3E2'
                }} />
                <span style={{ fontSize: '0.8rem', color: '#cbd5e0' }}>
                  {cartStatus === 'synced' ? (lastSynced ? `Synced ${lastSynced}` : 'Cloud Saved') : cartStatus === 'error' ? 'Sync Error' : 'Local Only'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <h1 style={{ fontSize: '2rem', margin: 0, color: '#f1f5f9' }}>
                Shopping Cart ({getTotalItems()} {getTotalItems() === 1 ? 'item' : 'items'})
              </h1>
              <button
                onClick={handleClearCart}
                style={{
                  background: 'none',
                  border: '1px solid #ef4444',
                  color: '#ef4444',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.1)'}
                onMouseOut={(e) => e.target.style.background = 'none'}
              >
                Clear All
              </button>
            </div>
          </div>

          {!user && (
            <div style={{
              marginBottom: '1.5rem',
              padding: '1rem 1.5rem',
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.2) 100%)',
              borderRadius: '12px',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.25rem' }}>
                  <User size={20} color="#60a5fa" />
                  <span style={{ color: '#f1f5f9', fontWeight: '500' }}>Save your cart permanently</span>
                </div>
                <p style={{ margin: 0, color: '#cbd5e0', fontSize: '0.9rem' }}>
                  Login to save your cart and access it from any device
                </p>
              </div>
              <button
                onClick={handleLoginToSaveCart}
                style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  border: 'none',
                  color: 'white',
                  padding: '0.6rem 1.2rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
              >
                <LogIn size={16} />
                Login Now
              </button>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem' }}>
            {/* Cart Items List */}
            <div>
              <div style={{
                background: 'rgba(30, 41, 59, 0.6)',
                borderRadius: '12px',
                border: '1px solid rgba(64, 150, 226, 0.3)',
                overflow: 'hidden'
              }}>
                {items.map((item, index) => {
                  const totalPrice = getItemTotalPrice(item);
                  const unitPrice = getUnitPriceDisplay(item);
                  const packageSize = item.selectedQuantity || 1;
                  const packageUnit = item.quantityUnit || 'kg';
                  const currencySymbol = getCurrencySymbol(item);
                  
                  return (
                    <div key={item.cartItemId || item.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '1.5rem',
                      borderBottom: index < items.length - 1 ? '1px solid rgba(64, 150, 226, 0.2)' : 'none',
                      gap: '1.5rem',
                      transition: 'background 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(30, 41, 59, 0.8)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <img 
                        src={item.image} 
                        alt={item.name} 
                        style={{ 
                          width: '100px', 
                          height: '100px', 
                          objectFit: 'cover', 
                          borderRadius: '10px',
                          border: '2px solid rgba(64, 150, 226, 0.3)'
                        }} 
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=500&auto=format&fit=crop&q=60';
                        }}
                      />
                      
                      <div style={{ flex: 1 }}>
                        <div style={{ margin: '0 0 0.5rem' }}>
                          <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'white' }}>
                            {item.name}
                          </div>
                          {item.selectedGradeDisplay && (
                            <div style={{ 
                              color: '#10b981', 
                              fontSize: '1rem', 
                              marginTop: '4px',
                              fontWeight: '500'
                            }}>
                              Grade: {item.selectedGradeDisplay}
                            </div>
                          )}
                        </div>
                        
                        <p style={{ margin: '0 0 0.5rem', color: '#94a3b8', fontSize: '0.95rem' }}>
                          {item.companyName} • {item.brandName || 'General'}
                        </p>
                        
                        {item.selectedPacking && (
                          <p style={{ margin: '0 0 0.25rem', color: '#60a5fa', fontSize: '0.9rem' }}>
                            Packing: {item.selectedPacking}
                          </p>
                        )}
                        
                        {item.selectedQuantity && (
                          <p style={{ margin: '0 0 0.5rem', color: '#60a5fa', fontSize: '0.9rem' }}>
                            Quantity: {item.selectedQuantity} {item.quantityUnit || 'kg'}
                          </p>
                        )}
                        
                        <p style={{ margin: '0 0 0.5rem', color: '#10b981', fontSize: '1.1rem', fontWeight: 'bold' }}>
                          {unitPrice}
                        </p>
                        
                        {item.synced && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: '#10b981' }}>
                            <Check size={12} />
                            <span>Synced</span>
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(15, 23, 42, 0.5)', padding: '0.5rem', borderRadius: '8px' }}>
                          <button 
                            onClick={() => handleQuantityChange(item.cartItemId, -1)}
                            style={{
                              background: 'none',
                              border: '1px solid #4096e2',
                              color: 'white',
                              width: '36px',
                              height: '36px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => e.target.style.background = 'rgba(64, 150, 226, 0.2)'}
                            onMouseOut={(e) => e.target.style.background = 'none'}
                          >
                            <Minus size={18} />
                          </button>
                          <span style={{ 
                            fontWeight: 'bold', 
                            minWidth: '30px', 
                            textAlign: 'center',
                            fontSize: '1.1rem',
                            color: 'white'
                          }}>
                            {item.quantity}
                          </span>
                          <button 
                            onClick={() => handleQuantityChange(item.cartItemId, 1)}
                            style={{
                              background: 'none',
                              border: '1px solid #4096e2',
                              color: 'white',
                              width: '36px',
                              height: '36px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => e.target.style.background = 'rgba(64, 150, 226, 0.2)'}
                            onMouseOut={(e) => e.target.style.background = 'none'}
                          >
                            <Plus size={18} />
                          </button>
                        </div>

                        <div style={{ textAlign: 'right', minWidth: '120px' }}>
                          {totalPrice.isRange ? (
                            <>
                              <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#10b981' }}>
                                {currencySymbol}{totalPrice.min} - {currencySymbol}{totalPrice.max}
                              </div>
                              <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                                {item.quantity} × {packageSize}{packageUnit}
                              </div>
                            </>
                          ) : (
                            <>
                              <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#10b981' }}>
                                {totalPrice.display || `${currencySymbol}${totalPrice.value}`}
                              </div>
                              <div style={{ fontSize: '0.9rem', color: '#94a3b8' }}>
                                {item.quantity} × {packageSize}{packageUnit}
                              </div>
                            </>
                          )}
                        </div>

                        <button 
                          onClick={() => removeFromCart(item.cartItemId)}
                          style={{
                            background: 'none',
                            border: '1px solid #ef4444',
                            color: '#ef4444',
                            width: '42px',
                            height: '42px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s'
                          }}
                          onMouseOver={(e) => {
                            e.target.style.background = 'rgba(239, 68, 68, 0.1)';
                          }}
                          onMouseOut={(e) => {
                            e.target.style.background = 'none';
                          }}
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                <button
                  onClick={handleContinueShopping}
                  style={{
                    background: 'none',
                    border: '2px solid #8FB3E2',
                    color: '#8FB3E2',
                    padding: '0.9rem 2rem',
                    borderRadius: '10px',
                    fontSize: '1.1rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.background = 'rgba(143, 179, 226, 0.1)';
                    e.target.style.transform = 'translateY(-2px)';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.background = 'none';
                    e.target.style.transform = 'translateY(0)';
                  }}
                >
                  Continue Shopping
                </button>
              </div>
            </div>

            {/* Order Summary */}
            <div style={{
              background: 'rgba(30, 41, 59, 0.6)',
              borderRadius: '12px',
              border: '1px solid rgba(64, 150, 226, 0.3)',
              padding: '2rem',
              height: 'fit-content',
              position: 'sticky',
              top: '100px'
            }}>
              <h2 style={{ margin: '0 0 1.5rem', color: '#f1f5f9', fontSize: '1.5rem' }}>Order Summary</h2>
              
              <div style={{ marginBottom: '1.5rem' }}>
                {items.map(item => {
                  const totalPrice = getItemTotalPrice(item);
                  const unitPrice = getUnitPriceDisplay(item);
                  const packageSize = item.selectedQuantity || 1;
                  const packageUnit = item.quantityUnit || 'kg';
                  const currencySymbol = getCurrencySymbol(item);
                  
                  return (
                    <div key={item.cartItemId || item.id} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '0.75rem',
                      paddingBottom: '0.75rem',
                      borderBottom: '1px solid rgba(64, 150, 226, 0.1)'
                    }}>
                      <div>
                        <div style={{ color: 'white', fontSize: '0.95rem' }}>
                          {item.name}
                          {item.selectedGradeDisplay && (
                            <span style={{ color: '#10b981', marginLeft: '4px' }}>
                              ({item.selectedGradeDisplay})
                            </span>
                          )}
                        </div>
                        <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                          Qty: {item.quantity} × {packageSize}{packageUnit} @ {unitPrice}
                        </div>
                      </div>
                      <div style={{ color: '#10b981', fontWeight: '500' }}>
                        {totalPrice.display || `${currencySymbol}${totalPrice.value}`}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ borderTop: '2px solid rgba(64, 150, 226, 0.3)', paddingTop: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <span style={{ color: '#cbd5e0' }}>Subtotal</span>
                  <span style={{ color: 'white', fontWeight: '500' }}>₹{totalPrice}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <span style={{ color: '#cbd5e0' }}>Shipping</span>
                  <span style={{ color: '#10b981' }}>Calculated at checkout</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <span style={{ color: '#cbd5e0' }}>Tax (10%)</span>
                  <span style={{ color: 'white', fontWeight: '500' }}>₹{taxAmount}</span>
                </div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  marginTop: '1.5rem',
                  paddingTop: '1rem',
                  borderTop: '2px solid rgba(64, 150, 226, 0.3)',
                  fontSize: '1.2rem'
                }}>
                  <span style={{ color: '#f1f5f9', fontWeight: 'bold' }}>Total</span>
                  <span style={{ color: '#10b981', fontWeight: 'bold', fontSize: '1.4rem' }}>
                    ₹{finalTotal}
                  </span>
                </div>
              </div>

              {/* Checkout Buttons */}
              <div style={{ marginTop: '2rem' }}>
                {user ? (
                  <button
                    onClick={handleCartCheckout}
                    disabled={isProcessing || isLoadingProfile}
                    style={{
                      background: isProcessing || isLoadingProfile
                        ? '#6b7280' 
                        : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      border: 'none',
                      color: 'white',
                      padding: '1.2rem',
                      borderRadius: '10px',
                      fontSize: '1.1rem',
                      fontWeight: '600',
                      cursor: (isProcessing || isLoadingProfile) ? 'not-allowed' : 'pointer',
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      transition: 'all 0.3s'
                    }}
                    onMouseOver={(e) => {
                      if (!isProcessing && !isLoadingProfile) {
                        e.target.style.transform = 'translateY(-3px)';
                        e.target.style.boxShadow = '0 10px 25px rgba(16, 185, 129, 0.3)';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!isProcessing && !isLoadingProfile) {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = 'none';
                      }
                    }}
                  >
                    {isProcessing ? (
                      <>
                        <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                        Processing...
                      </>
                    ) : isLoadingProfile ? (
                      <>
                        <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                        Loading Profile...
                      </>
                    ) : (
                      <>
                        <ShoppingBag size={24} />
                        Proceed to Checkout ({items.length} items)
                      </>
                    )}
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleGuestCheckout}
                      disabled={isProcessing}
                      style={{
                        background: isProcessing 
                          ? '#6b7280' 
                          : 'linear-gradient(135deg, #8FB3E2 0%, #4096e2 100%)',
                        border: 'none',
                        color: 'white',
                        padding: '1.2rem',
                        borderRadius: '10px',
                        fontSize: '1.1rem',
                        fontWeight: '600',
                        cursor: isProcessing ? 'not-allowed' : 'pointer',
                        width: '100%',
                        marginBottom: '1rem',
                        transition: 'all 0.3s'
                      }}
                      onMouseOver={(e) => {
                        if (!isProcessing) {
                          e.target.style.transform = 'translateY(-3px)';
                          e.target.style.boxShadow = '0 10px 25px rgba(64, 150, 226, 0.3)';
                        }
                      }}
                      onMouseOut={(e) => {
                        if (!isProcessing) {
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = 'none';
                        }
                      }}
                    >
                      {isProcessing ? 'Processing...' : `Checkout as Guest (${items.length} items)`}
                    </button>
                    
                    <button
                      onClick={handleLoginToSaveCart}
                      style={{
                        background: 'transparent',
                        border: '2px solid #10b981',
                        color: '#10b981',
                        padding: '1rem',
                        borderRadius: '10px',
                        fontSize: '1rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        width: '100%',
                        transition: 'all 0.3s'
                      }}
                      onMouseOver={(e) => {
                        e.target.style.background = 'rgba(16, 185, 129, 0.1)';
                        e.target.style.transform = 'translateY(-2px)';
                      }}
                      onMouseOut={(e) => {
                        e.target.style.background = 'transparent';
                        e.target.style.transform = 'translateY(0)';
                      }}
                    >
                      <LogIn size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                      Login & Save Cart
                    </button>
                  </>
                )}
              </div>

              <div style={{ 
                marginTop: '1rem', 
                padding: '0.75rem',
                background: 'rgba(16, 185, 129, 0.1)',
                borderRadius: '8px',
                border: '1px solid rgba(16, 185, 129, 0.2)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontSize: '0.9rem' }}>
                  <Check size={16} />
                  <span>Secure checkout • 30-day return policy • Free shipping on orders over ₹10,000</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          .spinning {
            animation: spin 1s linear infinite;
          }
          
          @keyframes slideIn {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
          
          .spinner-border {
            display: inline-block;
            width: 1rem;
            height: 1rem;
            vertical-align: text-bottom;
            border: 0.2em solid currentColor;
            border-right-color: transparent;
            border-radius: 50%;
            animation: spinner-border .75s linear infinite;
          }
          
          @keyframes spinner-border {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>

      <CheckoutModal
        isOpen={isCheckoutModalOpen}
        onClose={handleCheckoutModalClose}
        products={checkoutProducts}
        profile={completeProfile}
        onOrderSubmitted={handleOrderSubmitted}
      />
    </>
  );
};

export default CartPage;