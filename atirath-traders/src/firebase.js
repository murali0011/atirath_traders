import { initializeApp, getApps } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged
} from "firebase/auth";
import {
  getDatabase,
  ref,
  set,
  update,
  get,
  push,
  onValue,
  remove,
  child
} from "firebase/database";

/* ==========================================================================
   FIREBASE CONFIG
========================================================================== */

const firebaseConfig = {
  apiKey: "AIzaSyD8m9qOEXrQi_Ni6oQACyds4e04Q5TN7Ak",
  authDomain: "at-getquote.firebaseapp.com",
  databaseURL: "https://at-getquote-default-rtdb.firebaseio.com",
  projectId: "at-getquote",
  storageBucket: "at-getquote.firebasestorage.app",
  messagingSenderId: "1040885819303",
  appId: "1:1040885819303:web:7da87bda72470a6f047882",
  measurementId: "G-TR3X4D09X6"
};

/* ==========================================================================
   INITIALIZE FIREBASE
========================================================================== */

let app, analytics, auth, database;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  database = getDatabase(app);

  isSupported().then((supported) => {
    if (supported) analytics = getAnalytics(app);
  });
} else {
  app = getApps()[0];
  auth = getAuth(app);
  database = getDatabase(app);
}

/* ==========================================================================
   HELPERS
========================================================================== */

const getNextUserNumber = async () => {
  try {
    const snap = await get(ref(database, "adminUsersView"));
    if (!snap.exists()) return 1;

    const data = snap.val();
    const keys = Object.keys(data);
    const nums = keys
      .filter(k => k.startsWith("user-"))
      .map(k => {
        const num = parseInt(k.replace("user-", ""));
        return isNaN(num) ? 0 : num;
      })
      .filter(n => n > 0);

    return nums.length ? Math.max(...nums) + 1 : 1;
  } catch (error) {
    console.error("Error getting next user number:", error);
    return 1;
  }
};

/* ==========================================================================
   USER PROFILE (SIGNUP / USER SIDE) - UPDATED WITH RETRY LOGIC
========================================================================== */

export const storeUserProfile = async (userData) => {
  console.log('🚀 START storeUserProfile:', new Date().toISOString());
  console.log('📦 User Data Received:', JSON.stringify(userData, null, 2));

  let retryCount = 0;
  const maxRetries = 3;
  
  const storeWithRetry = async () => {
    try {
      console.log(`🔄 Attempt ${retryCount + 1} to store user profile...`);
      
      const userNumber = await getNextUserNumber();
      const userKey = `user-${userNumber}`;
      
      console.log('📊 Generated userKey:', userKey, 'userNumber:', userNumber);

      // Create complete profile object with ALL fields - ENSURING NO MISSING FIELDS
      const profile = {
        uid: userData.uid || '',
        name: userData.name || '',
        email: userData.email || '',
        phone: userData.phone || '',
        countryCode: userData.countryCode || '+91',
        country: userData.country || 'India',
        state: userData.state || '',
        city: userData.city || '',
        pincode: userData.pincode || '',
        location: userData.location || `${userData.city || ''}, ${userData.state || ''}, ${userData.country || ''}`.replace(/^, /, '').replace(/, $/, ''),
        photoURL: userData.photoURL || '',
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userNumber: userNumber,
        userKey: userKey,
        accountStatus: "active",
        emailVerified: false,
        phoneVerified: false,
        orderCount: 0,
        totalSpent: 0,
        lastOrderDate: null
      };

      // Validate critical fields
      const criticalFields = ['phone', 'state', 'city', 'pincode', 'country'];
      const missingFields = criticalFields.filter(field => !profile[field] || profile[field].toString().trim() === '');
      
      if (missingFields.length > 0) {
        throw new Error(`Missing critical fields: ${missingFields.join(', ')}`);
      }

      console.log('✅ Profile object validated - all fields present');
      console.log('🔍 Profile details:');
      console.log('- Name:', profile.name);
      console.log('- Email:', profile.email);
      console.log('- Phone:', profile.phone, `(${profile.phone.length} chars)`);
      console.log('- Country Code:', profile.countryCode);
      console.log('- Country:', profile.country);
      console.log('- State:', profile.state);
      console.log('- City:', profile.city);
      console.log('- Pincode:', profile.pincode);
      console.log('- Location:', profile.location);

      // 1️⃣ Store in private users path with transaction-like safety
      console.log('📤 Writing to users/' + userKey);
      await set(ref(database, `users/${userKey}`), profile);
      console.log('✅ Successfully wrote to users/' + userKey);

      // 2️⃣ Store in admin view path
      console.log('📤 Writing to adminUsersView/' + userKey);
      await set(ref(database, `adminUsersView/${userKey}`), profile);
      console.log('✅ Successfully wrote to adminUsersView/' + userKey);

      // 3️⃣ Wait a moment for Firebase to sync
      await new Promise(resolve => setTimeout(resolve, 500));

      // 4️⃣ VERIFY THE WRITE - Double check both paths
      console.log('🔍 Verifying data in both paths...');
      
      // Verify users path
      const verifyUsersRef = ref(database, `users/${userKey}`);
      const verifyUsersSnap = await get(verifyUsersRef);
      
      if (!verifyUsersSnap.exists()) {
        throw new Error('Verification failed: No data found in users path');
      }
      
      const verifiedUsersData = verifyUsersSnap.val();
      console.log('✅ Verification SUCCESS in users path');
      
      // Verify adminUsersView path
      const verifyAdminRef = ref(database, `adminUsersView/${userKey}`);
      const verifyAdminSnap = await get(verifyAdminRef);
      
      if (!verifyAdminSnap.exists()) {
        throw new Error('Verification failed: No data found in adminUsersView path');
      }
      
      const verifiedAdminData = verifyAdminSnap.val();
      console.log('✅ Verification SUCCESS in adminUsersView path');

      // Check critical fields in both paths
      const verifyFields = ['phone', 'state', 'city', 'pincode'];
      let verificationPassed = true;
      
      verifyFields.forEach(field => {
        const usersValue = verifiedUsersData[field];
        const adminValue = verifiedAdminData[field];
        
        console.log(`🔬 Field ${field}: users=${usersValue}, admin=${adminValue}`);
        
        if (!usersValue || !adminValue || usersValue !== adminValue) {
          console.error(`❌ Field ${field} mismatch or missing`);
          verificationPassed = false;
        }
      });

      if (!verificationPassed) {
        throw new Error('Verification failed: Field mismatch between paths');
      }

      console.log('🎉 ALL VERIFICATIONS PASSED!');
      console.log('📋 Final verified data:');
      console.log('- Phone:', verifiedUsersData.phone, `(${verifiedUsersData.phone.length} chars)`);
      console.log('- State:', verifiedUsersData.state);
      console.log('- City:', verifiedUsersData.city);
      console.log('- Pincode:', verifiedUsersData.pincode);
      console.log('- Country:', verifiedUsersData.country);
      console.log('- Location:', verifiedUsersData.location);

      return { 
        success: true, 
        userKey, 
        userNumber,
        verifiedData: verifiedUsersData
      };

    } catch (err) {
      console.error(`❌ Attempt ${retryCount + 1} failed:`, err.message);
      
      if (retryCount < maxRetries) {
        retryCount++;
        console.log(`🔄 Retrying in 1 second (${retryCount}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return storeWithRetry();
      }
      
      throw err;
    }
  };

  try {
    const result = await storeWithRetry();
    console.log('🚀 END storeUserProfile - SUCCESS:', new Date().toISOString());
    return result;
  } catch (err) {
    console.error("❌ storeUserProfile FINAL ERROR:", err);
    console.error("Error stack:", err.stack);
    return { 
      success: false, 
      error: err.message,
      userData: userData
    };
  }
};

/* ==========================================================================
   ENHANCED GET USER PROFILE WITH FALLBACK LOGIC
========================================================================== */

export const getUserProfile = async (uid) => {
  console.log('🔄 getUserProfile called for uid:', uid);
  
  try {
    // Try multiple paths to find user data
    const pathsToCheck = [
      'users',
      'adminUsersView'
    ];
    
    for (const path of pathsToCheck) {
      console.log(`🔍 Searching in ${path}...`);
      
      const refPath = ref(database, path);
      const snap = await get(refPath);
      
      if (snap.exists()) {
        const users = snap.val();
        
        for (const key in users) {
          if (users[key].uid === uid) {
            const userData = users[key];
            console.log(`✅ Found user in ${path} with key:`, key);
            
            // Build complete user data with defaults
            const completeUserData = {
              uid: userData.uid || uid,
              name: userData.name || '',
              email: userData.email || '',
              phone: userData.phone || '',
              countryCode: userData.countryCode || '+91',
              country: userData.country || 'India',
              state: userData.state || '',
              city: userData.city || '',
              pincode: userData.pincode || '',
              location: userData.location || `${userData.city || ''}, ${userData.state || ''}, ${userData.country || 'India'}`,
              photoURL: userData.photoURL || '',
              createdAt: userData.createdAt || new Date().toISOString(),
              lastLogin: userData.lastLogin || new Date().toISOString(),
              updatedAt: userData.updatedAt || new Date().toISOString(),
              userKey: key,
              userNumber: userData.userNumber || 0,
              accountStatus: userData.accountStatus || 'active',
              emailVerified: userData.emailVerified || false,
              phoneVerified: userData.phoneVerified || false,
              orderCount: userData.orderCount || 0,
              totalSpent: userData.totalSpent || 0,
              lastOrderDate: userData.lastOrderDate || null
            };
            
            console.log('📋 Retrieved user data:');
            console.log('- Phone:', completeUserData.phone, completeUserData.phone ? `(${completeUserData.phone.length} chars)` : '(empty)');
            console.log('- State:', completeUserData.state || '(empty)');
            console.log('- City:', completeUserData.city || '(empty)');
            console.log('- Pincode:', completeUserData.pincode || '(empty)');
            console.log('- Country:', completeUserData.country || '(empty)');
            console.log('- Location:', completeUserData.location || '(empty)');
            
            return completeUserData;
          }
        }
      }
    }
    
    console.log('❌ No user found with uid:', uid, 'in any path');
    return null;
    
  } catch (err) {
    console.error("❌ getUserProfile error:", err);
    console.error("Error details:", err.message, err.stack);
    return null;
  }
};

/* ==========================================================================
   ENHANCED UPDATE LAST LOGIN
========================================================================== */

export const updateLastLogin = async (uid) => {
  try {
    console.log('🕒 Updating lastLogin for uid:', uid);
    
    const lastLoginTime = new Date().toISOString();
    
    // Find user in both paths
    const usersRef = ref(database, "users");
    const adminRef = ref(database, "adminUsersView");
    
    const [usersSnap, adminSnap] = await Promise.all([
      get(usersRef),
      get(adminRef)
    ]);
    
    let userKey = null;
    let updates = {};
    
    // Find in users path
    if (usersSnap.exists()) {
      const users = usersSnap.val();
      for (const key in users) {
        if (users[key].uid === uid) {
          userKey = key;
          updates[`users/${key}/lastLogin`] = lastLoginTime;
          break;
        }
      }
    }
    
    // Find in admin path
    if (adminSnap.exists() && userKey) {
      const adminUsers = adminSnap.val();
      if (adminUsers[userKey]) {
        updates[`adminUsersView/${userKey}/lastLogin`] = lastLoginTime;
      }
    }
    
    if (Object.keys(updates).length > 0) {
      console.log('📤 Updating lastLogin in paths:', Object.keys(updates));
      await update(ref(database), updates);
      console.log('✅ lastLogin updated successfully');
    } else {
      console.log('⚠️ No user found to update lastLogin');
    }
    
  } catch (err) {
    console.error("❌ updateLastLogin error:", err);
  }
};

/* ==========================================================================
   ROBUST UPDATE USER PROFILE
========================================================================== */

export const updateUserProfile = async (authUid, newData) => {
  console.log('🔄 updateUserProfile called for uid:', authUid);
  console.log('📝 New data:', newData);
  
  try {
    // Build complete update object
    const updateData = {
      name: newData.name || "",
      email: newData.email || "",
      phone: newData.phone || "",
      countryCode: newData.countryCode || "+91",
      country: newData.country || "",
      state: newData.state || "",
      city: newData.city || "",
      pincode: newData.pincode || "",
      location: newData.location || `${newData.city || ''}, ${newData.state || ''}, ${newData.country || ''}`,
      photoURL: newData.photoURL || "",
      updatedAt: new Date().toISOString()
    };
    
    console.log('📤 Update data prepared:', updateData);
    
    // Find user in database
    const usersRef = ref(database, "users");
    const adminRef = ref(database, "adminUsersView");
    
    const [usersSnap, adminSnap] = await Promise.all([
      get(usersRef),
      get(adminRef)
    ]);
    
    let userKey = null;
    let updates = {};
    
    // Check users path
    if (usersSnap.exists()) {
      const users = usersSnap.val();
      for (const key in users) {
        if (users[key].uid === authUid) {
          userKey = key;
          break;
        }
      }
    }
    
    if (!userKey) {
      console.log('❌ User not found in users path, checking admin path...');
      if (adminSnap.exists()) {
        const adminUsers = adminSnap.val();
        for (const key in adminUsers) {
          if (adminUsers[key].uid === authUid) {
            userKey = key;
            break;
          }
        }
      }
    }
    
    if (!userKey) {
      console.error('❌ No user found with uid:', authUid);
      return false;
    }
    
    console.log('✅ Found user with key:', userKey);
    
    // Prepare updates for both paths
    updates[`users/${userKey}`] = updateData;
    updates[`adminUsersView/${userKey}`] = updateData;
    
    // Perform atomic update
    console.log('📤 Performing atomic update on both paths...');
    await update(ref(database), updates);
    
    console.log('✅ Profile updated successfully');
    
    // Verify update
    const verifyRef = ref(database, `users/${userKey}`);
    const verifySnap = await get(verifyRef);
    
    if (verifySnap.exists()) {
      const verified = verifySnap.val();
      console.log('🔍 Update verified:');
      console.log('- Phone:', verified.phone);
      console.log('- State:', verified.state);
      console.log('- City:', verified.city);
      console.log('- Pincode:', verified.pincode);
    }
    
    return true;
    
  } catch (err) {
    console.error("❌ updateUserProfile error:", err);
    console.error("Error details:", err.message, err.stack);
    return false;
  }
};

/* ==========================================================================
   ADMIN PANEL FUNCTIONS
========================================================================== */

export const getAllUsers = async () => {
  try {
    console.log('🔄 getAllUsers called');
    
    const snap = await get(ref(database, "adminUsersView"));
    if (!snap.exists()) {
      console.log('❌ No users found in adminUsersView');
      return [];
    }

    const data = snap.val();
    const usersArray = Object.keys(data).map(key => ({
      userKey: key,
      ...data[key]
    })).sort((a, b) =>
      new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );

    console.log('✅ Retrieved', usersArray.length, 'users from adminUsersView');
    return usersArray;
  } catch (err) {
    console.error("❌ getAllUsers error:", err);
    throw err;
  }
};

export const deleteUser = async (uid) => {
  try {
    console.log('🔄 deleteUser called for uid:', uid);
    
    const snap = await get(ref(database, "users"));
    if (!snap.exists()) {
      console.log('❌ No users found in database');
      return false;
    }

    const users = snap.val();
    for (const key in users) {
      if (users[key].uid === uid) {
        console.log('✅ Found user to delete with key:', key);
        
        // Delete from both paths atomically
        const updates = {};
        updates[`users/${key}`] = null;
        updates[`adminUsersView/${key}`] = null;
        
        await update(ref(database), updates);
        
        console.log('✅ User deleted successfully from both paths');
        return true;
      }
    }
    
    console.log('❌ No user found with uid:', uid);
    return false;
  } catch (err) {
    console.error("❌ deleteUser error:", err);
    return false;
  }
};

/* ==========================================================================
   QUOTES / ORDERS
========================================================================== */

export const submitQuote = async (data) => {
  try {
    console.log('🔄 submitQuote called with data:', data);
    
    const quoteRef = push(ref(database, "quotes"));
    const quoteData = {
      ...data,
      id: quoteRef.key,
      status: "pending",
      createdAt: new Date().toISOString()
    };
    
    console.log('📤 Storing quote data:', quoteData);
    await set(quoteRef, quoteData);
    
    console.log('✅ Quote submitted successfully with ID:', quoteRef.key);
    return quoteRef.key;
  } catch (err) {
    console.error("❌ submitQuote error:", err);
    throw err;
  }
};

/* ==========================================================================
   DATA MIGRATION & REPAIR UTILITIES
========================================================================== */

export const repairUserData = async (uid) => {
  console.log('🔧 Repairing user data for uid:', uid);
  
  try {
    // First, find the user
    const user = await getUserProfile(uid);
    
    if (!user) {
      console.log('❌ User not found for repair');
      return false;
    }
    
    console.log('🔍 User data found:', user);
    
    // Check for missing critical fields
    const criticalFields = ['phone', 'state', 'city', 'pincode', 'country'];
    const missingFields = criticalFields.filter(field => !user[field] || user[field].toString().trim() === '');
    
    if (missingFields.length === 0) {
      console.log('✅ No missing fields found');
      return true;
    }
    
    console.log('⚠️ Missing fields:', missingFields);
    
    // Try to repair from signup form data in localStorage
    if (typeof window !== 'undefined') {
      const signupData = localStorage.getItem('signupFormData');
      if (signupData) {
        const formData = JSON.parse(signupData);
        console.log('🔍 Found signup form data in localStorage:', formData);
        
        // Update missing fields from form data
        const repairData = {};
        missingFields.forEach(field => {
          if (formData[field]) {
            repairData[field] = formData[field];
            console.log(`🔄 Repairing ${field} from form data:`, formData[field]);
          }
        });
        
        if (Object.keys(repairData).length > 0) {
          repairData.location = `${repairData.city || user.city}, ${repairData.state || user.state}, ${repairData.country || user.country}`;
          repairData.updatedAt = new Date().toISOString();
          
          console.log('📤 Repair data:', repairData);
          await updateUserProfile(uid, repairData);
          
          console.log('✅ User data repaired successfully');
          return true;
        }
      }
    }
    
    console.log('⚠️ Could not repair missing fields');
    return false;
    
  } catch (err) {
    console.error("❌ repairUserData error:", err);
    return false;
  }
};

export const verifyAndRepairAllUsers = async () => {
  console.log('🔧 Starting verification and repair of all users...');
  
  try {
    const users = await getAllUsers();
    console.log(`🔍 Checking ${users.length} users`);
    
    let repairedCount = 0;
    let errors = [];
    
    for (const user of users) {
      try {
        const criticalFields = ['phone', 'state', 'city', 'pincode', 'country'];
        const missingFields = criticalFields.filter(field => !user[field] || user[field].toString().trim() === '');
        
        if (missingFields.length > 0) {
          console.log(`⚠️ User ${user.email} missing fields:`, missingFields);
          
          // Try to repair
          const repaired = await repairUserData(user.uid);
          if (repaired) {
            repairedCount++;
          }
        }
      } catch (err) {
        errors.push({ user: user.email, error: err.message });
        console.error(`❌ Error checking user ${user.email}:`, err.message);
      }
    }
    
    console.log(`✅ Verification complete. Repaired ${repairedCount} users.`);
    if (errors.length > 0) {
      console.log(`❌ Errors:`, errors);
    }
    
    return { repairedCount, errors };
    
  } catch (err) {
    console.error("❌ verifyAndRepairAllUsers error:", err);
    throw err;
  }
};

/* ==========================================================================
   EXPORTS
========================================================================== */

export {
  // Core
  app,
  auth,
  database,

  // Database helpers
  ref,
  get,
  set,
  update,
  remove,
  push,
  onValue,

  // Auth helpers
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
};

// Default export
export default { 
  app, 
  auth, 
  database,
  storeUserProfile,
  getUserProfile,
  updateUserProfile,
  updateLastLogin,
  getAllUsers,
  deleteUser,
  submitQuote,
  repairUserData,
  verifyAndRepairAllUsers
};