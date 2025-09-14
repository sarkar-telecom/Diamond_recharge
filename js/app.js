console.log("App loaded");
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

const packages = [10,50,100,200,500,1000,2000,5000,10000,20000];

// UI elements
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.getElementById('sidebar');
const logoutBtn = document.getElementById('logoutBtn');
const authToggle = document.getElementById && document.getElementById('authToggle');

if(menuToggle){
  menuToggle.addEventListener('click', ()=> sidebar.classList.toggle('open'));
}

// Helper: get current path
const path = location.pathname.split('/').pop();

// Render packages (on order page)
function renderPackages(){
  const container = document.getElementById('packages');
  if(!container) return;
  container.innerHTML = '';
  packages.forEach(a=>{
    const b = document.createElement('button');
    b.className='package';
    b.textContent = a+' diamonds';
    b.onclick = ()=> {
      document.getElementById('customAmount').value = a;
    };
    container.appendChild(b);
  });
}
renderPackages();

// Auth UI
const emailInput = document.getElementById('email');
const passInput = document.getElementById('password');
const btnLogin = document.getElementById('btnLogin');
const btnRegister = document.getElementById('btnRegister');
const googleBtn = document.getElementById('googleBtn');

if(btnLogin) btnLogin.onclick = async ()=> {
  try{
    await auth.signInWithEmailAndPassword(emailInput.value, passInput.value);
  }catch(e){ alert(e.message) }
};
if(btnRegister) btnRegister.onclick = async ()=> {
  try{
    const res = await auth.createUserWithEmailAndPassword(emailInput.value, passInput.value);
    // create user doc
    await db.collection('users').doc(res.user.uid).set({
      name: res.user.displayName || emailInput.value.split('@')[0],
      email: res.user.email,
      phone: '',
      balance: 0,
      role: 'user',
      avatar: res.user.photoURL || ''
    });
  }catch(e){ alert(e.message) }
};
if(googleBtn) googleBtn.onclick = async ()=> {
  const provider = new firebase.auth.GoogleAuthProvider();
  try{
    const res = await auth.signInWithPopup(provider);
    // ensure user doc exists
    const uref = db.collection('users').doc(res.user.uid);
    const doc = await uref.get();
    if(!doc.exists){
      await uref.set({
        name: res.user.displayName || res.user.email.split('@')[0],
        email: res.user.email,
        phone: '',
        balance: 0,
        role: 'user',
        avatar: res.user.photoURL || ''
      });
    }
  }catch(e){ alert(e.message) }
};

// Logout
if(logoutBtn) logoutBtn.onclick = ()=> auth.signOut();

// Observe auth state
auth.onAuthStateChanged(async user=>{
  const profileMini = document.getElementById('profileMini');
  const profileCard = document.getElementById('profileCard');
  const displayName = document.getElementById('displayName');
  const roleEl = document.getElementById('role');
  const emailInfo = document.getElementById('emailInfo');
  const phoneInfo = document.getElementById('phoneInfo');
  const balanceInfo = document.getElementById('balanceInfo');
  const avatar = document.getElementById('avatar');
  const adminLink = document.getElementById('adminLink');

  if(user){
    // show logout
    if(logoutBtn) logoutBtn.style.display = 'block';
    if(document.getElementById('authToggle')) document.getElementById('authToggle').textContent = 'Logged in';

    // fetch user doc
    const udoc = await db.collection('users').doc(user.uid).get();
    if(udoc.exists){
      const data = udoc.data();
      if(profileMini) profileMini.innerHTML = `<img src="${data.avatar||''}" style="width:44px;height:44px;border-radius:8px;margin-right:8px" /> <div><strong>${data.name}</strong><br/><small>${data.email}</small></div>`;
      if(displayName) displayName.textContent = data.name;
      if(roleEl) roleEl.textContent = 'Role: '+data.role;
      if(emailInfo) emailInfo.textContent = 'Email: '+data.email;
      if(phoneInfo) phoneInfo.textContent = 'Phone: '+(data.phone||'not set');
      if(balanceInfo) balanceInfo.textContent = 'Balance: '+(data.balance||0)+' ৳';
      if(avatar) avatar.src = data.avatar||'https://via.placeholder.com/72';
      if(data.role === 'admin'){
        if(adminLink) adminLink.style.display = 'block';
      }else{
        if(adminLink) adminLink.style.display = 'none';
      }

      // weekly completed orders count
      const oneWeekAgo = new Date(Date.now() - 7*24*3600*1000);
      const ordersSnapshot = await db.collection('orders')
        .where('userId','==',user.uid).where('status','==','Complete')
        .where('time','>=', firebase.firestore.Timestamp.fromDate(oneWeekAgo)).get();
      const weekly = ordersSnapshot.size;
      const weeklyEl = document.getElementById('weeklyCompleted');
      if(weeklyEl) weeklyEl.textContent = 'Weekly Completed: '+weekly;
    }

    // show user-specific pages
    if(path === 'order.html'){
      // place order
      const btnPlace = document.getElementById('btnPlaceOrder');
      if(btnPlace) btnPlace.onclick = async ()=>{
        const recipient = document.getElementById('recipient').value.trim();
        let amount = parseInt(document.getElementById('customAmount').value || '0',10);
        if(!recipient || !amount || amount<=0){ alert('Enter recipient and amount'); return; }
        // check balance
        const uref = db.collection('users').doc(user.uid);
        const udoc2 = await uref.get();
        const ubal = (udoc2.exists && udoc2.data().balance) ? udoc2.data().balance : 0;
        if(ubal < amount){ alert('Insufficient balance. Contact admin.'); return; }
        // create order with Waiting status. Deduction will happen when admin marks Complete.
        const ord = {
          userId: user.uid,
          recipientNumber: recipient,
          diamondAmount: amount,
          time: firebase.firestore.Timestamp.now(),
          status: 'Waiting'
        };
        const oref = await db.collection('orders').add(ord);
        document.getElementById('orderMsg').textContent = 'Order placed. Order ID: '+oref.id;
        document.getElementById('recipient').value='';
        document.getElementById('customAmount').value='';
      };
    }

    if(path === 'history.html'){
      const list = document.getElementById('ordersList');
      if(list){
        list.innerHTML = '';
        const snapshot = await db.collection('orders').where('userId','==',user.uid).orderBy('time','desc').get();
        snapshot.forEach(doc=>{
          const d = doc.data();
          const el = document.createElement('div');
          el.className = 'order-item';
          el.innerHTML = `<strong>Order ID:</strong> ${doc.id}<br/>
          <strong>Recipient:</strong> ${d.recipientNumber}<br/>
          <strong>Amount:</strong> ${d.diamondAmount}<br/>
          <strong>Time:</strong> ${d.time.toDate().toLocaleString()}<br/>
          <strong>Status:</strong> ${d.status}`;
          list.appendChild(el);
        });
      }
    }

    if(path === 'admin.html' && udoc.exists && udoc.data().role === 'admin'){
      // show all orders and users
      const allOrdersDiv = document.getElementById('allOrders');
      const allUsersDiv = document.getElementById('allUsers');
      // orders
      const ordersSnap = await db.collection('orders').orderBy('time','desc').get();
      allOrdersDiv.innerHTML = '';
      ordersSnap.forEach(async doc=>{
        const d = doc.data();
        const u = await db.collection('users').doc(d.userId).get();
        const username = u.exists ? u.data().name : d.userId;
        const row = document.createElement('div');
        row.className='order-item';
        row.innerHTML = `<strong>${doc.id}</strong> — ${username} — ${d.recipientNumber} — ${d.diamondAmount} — ${d.status} <br/>
          <button data-id="${doc.id}" class="markComplete">Mark Complete</button>
          <button data-id="${doc.id}" class="markCancel">Cancel</button>`;
        allOrdersDiv.appendChild(row);
      });
      allOrdersDiv.querySelectorAll('.markComplete').forEach(b=>{
        b.onclick = async (e)=>{
          const id = e.target.dataset.id;
          const ordRef = db.collection('orders').doc(id);
          const ordDoc = await ordRef.get();
          if(!ordDoc.exists) return;
          const ordData = ordDoc.data();
          if(ordData.status === 'Complete'){ alert('Already complete'); return; }
          // deduct balance from user
          const uRef = db.collection('users').doc(ordData.userId);
          await db.runTransaction(async tx=>{
            const userDoc = await tx.get(uRef);
            if(!userDoc.exists) throw 'User not found';
            const bal = userDoc.data().balance || 0;
            if(bal < ordData.diamondAmount) throw 'Insufficient balance to complete';
            tx.update(uRef, { balance: bal - ordData.diamondAmount });
            tx.update(ordRef, { status: 'Complete' });
          }).then(()=> alert('Marked Complete and deducted balance'))
            .catch(e=> alert('Error: '+e));
        };
      });
      allOrdersDiv.querySelectorAll('.markCancel').forEach(b=>{
        b.onclick = async (e)=>{
          const id = e.target.dataset.id;
          const ordRef = db.collection('orders').doc(id);
          const ordDoc = await ordRef.get();
          if(!ordDoc.exists) return;
          const ordData = ordDoc.data();
          if(ordData.status === 'Cancel'){ alert('Already cancelled'); return; }
          // refund balance to user
          const uRef = db.collection('users').doc(ordData.userId);
          await db.runTransaction(async tx=>{
            const userDoc = await tx.get(uRef);
            if(!userDoc.exists) throw 'User not found';
            const bal = userDoc.data().balance || 0;
            tx.update(uRef, { balance: bal + ordData.diamondAmount });
            tx.update(ordRef, { status: 'Cancel' });
          }).then(()=> alert('Order cancelled and refunded'))
            .catch(e=> alert('Error: '+e));
        };
      });

      // users
      const usersSnap = await db.collection('users').orderBy('name').get();
      allUsersDiv.innerHTML = '';
      usersSnap.forEach(doc=>{
        const d = doc.data();
        const el = document.createElement('div');
        el.className = 'order-item';
        el.innerHTML = `<strong>${d.name}</strong> — ${d.email} — Balance: ${d.balance || 0} <br/>
          <input placeholder="add amount" class="addAmt" data-uid="${doc.id}" />
          <button class="addBtn" data-uid="${doc.id}">Add Balance</button>`;
        allUsersDiv.appendChild(el);
      });
      allUsersDiv.querySelectorAll('.addBtn').forEach(b=>{
        b.onclick = async (e)=>{
          const uid = e.target.dataset.uid;
          const input = document.querySelector('.addAmt[data-uid="'+uid+'"]');
          const v = parseFloat(input.value||0);
          if(!v) return alert('Enter amount');
          const uRef = db.collection('users').doc(uid);
          await db.runTransaction(async tx=>{
            const docu = await tx.get(uRef);
            const bal = docu.exists ? docu.data().balance || 0 : 0;
            tx.update(uRef, { balance: bal + v });
          });
          alert('Balance added');
          input.value='';
        };
      });
    }

  } else {
    // not logged in
    if(logoutBtn) logoutBtn.style.display = 'none';
    if(document.getElementById('authToggle')) document.getElementById('authToggle').textContent = 'Not logged';
    if(profileMini) profileMini.innerHTML = '<strong>Guest</strong>';
  }
});
