// =========================
// Firebase Auth + Firestore
// =========================
const auth = firebase.auth();
const db = firebase.firestore();

// =========================
// Sidebar Toggle
// =========================
const menuToggle = document.getElementById("menuToggle");
if (menuToggle) {
  menuToggle.addEventListener("click", () => {
    document.getElementById("sidebar").classList.toggle("open");
  });
}

// =========================
// Auth State Listener
// =========================
auth.onAuthStateChanged(async (user) => {
  if (user) {
    console.log("✅ Logged in:", user.email);

    try {
      // Firestore থেকে user document আনুন
      const userRef = db.collection("users").doc(user.uid);
      const snap = await userRef.get();

      if (snap.exists) {
        const data = snap.data();

        // Dashboard/Profile Page এ ইনফো বসানো
        if (document.getElementById("displayName")) {
          document.getElementById("displayName").textContent =
            data.displayName || user.displayName || "No Name";
        }
        if (document.getElementById("role")) {
          document.getElementById("role").textContent = data.role || "user";
        }
        if (document.getElementById("emailInfo")) {
          document.getElementById("emailInfo").textContent = user.email || "-";
        }
        if (document.getElementById("phoneInfo")) {
          document.getElementById("phoneInfo").textContent = data.phone || "-";
        }
        if (document.getElementById("balanceInfo")) {
          document.getElementById("balanceInfo").textContent =
            "Balance: " + (data.balance || 0);
        }
        if (document.getElementById("weeklyCompleted")) {
          document.getElementById("weeklyCompleted").textContent =
            "Weekly Completed: " + (data.weeklyCompleted || 0);
        }
        if (document.getElementById("avatar")) {
          document.getElementById("avatar").src =
            data.avatar || "https://via.placeholder.com/80";
        }

        // Admin link visible if role=admin
        if (data.role === "admin" && document.getElementById("adminLink")) {
          document.getElementById("adminLink").style.display = "block";
        }

        // Order History Page হলে
        if (document.getElementById("ordersTableBody")) {
          loadOrders(user.uid);
        }
      } else {
        console.warn("⚠️ User document not found in Firestore");
      }

      // logout button দেখানো
      if (document.getElementById("logoutBtn")) {
        document.getElementById("logoutBtn").style.display = "block";
      }
    } catch (err) {
      console.error("❌ Error fetching user data:", err);
    }
  } else {
    console.log("❌ No user logged in");
    // Auth required pages হলে redirect করুন
    if (
      location.pathname.includes("dashboard") ||
      location.pathname.includes("order-history") ||
      location.pathname.includes("admin")
    ) {
      window.location.href = "login.html";
    }
  }
});

// =========================
// Logout
// =========================
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    auth.signOut().then(() => {
      window.location.href = "login.html";
    });
  });
}

// =========================
// Load Orders (for order-history.html)
// =========================
async function loadOrders(uid) {
  const ordersTableBody = document.getElementById("ordersTableBody");
  if (!ordersTableBody) return;

  try {
    const snap = await db.collection("users").doc(uid).get();
    if (snap.exists) {
      let orders = snap.data().orders || [];
      orders = orders.reverse().slice(0, 20); // সর্বশেষ ২০টা অর্ডার

      if (orders.length > 0) {
        ordersTableBody.innerHTML = "";
        orders.forEach((order, index) => {
          const row = `
            <tr>
              <td>${index + 1}</td>
              <td>${order.profileId || "-"}</td>
              <td>${order.amount || "-"}</td>
              <td>${order.method || "-"}</td>
              <td>${order.account || "-"}</td>
              <td>${order.txid || "-"}</td>
              <td>${order.status || "-"}</td>
            </tr>
          `;
          ordersTableBody.innerHTML += row;
        });
      } else {
        ordersTableBody.innerHTML =
          "<tr><td colspan='7'>No orders found</td></tr>";
      }
    }
  } catch (err) {
    console.error("❌ Error loading orders:", err);
    ordersTableBody.innerHTML =
      "<tr><td colspan='7'>Error loading orders</td></tr>";
  }
}
