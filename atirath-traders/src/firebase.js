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
  remove
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
   USER PROFILE (SIGNUP / USER SIDE) - FIXED VERSION
========================================================================== */

export const storeUserProfile = async (userData) => {
  try {
    console.log('🚀 Starting storeUserProfile with data:', userData);
    
    const userNumber = await getNextUserNumber();
    const userKey = `user-${userNumber}`;
    
    console.log('📊 Generated userKey:', userKey, 'userNumber:', userNumber);

    // Create complete profile object with ALL fields
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
      location: userData.location || '',
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

    console.log('💾 Full profile object to store:', profile);
    console.log('🔍 Checking critical fields:');
    console.log('- Phone:', profile.phone);
    console.log('- State:', profile.state);
    console.log('- City:', profile.city);
    console.log('- Pincode:', profile.pincode);
    console.log('- Country:', profile.country);
    console.log('- Location:', profile.location);

    // 🔐 Store in private users path
    console.log('📤 Storing in users/' + userKey);
    await set(ref(database, `users/${userKey}`), profile);

    // 👑 Store in admin view path
    console.log('📤 Storing in adminUsersView/' + userKey);
    await set(ref(database, `adminUsersView/${userKey}`), profile);

    console.log('✅ Successfully stored user profile in both paths');
    
    // Verify the write
    console.log('🔍 Verifying data was written...');
    const verifyRef = ref(database, `users/${userKey}`);
    const verifySnap = await get(verifyRef);
    
    if (verifySnap.exists()) {
      const verifiedData = verifySnap.val();
      console.log('✅ Verification successful! Retrieved data:', verifiedData);
      console.log('📋 Verified fields:');
      console.log('- Phone:', verifiedData.phone);
      console.log('- State:', verifiedData.state);
      console.log('- City:', verifiedData.city);
      console.log('- Pincode:', verifiedData.pincode);
      console.log('- Country:', verifiedData.country);
      console.log('- Location:', verifiedData.location);
    } else {
      console.error('❌ Verification failed: No data found at path');
    }

    return { success: true, userKey, userNumber };
  } catch (err) {
    console.error("❌ storeUserProfile error:", err);
    console.error("Error details:", err.message, err.stack);
    return { success: false, error: err.message };
  }
};

/* ==========================================================================
   USER SIDE READ / UPDATE (AUTH REQUIRED)
========================================================================== */

export const getUserProfile = async (uid) => {
  try {
    console.log('🔄 getUserProfile called for uid:', uid);
    
    const usersRef = ref(database, "users");
    const snap = await get(usersRef);
    
    if (!snap.exists()) {
      console.log('❌ No users found in database at all');
      return null;
    }

    const users = snap.val();
    console.log('📦 All users in database:', users);

    for (const key in users) {
      if (users[key].uid === uid) {
        const userData = users[key];
        console.log('✅ Found matching user with key:', key);
        console.log('📋 User data retrieved:', userData);
        
        // Ensure all fields are present with defaults
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
          location: userData.location || '',
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

        console.log('🔍 Complete user data for app:');
        console.log('- Phone:', completeUserData.phone);
        console.log('- State:', completeUserData.state);
        console.log('- City:', completeUserData.city);
        console.log('- Pincode:', completeUserData.pincode);
        console.log('- Country:', completeUserData.country);
        console.log('- Location:', completeUserData.location);
        
        return completeUserData;
      }
    }
    
    console.log('❌ No user found with uid:', uid);
    return null;
  } catch (err) {
    console.error("❌ getUserProfile error:", err);
    console.error("Error details:", err.message, err.stack);
    return null;
  }
};

export const updateLastLogin = async (uid) => {
  try {
    const usersRef = ref(database, "users");
    const snap = await get(usersRef);
    
    if (!snap.exists()) return;

    const users = snap.val();
    for (const key in users) {
      if (users[key].uid === uid) {
        const time = new Date().toISOString();
        console.log('🕒 Updating lastLogin for user:', key, 'to:', time);
        
        await update(ref(database, `users/${key}`), { lastLogin: time });
        await update(ref(database, `adminUsersView/${key}`), { lastLogin: time });
        
        console.log('✅ lastLogin updated successfully');
        return;
      }
    }
    
    console.log('❌ No user found to update lastLogin');
  } catch (err) {
    console.error("❌ updateLastLogin error:", err);
  }
};

export const updateUserProfile = async (authUid, newData) => {
  try {
    console.log('🔄 updateUserProfile called for uid:', authUid);
    console.log('📝 New data to update:', newData);

    const usersRef = ref(database, "users");
    const snap = await get(usersRef);
    
    if (!snap.exists()) {
      console.log('❌ No users found in database');
      return false;
    }

    const users = snap.val();
    let userKey = null;

    for (const key in users) {
      if (users[key].uid === authUid) {
        userKey = key;
        break;
      }
    }

    if (!userKey) {
      console.log('❌ No user found with uid:', authUid);
      return false;
    }

    console.log('✅ Found user with key:', userKey);

    const updateData = {
      name: newData.name || "",
      email: newData.email || "",
      phone: newData.phone || "",
      countryCode: newData.countryCode || "+91",
      country: newData.country || "",
      state: newData.state || "",
      city: newData.city || "",
      pincode: newData.pincode || "",
      location: newData.location || "",
      photoURL: newData.photoURL || "",
      updatedAt: new Date().toISOString()
    };

    console.log('📤 Updating user profile with data:', updateData);

    // 🔐 update private user data
    await update(ref(database, `users/${userKey}`), updateData);

    // 👑 sync admin view
    await update(ref(database, `adminUsersView/${userKey}`), updateData);

    console.log('✅ Profile updated successfully in both paths');
    return true;
  } catch (err) {
    console.error("❌ updateUserProfile error:", err);
    console.error("Error details:", err.message, err.stack);
    return false;
  }
};

/* ==========================================================================
   ADMIN PANEL (NO AUTH – HARD CODED ADMIN)
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
        
        await remove(ref(database, `users/${key}`));
        await remove(ref(database, `adminUsersView/${key}`));
        
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

export const migrateUsersToAdminView = async () => {
  try {
    console.log('🔄 migrateUsersToAdminView called');
    
    const snap = await get(ref(database, "users"));
    if (!snap.exists()) {
      console.log("❌ No users to migrate");
      return;
    }

    const users = snap.val();
    const updates = {};

    Object.keys(users).forEach(key => {
      updates[`adminUsersView/${key}`] = users[key];
    });

    console.log('📤 Migrating', Object.keys(users).length, 'users to adminUsersView');
    await update(ref(database), updates);
    
    console.log("✅ Users migrated to adminUsersView successfully");
  } catch (err) {
    console.error("❌ migrateUsersToAdminView error:", err);
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

export default { app, auth, database };