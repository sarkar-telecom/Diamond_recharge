// =========================
// Firebase Auth + Firestore
// =========================
const auth = firebase.auth();
const db = firebase.firestore();

// Sidebar toggle
document.addEventListener("DOMContentLoaded", () => {
  const menuToggle = document.getElementById("menuToggle");
  const sidebar = document.getElementById("sidebar");
  if (menuToggle && sidebar) {
    menuToggle.addEventListener("click", () => {
      sidebar.classList.toggle("open");
    });
  }
});

// Auth state listener
auth.onAuthStateChanged(async (user) => {
  const authToggle = document.getElementById("authToggle");
  const logoutBtn = document.getElementById("logoutBtn");
  const profileMini = document.getElementById("profileMini");
  const adminLink = document.getElementById("adminLink");

  if (user) {
    if (authToggle) authToggle.innerHTML = `<span>${user.email}</span>`;
    if (logoutBtn) logoutBtn.style.display = "block";

    // Load user profile
    try {
      const userDoc = await db.collection("users").doc(user.uid).get();
      if (userDoc.exists) {
        const data = userDoc.data();
        if (profileMini) {
          profileMini.innerHTML = `
            <img src="${data.avatar || 'img/default.png'}" class="avatar-mini"/>
            <span>${data.displayName || user.email}</span>
          `;
        }
        if (adminLink && data.role === "admin") {
          adminLink.style.display = "block";
        }
      }
    } catch (err) {
      console.error("Error loading user profile:", err);
    }

    // যদি order-history page এ থাকি → order লোড করব
    if (document.getElementById("ordersTableBody")) {
      loadOrdersFromCollection(user.uid);
    }

  } else {
    if (authToggle) authToggle.innerHTML = `<a href="login.html">Login</a>`;
    if (logoutBtn) logoutBtn.style.display = "none";
  }
});

// Logout
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    auth.signOut();
    window.location.href = "login.html";
  });
}

// =========================
// Load Orders (user-specific)
// =========================
async function loadOrdersFromCollection(uid) {
  const ordersTableBody = document.getElementById("ordersTableBody");
  if (!ordersTableBody) return;

  ordersTableBody.innerHTML = "<tr><td colspan='7'>Loading...</td></tr>";

  try {
    const ordersSnapshot = await db
      .collection("orders")
      .where("userId", "==", uid)
      .orderBy("createdAt", "desc")
      .limit(20)
      .get();

    if (!ordersSnapshot.empty) {
      ordersTableBody.innerHTML = "";
      let index = 1;
      ordersSnapshot.forEach(doc => {
        const order = doc.data();
        const row = `
          <tr>
            <td>${index}</td>
            <td>${order.profileId || "-"}</td>
            <td>${order.amount || "-"}</td>
            <td>${order.method || "-"}</td>
            <td>${order.account || "-"}</td>
            <td>${order.txid || "-"}</td>
            <td>${order.status || "-"}</td>
          </tr>
        `;
        ordersTableBody.innerHTML += row;
        index++;
      });
    } else {
      ordersTableBody.innerHTML = "<tr><td colspan='7'>No orders found</td></tr>";
    }
  } catch (err) {
    console.error("Error loading from orders collection:", err);
    ordersTableBody.innerHTML = "<tr><td colspan='7'>Error loading orders</td></tr>";
  }
}
