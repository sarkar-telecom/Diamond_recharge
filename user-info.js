import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

export function initUserInfo() {
  const userBox = document.getElementById("userBox");
  const profilePic = document.getElementById("profilePic");

  onAuthStateChanged(auth, async(user)=>{
    if(user){
      const userDoc = doc(db,"users",user.uid);
      const snap = await getDoc(userDoc);
      const data = snap.exists()?snap.data():{};
      const avatar = data.avatar || user.photoURL || "https://via.placeholder.com/70";
      const name = data.name || user.displayName || "Guest User";
      const role = data.role || "User";
      const email = user.email || "";
      const phone = data.phone || "N/A";
      const balance = data.balance !== undefined?data.balance:"0";

      profilePic.src = avatar;

      if(userBox) {
        userBox.innerHTML = `
          <img src="${avatar}" alt="Avatar">
          <h3>${name}</h3>
          <p>🧖‍♂️ Role: ${role}</p>
          <p>📞 ${phone}</p>
          <p>✉ ${email}</p>
          <p>💎 Balance: ${balance}</p>
        `;
      }

      // Logout buttons
      const logoutBtns = document.querySelectorAll("#logoutBtn, #logoutBtn2");
      logoutBtns.forEach(btn=>btn.addEventListener("click", ()=>{
        signOut(auth).then(()=>window.location.href="login.html");
      }));

    }else{
      // If not logged in, redirect to login
      window.location.href="login.html";
    }
  });
}