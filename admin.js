(function(){
  const USER_KEY = 'sf_user';
  const DATA_KEY = 'sf_admin_data_v1';
  // default data structure
  const defaultData = {
    members: [], // {id,name,email,joinDateTime,paymentMode,durationMonths,subscriptionEnd,active}
    past: [],
    attendance: {}, // yyyy-mm-dd: [memberId,...]
    staffAttendance: {},
    staff: [], // {id,name}
    hours: { Mon:['06:00','22:00'],Tue:['06:00','22:00'],Wed:['06:00','22:00'],Thu:['06:00','22:00'],Fri:['06:00','22:00'],Sat:['08:00','20:00'],Sun:['08:00','18:00'] },
    finance: [] // {id,type,amount,desc,date}
  };

  function loadData(){ try{ return JSON.parse(localStorage.getItem(DATA_KEY)) || defaultData } catch(e){ return defaultData } }
  function saveData(d){ localStorage.setItem(DATA_KEY, JSON.stringify(d)); }
  function uid(prefix='id'){ return prefix + '_' + Math.random().toString(36).slice(2,9) }

  const data = loadData();

  // require admin role to view/administer dashboard
  function getUser(){ try{ return JSON.parse(localStorage.getItem(USER_KEY)) } catch(e){ return null } }
  const currentUser = getUser();
  if(!currentUser || currentUser.role !== 'admin'){
    const container = document.querySelector('main.container');
    if(container){
      container.innerHTML = `<div class="card" style="padding:18px"><h2>Admin access required</h2><p class="small-muted">You must be signed in as an <strong>Admin</strong> to use this dashboard. Go to <a href="account.html">Account settings</a> and set your role to <em>Admin</em>, then reload this page.</p></div>`;
    }
    // expose a minimal API for debugging, but do not initialize admin UI
    window.__sfAdmin = {allowed:false};
    return;
  }

  // --- Members ---
  const membersList = document.getElementById('membersList');
  const pastList = document.getElementById('pastList');
  const dueList = document.getElementById('dueList');
  const attendanceList = document.getElementById('attendanceList');
  const staffList = document.getElementById('staffList');
  const hoursForm = document.getElementById('hoursForm');
  const calendarEvents = document.getElementById('calendarEvents');
  const financeList = document.getElementById('financeList');

  // --- Tabs & Admin profile ---
  const tabLinks = Array.from(document.querySelectorAll('.tab-link'));
  function showSection(id){
    // hide all section-card elements then show the requested id
    document.querySelectorAll('.section-card').forEach(el=> el.style.display = 'none');
    const target = document.getElementById(id);
    if(target) target.style.display = '';
    // set active link
    tabLinks.forEach(a=> a.classList.toggle('active', a.getAttribute('href') === '#'+id));
  }

  // admin profile storage per admin email
  const ADM_KEY = 'sf_admins_v1';
  function loadAdminInfo(email){ try{ const m = JSON.parse(localStorage.getItem(ADM_KEY)) || {}; return m[email] || {} } catch(e){ return {} } }
  function saveAdminInfo(email, info){ try{ const m = JSON.parse(localStorage.getItem(ADM_KEY)) || {}; m[email]=info; localStorage.setItem(ADM_KEY, JSON.stringify(m)); } catch(e){} }

  function renderProfile(){ const form = document.getElementById('adminProfileForm'); if(!form) return; const aName = document.getElementById('aName'); const aEmail = document.getElementById('aEmail'); const aEmployeeId = document.getElementById('aEmployeeId'); const aRole = document.getElementById('aRole'); const user = currentUser || {}; aName.value = user.name || ''; aEmail.value = user.email || ''; // load saved admin extras
    const info = loadAdminInfo(user.email||''); if(info){ aEmployeeId.value = info.employeeId || ''; if(info.role) aRole.value = info.role; }
    form.addEventListener('submit', function(e){ e.preventDefault(); const infoObj = { employeeId: aEmployeeId.value.trim(), role: aRole.value }; saveAdminInfo(user.email||'', infoObj); // also update display name in sf_user
      const u = getUser() || {}; u.name = aName.value.trim() || u.name; localStorage.setItem(USER_KEY, JSON.stringify(u)); alert('Profile saved'); }) }

  function renderMembers(){
    if(!membersList) return;
    if(data.members.length===0) membersList.innerHTML = '<p class="small-muted">No members yet.</p>';
    else{
      let html = '<table><thead><tr><th>Name</th><th>Email</th><th>Joined</th><th>Payment</th><th>Duration (mo)</th><th>Expiry</th><th>Actions</th></tr></thead><tbody>';
      data.members.forEach(m=>{
        html += `<tr><td>${escape(m.name)}</td><td>${escape(m.email||'')}</td><td>${m.joinDateTime? m.joinDateTime.replace('T',' '):''}</td><td>${escape(m.paymentMode||'')}</td><td>${m.durationMonths||''}</td><td>${m.subscriptionEnd||''}</td><td><button data-id="${m.id}" class="btn small mark-past">Mark Past</button> <button data-id="${m.id}" class="btn small mark-due">Mark Due</button></td></tr>`
      })
      html += '</tbody></table>';
      membersList.innerHTML = html;
      // attach
      Array.from(document.querySelectorAll('.mark-past')).forEach(b=> b.addEventListener('click', ()=>{ markPast(b.dataset.id) }))
      Array.from(document.querySelectorAll('.mark-due')).forEach(b=> b.addEventListener('click', ()=>{ markDue(b.dataset.id) }))
    }
  }

  function renderPast(){ if(!pastList) return; if(data.past.length===0) pastList.innerHTML='<p class="small-muted">No past members.</p>'; else { let html='<ul>'; data.past.forEach(p=> html += `<li>${escape(p.name)} — ${p.email||''}</li>`); html+='</ul>'; pastList.innerHTML=html } }
  function renderDue(){ if(!dueList) return; const today = new Date().toISOString().slice(0,10); const due = data.members.filter(m=> m.subscriptionEnd && m.subscriptionEnd <= today); if(due.length===0) dueList.innerHTML='<p class="small-muted">No due members today.</p>'; else { let html='<table><thead><tr><th>Name</th><th>Expiry</th></tr></thead><tbody>'; due.forEach(d=> html += `<tr><td>${escape(d.name)}</td><td>${d.subscriptionEnd}</td></tr>`); html+='</tbody></table>'; dueList.innerHTML = html } }

  function markPast(id){ const i = data.members.findIndex(m=>m.id===id); if(i===-1) return; const m = data.members.splice(i,1)[0]; m.active = false; data.past.push(m); saveData(data); renderMembers(); renderPast(); renderDue(); }
  function markDue(id){ const m = data.members.find(m=>m.id===id); if(!m) return; m.subscriptionEnd = new Date().toISOString().slice(0,10); saveData(data); renderMembers(); renderDue(); }

  // add member form
  const memberForm = document.getElementById('memberForm');
  // helper to add months to a date (returns YYYY-MM-DD)
  function addMonthsToDate(dateStr, months){ const d = dateStr ? new Date(dateStr) : new Date(); d.setMonth(d.getMonth() + Number(months || 0)); return d.toISOString().slice(0,10); }

  if(memberForm){
    memberForm.addEventListener('submit', function(e){
      e.preventDefault();
      const name = document.getElementById('mName').value.trim();
      const email = document.getElementById('mEmail').value.trim();
      const joinDT = document.getElementById('mJoinDateTime').value || null;
      const payMode = document.getElementById('mPaymentMode').value || '';
      const duration = document.getElementById('mDuration').value || null;
      if(!name) return alert('Name required');
      let subscriptionEnd = null;
      if(duration && duration > 0){ subscriptionEnd = addMonthsToDate(joinDT || new Date().toISOString(), Number(duration)); }
      const m = {id:uid('m'),name,email,joinDateTime:joinDT,paymentMode:payMode,durationMonths: duration?Number(duration):null,subscriptionEnd,active:true};
      data.members.push(m);
      saveData(data);
      memberForm.reset();
      renderMembers(); renderDue();
    })
  }

  // --- Attendance ---
  function renderAttendance(){ if(!attendanceList) return; const today = new Date().toISOString().slice(0,10); const present = data.attendance[today] || []; let html = '<table><thead><tr><th>Member</th><th>Present</th></tr></thead><tbody>'; data.members.forEach(m=>{ const yes = present.includes(m.id); html += `<tr><td>${escape(m.name)}</td><td><input type="checkbox" data-id="${m.id}" class="attChk" ${yes? 'checked':''}></td></tr>` }); html += '</tbody></table>'; attendanceList.innerHTML = html; Array.from(document.querySelectorAll('.attChk')).forEach(cb=> cb.addEventListener('change', e=>{ const id = e.target.dataset.id; toggleAttendance(id, today, e.target.checked) })) }
  function toggleAttendance(memberId, date, present){ data.attendance[date] = data.attendance[date] || []; const list = data.attendance[date]; if(present){ if(!list.includes(memberId)) list.push(memberId); } else { const i = list.indexOf(memberId); if(i>-1) list.splice(i,1); } saveData(data); }

  // --- Staff attendance ---
  const staffFormEl = document.getElementById('staffForm');
  if(staffFormEl){ staffFormEl.addEventListener('submit', function(e){ e.preventDefault(); const name = document.getElementById('sName').value.trim(); if(!name) return; // add if not exists
    let s = data.staff.find(x=> x.name.toLowerCase()===name.toLowerCase()); if(!s){ s = {id:uid('s'),name}; data.staff.push(s); }
    const today = new Date().toISOString().slice(0,10); data.staffAttendance[today] = data.staffAttendance[today] || []; if(!data.staffAttendance[today].includes(s.id)) data.staffAttendance[today].push(s.id); saveData(data); document.getElementById('sName').value=''; renderStaff(); }) }
  function renderStaff(){ if(!staffList) return; if(data.staff.length===0) staffList.innerHTML='<p class="small-muted">No staff recorded.</p>'; else { let html='<table><thead><tr><th>Name</th><th>Present Today</th></tr></thead><tbody>'; const today = new Date().toISOString().slice(0,10); const present = data.staffAttendance[today]||[]; data.staff.forEach(s=> html += `<tr><td>${escape(s.name)}</td><td>${present.includes(s.id)? 'Yes':''}</td></tr>`); html+='</tbody></table>'; staffList.innerHTML=html } }

  // --- Working hours ---
  function renderHours(){ if(!hoursForm) return; let html=''; Object.keys(data.hours).forEach(d=>{ html += `<div style="display:flex;gap:8px;align-items:center;margin-bottom:6px"><strong style="width:60px">${d}</strong><input class="input hour-start" data-day="${d}" value="${data.hours[d][0]}"><input class="input hour-end" data-day="${d}" value="${data.hours[d][1]}"></div>` }); hoursForm.innerHTML = html + '<div style="margin-top:8px"><button class="btn" id="saveHours">Save Hours</button></div>'; document.getElementById('saveHours').addEventListener('click', ()=>{ document.querySelectorAll('.hour-start').forEach(i=>{ const day = i.dataset.day; const end = document.querySelector(`.hour-end[data-day="${day}"]`).value||'00:00'; data.hours[day]=[i.value||'00:00', end]; }); saveData(data); alert('Hours saved'); }) }

  // --- Calendar ---
  document.getElementById('showDate').addEventListener('click', function(){ const d = document.getElementById('calDate').value || new Date().toISOString().slice(0,10); const att = data.attendance[d] || []; const staff = data.staffAttendance[d] || []; let html = `<p class="small-muted">Attendance: ${att.length} members, ${staff.length} staff</p>`; calendarEvents.innerHTML = html; })

  // --- Finance ---
  const financeForm = document.getElementById('financeForm'); if(financeForm){ financeForm.addEventListener('submit', function(e){ e.preventDefault(); const type = document.getElementById('feType').value; const amt = parseFloat(document.getElementById('feAmount').value||0); const desc = document.getElementById('feDesc').value||''; if(!amt) return alert('Enter amount'); const item = {id:uid('f'),type,amount:amt,desc,date:new Date().toISOString().slice(0,10)}; data.finance.push(item); saveData(data); renderFinance(); financeForm.reset(); }) }
  function renderFinance(){ if(!financeList) return; if(data.finance.length===0) financeList.innerHTML='<p class="small-muted">No records.</p>'; else { let html='<table><thead><tr><th>Date</th><th>Type</th><th>Amount</th><th>Description</th></tr></thead><tbody>'; data.finance.slice().reverse().forEach(f=> html += `<tr><td>${f.date}</td><td>${f.type}</td><td>${f.amount.toFixed(2)}</td><td>${escape(f.desc)}</td></tr>`); html+='</tbody></table>'; const totalIncome = data.finance.filter(x=>x.type==='income').reduce((s,i)=>s+i.amount,0); const totalExpense = data.finance.filter(x=>x.type==='expense').reduce((s,i)=>s+i.amount,0); html += `<p class="small-muted" style="margin-top:8px">Income: ${totalIncome.toFixed(2)} — Expense: ${totalExpense.toFixed(2)} — Net: ${(totalIncome-totalExpense).toFixed(2)}</p>`; financeList.innerHTML = html } }

  // helpers
  function escape(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') }

  // initial render
  renderMembers(); renderPast(); renderDue(); renderAttendance(); renderStaff(); renderHours(); renderFinance();

  // render profile and setup tabs
  renderProfile();
  // hide all sections except profile by default
  setTimeout(()=> showSection('profile'), 50);
  // wire up tab links
  tabLinks.forEach(a=> a.addEventListener('click', function(e){ e.preventDefault(); const href = (a.getAttribute('href')||'').replace('#',''); showSection(href); }));

  // expose a tiny API for debugging in console
  window.__sfAdmin = {data,saveData,renderMembers,renderAttendance,renderFinance};
})();