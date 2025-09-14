// app.js
import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  addDoc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Firebase config (already set in firebase-config.js)
import {
  firebaseConfig
} from "./firebase-config.js";

// Init Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ================= AUTH =================
const provider = new GoogleAuthProvider();

async function registerWithEmail(email, password, name, phone) {
  try {
    const userCred = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, "users", userCred.user.uid), {
      uid: userCred.user.uid,
      name,
      phone,
      email,
      balance: 0,
      role: "user",
      avatar: ""
    });
  } catch (err) {
    alert(err.message);
  }
}

async function loginWithEmail(email, password) {
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    alert(err.message);
  }
}

async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, provider);
    const userRef = doc(db, "users", result.user.uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      await setDoc(userRef, {
        uid: result.user.uid,
        name: result.user.displayName,
        email: result.user.email,
        balance: 0,
        role: "user",
        avatar: result.user.photoURL
      });
    }
  } catch (err) {
    alert(err.message);
  }
}

function logout() {
  signOut(auth);
}

// ================= USER DASHBOARD =================
async function loadDashboard(user) {
  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);
  if (snap.exists()) {
    const u = snap.data();
    document.getElementById("userName").innerText = u.name;
    document.getElementById("userRole").innerText = u.role;
    document.getElementById("userEmail").innerText = u.email;
    document.getElementById("userPhone").innerText = u.phone;
    document.getElementById("userBalance").innerText = u.balance;
    if (u.avatar) document.getElementById("userAvatar").src = u.avatar;
  }
}

// ================= ORDERS =================
async function placeOrder(amount, recipient) {
  const user = auth.currentUser;
  if (!user) return alert("Please login first");

  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return alert("User not found");

  const u = snap.data();
  if (u.balance < amount) {
    return alert("Insufficient balance!");
  }

  const order = {
    userId: user.uid,
    recipient,
    amount,
    status: "Waiting",
    time: new Date().toISOString()
  };

  await addDoc(collection(db, "orders"), order);
  alert("Order placed successfully!");
}

function loadOrderHistory() {
  const user = auth.currentUser;
  if (!user) return;

  const q = query(
    collection(db, "orders"),
    where("userId", "==", user.uid),
    orderBy("time", "desc")
  );

  onSnapshot(q, snapshot => {
    let html = "";
    snapshot.forEach(docu => {
      const o = docu.data();
      html += `
        <tr>
          <td>${docu.id}</td>
          <td>${o.recipient}</td>
          <td>${o.amount}</td>
          <td>${new Date(o.time).toLocaleString()}</td>
          <td>${o.status}</td>
        </tr>`;
    });
    const table = document.getElementById("orderHistoryTable");
    if (table) table.innerHTML = html;
  });
}

// ================= ADMIN PANEL =================
function loadAllOrders() {
  const q = query(collection(db, "orders"), orderBy("time", "desc"));
  onSnapshot(q, snapshot => {
    let html = "";
    snapshot.forEach(docu => {
      const o = docu.data();
      html += `
        <tr>
          <td>${docu.id}</td>
          <td>${o.recipient}</td>
          <td>${o.amount}</td>
          <td>${new Date(o.time).toLocaleString()}</td>
          <td>
            <select onchange="updateOrderStatus('${docu.id}', this.value)">
              <option value="Waiting" ${o.status === "Waiting" ? "selected" : ""}>Waiting</option>
              <option value="Complete" ${o.status === "Complete" ? "selected" : ""}>Complete</option>
              <option value="Cancel" ${o.status === "Cancel" ? "selected" : ""}>Cancel</option>
            </select>
          </td>
        </tr>`;
    });
    const table = document.getElementById("adminOrdersTable");
    if (table) table.innerHTML = html;
  });
}

async function updateOrderStatus(orderId, newStatus) {
  const orderRef = doc(db, "orders", orderId);
  const snap = await getDoc(orderRef);
  if (!snap.exists()) return;

  const order = snap.data();
  const userRef = doc(db, "users", order.userId);

  if (newStatus === "Complete") {
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const bal = userSnap.data().balance - order.amount;
      await updateDoc(userRef, { balance: bal });
    }
  } else if (newStatus === "Cancel") {
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const bal = userSnap.data().balance + order.amount;
      await updateDoc(userRef, { balance: bal });
    }
  }

  await updateDoc(orderRef, { status: newStatus });
}

// ================= SIDEBAR + NAV =================
function toggleSidebar() {
  document.querySelector(".sidebar").classList.toggle("active");
}

// ================= AUTH LISTENER =================
onAuthStateChanged(auth, (user) => {
  if (user) {
    // load dashboard if available
    if (document.getElementById("userName")) {
      loadDashboard(user);
    }
    if (document.getElementById("orderHistoryTable")) {
      loadOrderHistory();
    }
    if (document.getElementById("adminOrdersTable")) {
      loadAllOrders();
    }

    document.getElementById("loginToggle").innerText = "Logout";
    document.getElementById("loginToggle").onclick = logout;
  } else {
    document.getElementById("loginToggle").innerText = "Login";
    document.getElementById("loginToggle").onclick = () => {
      window.location.href = "index.html";
    };
  }
});

// ================= GLOBAL ACCESS =================
window.registerWithEmail = registerWithEmail;
window.loginWithEmail = loginWithEmail;
window.loginWithGoogle = loginWithGoogle;
window.logout = logout;
window.placeOrder = placeOrder;
window.toggleSidebar = toggleSidebar;
window.updateOrderStatus = updateOrderStatus;