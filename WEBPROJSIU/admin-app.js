(function(){
  function run(){
    const USER_KEY = 'sf_user';
    const ADM_KEY = 'sf_admins_v1';
    const user = (() => { try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch(e){ return null; } })();
    const q = id => document.getElementById(id);
    const adminSections = Array.from(document.querySelectorAll('.section-card[id]'));
    const summaryPanel = q('adminSummary');
    const kpiPanel = document.querySelector('.admin-kpi-shell');

    if(!user || user.role !== 'admin'){
      const container = document.querySelector('main.container');
      if(container){
        container.innerHTML = `<section class="card"><span class="page-pill">Restricted</span><h2>Admin access required</h2><p class="muted">Log out from the header menu on a public page, then sign back in with the <strong>Admin</strong> role to open this dashboard.</p></section>`;
      }
      return;
    }

  function escape(value){
    return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function localDateKey(date){
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  function today(){ return localDateKey(new Date()); }
  function formatMoney(value){ return `Rs. ${Number(value || 0).toFixed(0)}`; }
  function uid(prefix){ return `${prefix}_${Math.random().toString(36).slice(2, 8)}`; }
  function loadAdmins(){ try { return JSON.parse(localStorage.getItem(ADM_KEY) || '{}'); } catch(e){ return {}; } }
  function saveAdmins(admins){ localStorage.setItem(ADM_KEY, JSON.stringify(admins)); }

  let data = SmashData.load();

  function navControls(){
    return Array.from(document.querySelectorAll('[data-target]'));
  }

  function validSectionId(id){
    return adminSections.some(section => section.id === id) ? id : 'profile';
  }

  function save(){ SmashData.save(data); }

  function showSection(id){
    const next = validSectionId(id);
    adminSections.forEach(section => {
      const active = section.id === next;
      section.hidden = !active;
      section.style.display = active ? 'block' : 'none';
    });

    if(summaryPanel){
      const showSummary = next === 'profile';
      summaryPanel.hidden = !showSummary;
      summaryPanel.style.display = showSummary ? 'block' : 'none';
    }

    if(kpiPanel){
      const showKpis = next === 'profile';
      kpiPanel.hidden = !showKpis;
      kpiPanel.style.display = showKpis ? 'block' : 'none';
    }

    navControls().forEach(control => {
      control.classList.toggle('active', control.dataset.target === next);
    });
  }

  function navigateToSection(id, options){
    const config = options || {};
    const next = validSectionId(id);
    if(config.updateHash !== false){
      try{
        history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${next}`);
      } catch(e){
        window.location.hash = next;
      }
    }
    showSection(next);
    if(config.scroll !== false){
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function syncSectionFromHash(){
    const hash = (window.location.hash || '#profile').slice(1);
    navigateToSection(hash, { updateHash: false, scroll: false });
  }
  function dueMembers(){ return data.members.filter(member => member.renewalDate && member.renewalDate <= today()); }

  function renderSummary(){
    const income = data.finance.filter(item => item.type === 'income').reduce((sum, item) => sum + item.amount, 0);
    const expenses = data.finance.filter(item => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0);
    q('kpiRow').innerHTML = `
      <div class="kpi"><strong>${data.members.length}</strong><span class="muted">Active members</span></div>
      <div class="kpi"><strong>${dueMembers().length}</strong><span class="muted">Renewals due</span></div>
      <div class="kpi"><strong>${data.classes.reduce((sum, item) => sum + item.booked.length, 0)}</strong><span class="muted">Class bookings</span></div>
      <div class="kpi"><strong>${formatMoney(income - expenses)}</strong><span class="muted">Net revenue</span></div>
    `;
  }

  function renderProfile(){
    const admins = loadAdmins();
    const saved = admins[user.email || ''] || {};
    q('aName').value = user.name || '';
    q('aEmail').value = user.email || '';
    q('aEmployeeId').value = saved.employeeId || '';
    q('aRole').value = saved.role || 'manager';
  }

  q('adminProfileForm').addEventListener('submit', function(event){
    event.preventDefault();
    const admins = loadAdmins();
    admins[user.email || ''] = { employeeId: q('aEmployeeId').value.trim(), role: q('aRole').value };
    saveAdmins(admins);
    const updatedUser = Object.assign({}, user, { name: q('aName').value.trim() || user.name });
    localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
    window.dispatchEvent(new Event('storage'));
    q('profileMsg').textContent = 'Admin profile saved.';
  });

  function trainerName(id){
    const trainer = data.trainers.find(item => item.id === id);
    return trainer ? trainer.name : '-';
  }

  function renderMembers(){
    q('membersList').innerHTML = `
      <table>
        <thead><tr><th>Name</th><th>Plan</th><th>Trainer</th><th>Status</th><th>Renewal</th><th>Actions</th></tr></thead>
        <tbody>
          ${data.members.map(member => `
            <tr>
              <td><strong>${escape(member.name)}</strong><br><span class="small-muted">${escape(member.email || '')}</span></td>
              <td>${escape(member.plan || '-')}</td>
              <td>${escape(trainerName(member.trainerId))}</td>
              <td>${escape(member.membershipStatus || 'active')}</td>
              <td>${member.renewalDate || '-'}</td>
              <td><div class="cta-row"><button type="button" class="btn renew-member" data-id="${member.id}">Renew</button><button type="button" class="btn secondary archive-member" data-id="${member.id}">Archive</button></div></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    document.querySelectorAll('.renew-member').forEach(button => button.addEventListener('click', function(){
      const member = data.members.find(item => item.id === button.dataset.id);
      if(!member) return;
      const plan = SmashData.getPlanForMember(member);
      member.plan = plan.name;
      member.durationMonths = plan.durationMonths;
      member.renewalDate = SmashData.addMonths(member.renewalDate || today(), plan.durationMonths);
      member.membershipStatus = 'active';
      data.invoices.push({ id: `inv_${Math.floor(Math.random() * 9000)}`, memberId: member.id, amount: plan.price, dueDate: member.renewalDate, status: 'pending' });
      SmashData.addNotification(data, { role:'admin', title:'Renewal updated', message:`${member.name} renewal moved to ${member.renewalDate}.` });
      SmashData.addNotification(data, { role:'member', memberId: member.id, title:'Renewal created', message:`Your ${plan.name} renewal is now due on ${member.renewalDate}.` });
      save();
      renderAll();
    }));
    document.querySelectorAll('.archive-member').forEach(button => button.addEventListener('click', function(){
      const member = SmashData.archiveMember(data, button.dataset.id);
      if(!member) return;
      SmashData.addNotification(data, { role:'admin', title:'Member archived', message:`${member.name} was moved to past members and active bookings were cleared.` });
      save();
      renderAll();
    }));
  }

  function renderPast(){
    q('pastList').innerHTML = data.past.length ? `<ul class="feature-list">${data.past.map(member => `<li><span><strong>${escape(member.name)}</strong><br><span class="small-muted">${escape(member.plan || '')}</span></span></li>`).join('')}</ul>` : '<p class="small-muted">No archived members yet.</p>';
  }

  function renderDue(){
    const due = dueMembers();
    q('dueList').innerHTML = due.length ? `<table><thead><tr><th>Name</th><th>Plan</th><th>Renewal</th><th>Contact</th></tr></thead><tbody>${due.map(member => `<tr><td>${escape(member.name)}</td><td>${escape(member.plan)}</td><td>${member.renewalDate}</td><td>${escape(member.phone || member.email || '-')}</td></tr>`).join('')}</tbody></table>` : '<p class="small-muted">No renewals due today.</p>';
  }

  function renderAttendance(){
    const present = data.attendance[today()] || [];
    q('attendanceList').innerHTML = `<table><thead><tr><th>Member</th><th>Biometric ID</th><th>Present</th></tr></thead><tbody>${data.members.map(member => `<tr><td>${escape(member.name)}</td><td>${escape(member.biometricId || '-')}</td><td><input type="checkbox" class="attChk" data-id="${member.id}" ${present.includes(member.id) ? 'checked' : ''}></td></tr>`).join('')}</tbody></table>`;
    document.querySelectorAll('.attChk').forEach(checkbox => checkbox.addEventListener('change', function(event){
      data.attendance[today()] = data.attendance[today()] || [];
      const list = data.attendance[today()];
      const id = event.target.dataset.id;
      if(event.target.checked && !list.includes(id)) list.push(id);
      if(!event.target.checked){
        const index = list.indexOf(id);
        if(index > -1) list.splice(index, 1);
      }
      save();
      renderSummary();
    }));
  }

  function renderTrainers(){
    q('trainersList').innerHTML = `<div class="cards dense-cards">${data.trainers.map(trainer => `<div class="card compact-card"><span class="page-pill">${escape(trainer.experience)}</span><h3>${escape(trainer.name)}</h3><p class="muted">${escape(trainer.specialty)}</p><p class="small-muted">Slots: ${escape(trainer.slots.join(', '))}</p></div>`).join('')}</div>`;
  }

  function renderClasses(){
    q('classesList').innerHTML = `
      <div class="split-layout">
        <div class="card compact-card">
          <span class="page-pill">Classes</span>
          <table><thead><tr><th>Name</th><th>Coach</th><th>Slot</th><th>Bookings</th></tr></thead><tbody>${data.classes.map(item => `<tr><td>${escape(item.name)}</td><td>${escape(trainerName(item.trainerId))}</td><td>${item.day} ${item.time}</td><td>${item.booked.length}/${item.capacity}</td></tr>`).join('')}</tbody></table>
        </div>
        <div class="card compact-card">
          <span class="page-pill">Appointments</span>
          <table><thead><tr><th>Member</th><th>Type</th><th>Date</th><th>Status</th></tr></thead><tbody>${data.appointments.map(item => {
            const memberName = SmashData.getMemberNameById(data, item.memberId);
            return `<tr><td>${memberName ? escape(memberName) : '-'}</td><td>${escape(item.type)}</td><td>${item.date} ${item.time}</td><td>${escape(item.status)}</td></tr>`;
          }).join('')}</tbody></table>
        </div>
      </div>
    `;
  }

  function renderStaff(){
    const present = data.staffAttendance[today()] || [];
    q('staffList').innerHTML = data.staff.length ? `<table><thead><tr><th>Name</th><th>Role</th><th>Present</th></tr></thead><tbody>${data.staff.map(staffMember => `<tr><td>${escape(staffMember.name)}</td><td>${escape(staffMember.role || 'Staff')}</td><td>${present.includes(staffMember.id) ? 'Yes' : 'No'}</td></tr>`).join('')}</tbody></table>` : '<p class="small-muted">No staff recorded yet.</p>';
  }

  function renderHours(){
    const hours = data.settings.hours || {};
    q('hoursForm').innerHTML = `${Object.keys(hours).map(day => `<div class="form-row" style="margin-bottom:0.75rem"><strong style="min-width:64px; padding-top:0.7rem">${day}</strong><input class="input hour-start" data-day="${day}" value="${hours[day][0]}"><input class="input hour-end" data-day="${day}" value="${hours[day][1]}"></div>`).join('')}<button type="button" class="btn" id="saveHours">Save hours</button>`;
    q('saveHours').addEventListener('click', function(){
      document.querySelectorAll('.hour-start').forEach(input => {
        const day = input.dataset.day;
        const end = document.querySelector(`.hour-end[data-day="${day}"]`);
        data.settings.hours[day] = [input.value || '00:00', end ? end.value || '00:00' : '00:00'];
      });
      save();
    });
  }

  function renderCalendarSummary(dateValue){
    const dateKey = dateValue || today();
    const members = (data.attendance[dateKey] || []).length;
    const staff = (data.staffAttendance[dateKey] || []).length;
    const appointments = data.appointments.filter(item => item.date === dateKey && item.status !== 'cancelled').length;
    q('calendarEvents').innerHTML = `<div class="result"><strong>${dateKey}</strong><br><span class="muted">${members} members checked in, ${staff} staff on duty, ${appointments} appointments scheduled.</span></div>`;
  }

  function renderFinance(){
    const income = data.finance.filter(item => item.type === 'income').reduce((sum, item) => sum + item.amount, 0);
    const expenses = data.finance.filter(item => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0);
    q('financeList').innerHTML = `
      <div class="split-layout">
        <div class="card compact-card">
          <span class="page-pill">Transactions</span>
          <table><thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Amount</th><th>Description</th></tr></thead><tbody>${data.finance.slice().reverse().map(item => `<tr><td>${item.date}</td><td>${escape(item.type)}</td><td>${escape(item.category || '-')}</td><td>${formatMoney(item.amount)}</td><td>${escape(item.desc)}</td></tr>`).join('')}</tbody></table>
        </div>
        <div class="card compact-card">
          <span class="page-pill">Invoices</span>
          <table><thead><tr><th>Invoice</th><th>Member</th><th>Amount</th><th>Status</th></tr></thead><tbody>${data.invoices.map(invoice => {
            const member = data.members.find(item => item.id === invoice.memberId) || data.past.find(item => item.id === invoice.memberId);
            return `<tr><td>${invoice.id}</td><td>${member ? escape(member.name) : '-'}</td><td>${formatMoney(invoice.amount)}</td><td>${escape(invoice.status)}</td></tr>`;
          }).join('')}</tbody></table>
          <div class="result" style="margin-top:1rem"><strong>Income:</strong> ${formatMoney(income)}<br><strong>Expense:</strong> ${formatMoney(expenses)}<br><strong>Net:</strong> ${formatMoney(income - expenses)}</div>
        </div>
      </div>
    `;
  }

  function renderReports(){
    const alerts = data.notifications.filter(item => item.role === 'admin').slice(0, 5);
    const fillRate = data.classes.length ? Math.round(data.classes.reduce((sum, item) => sum + (item.booked.length / item.capacity), 0) / data.classes.length * 100) : 0;
    q('reportsList').innerHTML = `
      <div class="kpi-row">
        <div class="kpi"><strong>${(data.attendance[today()] || []).length}</strong><span class="muted">Check-ins today</span></div>
        <div class="kpi"><strong>${fillRate}%</strong><span class="muted">Average class fill</span></div>
        <div class="kpi"><strong>${data.leads.filter(item => item.status !== 'closed').length}</strong><span class="muted">Open leads</span></div>
        <div class="kpi"><strong>${alerts.length}</strong><span class="muted">Admin alerts</span></div>
      </div>
      <div class="card compact-card"><span class="page-pill">Alerts</span><ul class="feature-list">${alerts.map(item => `<li><span><strong>${escape(item.title)}</strong><br><span class="small-muted">${escape(item.message)}</span></span></li>`).join('')}</ul></div>
    `;
  }

  function renderLeads(){
    q('leadsList').innerHTML = `<table><thead><tr><th>Name</th><th>Source</th><th>Interest</th><th>Status</th></tr></thead><tbody>${data.leads.map(lead => `<tr><td>${escape(lead.name)}</td><td>${escape(lead.source)}</td><td>${escape(lead.interest)}</td><td>${escape(lead.status)}</td></tr>`).join('')}</tbody></table>`;
  }

  function renderSettings(){
    q('settingsPanel').innerHTML = `
      <div class="split-layout">
        <div class="card compact-card"><span class="page-pill">Brand</span><p class="muted"><strong>${escape(data.settings.gymName)}</strong></p><p class="muted">${escape(data.settings.location)}</p><p class="muted">${escape(data.settings.whatsapp)} • ${escape(data.settings.email)}</p></div>
        <div class="card compact-card"><span class="page-pill">Production readiness</span><ul class="feature-list"><li><span><strong>Backend still needed</strong><br>Move auth, payments, and reports to a real server before launch.</span></li><li><span><strong>Integrations needed</strong><br>Connect real biometric devices, gateway billing, and messaging later.</span></li><li><span><strong>Deployment needed</strong><br>Host on a secure domain with backups and staff permissions.</span></li></ul></div>
      </div>
    `;
  }

  q('memberForm').addEventListener('submit', function(event){
    event.preventDefault();
    const name = q('mName').value.trim();
    if(!name) return;
    const email = q('mEmail').value.trim();
    const join = q('mJoinDateTime').value || `${today()}T08:00`;
    const duration = Number(q('mDuration').value || 1);
    const paymentMode = q('mPaymentMode').value || 'cash';
    const plan = SmashData.getPlanByDuration(duration);
    const joinDate = join.slice(0, 10);
    const renewalDate = SmashData.addMonths(joinDate, plan.durationMonths);
    const normalizedEmail = email.toLowerCase();
    const normalizedName = name.toLowerCase();
    const matchesMember = function(record){
      if(!record) return false;
      const recordEmail = String(record.email || '').toLowerCase();
      const recordName = String(record.name || '').toLowerCase();
      if(email && recordEmail){
        return recordEmail === normalizedEmail;
      }
      return recordName === normalizedName;
    };

    let member = data.members.find(matchesMember);
    let restored = false;
    let updated = false;

    if(!member){
      const archivedIndex = data.past.findIndex(matchesMember);
      if(archivedIndex > -1){
        member = data.past.splice(archivedIndex, 1)[0];
        data.members.push(member);
        restored = true;
      }
    }

    if(member){
      updated = !restored;
      member.name = name;
      member.email = email;
      member.plan = plan.name;
      member.durationMonths = plan.durationMonths;
      member.membershipStatus = 'active';
      member.joinDate = joinDate;
      member.renewalDate = renewalDate;
      member.notes = `Paid by ${paymentMode}`;
      member.trainerId = member.trainerId || (data.trainers[0] ? data.trainers[0].id : '');
      member.goals = Array.isArray(member.goals) && member.goals.length ? member.goals : ['General fitness'];
      member.biometricId = member.biometricId || `BIO-${Math.floor(Math.random() * 9000) + 1000}`;
      delete member.archivedDate;
    } else {
      member = { id: uid('m'), name, email, phone:'', plan: plan.name, durationMonths: plan.durationMonths, membershipStatus:'active', joinDate: joinDate, renewalDate: renewalDate, trainerId: data.trainers[0] ? data.trainers[0].id : '', goals:['General fitness'], notes:`Paid by ${paymentMode}`, biometricId:`BIO-${Math.floor(Math.random() * 9000) + 1000}` };
      data.members.push(member);
    }

    const memberActionLabel = restored ? 'reactivation' : updated ? 'membership update' : 'signup';
    data.invoices.push({ id: `inv_${Math.floor(Math.random() * 9000)}`, memberId: member.id, amount: plan.price, dueDate: member.renewalDate, status:'paid' });
    data.finance.push({ id: uid('f'), memberId: member.id, type:'income', category:'membership', amount: plan.price, desc:`${plan.name} ${memberActionLabel}`, date: today(), status:'paid' });
    SmashData.addNotification(data, {
      role: 'admin',
      title: restored ? 'Member reactivated' : updated ? 'Member updated' : 'New member added',
      message: `${member.name} is active on the ${plan.name} plan through ${member.renewalDate}.`
    });
    SmashData.addNotification(data, {
      role: 'member',
      memberId: member.id,
      title: restored ? 'Membership reactivated' : updated ? 'Membership updated' : 'Membership active',
      message: `Your ${plan.name} plan is active through ${member.renewalDate}.`
    });
    q('memberForm').reset();
    save();
    renderAll();
  });

  q('staffForm').addEventListener('submit', function(event){
    event.preventDefault();
    const name = q('sName').value.trim();
    const role = q('sRole').value || 'Staff';
    if(!name) return;
    let staffMember = data.staff.find(item => item.name.toLowerCase() === name.toLowerCase());
    if(!staffMember){
      staffMember = { id: uid('s'), name, role: role };
      data.staff.push(staffMember);
    } else {
      staffMember.role = role;
    }
    data.staffAttendance[today()] = data.staffAttendance[today()] || [];
    if(!data.staffAttendance[today()].includes(staffMember.id)) data.staffAttendance[today()].push(staffMember.id);
    q('sName').value = '';
    save();
    renderAll();
  });

  q('financeForm').addEventListener('submit', function(event){
    event.preventDefault();
    const amount = parseFloat(q('feAmount').value || 0);
    if(!amount) return;
    data.finance.push({ id: uid('f'), type:q('feType').value, category:q('feType').value === 'income' ? 'manual income' : 'operations', amount, desc:q('feDesc').value || '', date: today(), status:'paid' });
    q('financeForm').reset();
    save();
    renderAll();
  });

  q('showDate').addEventListener('click', function(){ renderCalendarSummary(q('calDate').value || today()); });

  function renderAll(){
    data = SmashData.load();
    renderSummary();
    renderMembers();
    renderPast();
    renderDue();
    renderAttendance();
    renderTrainers();
    renderClasses();
    renderStaff();
    renderHours();
    renderCalendarSummary();
    renderFinance();
    renderReports();
    renderLeads();
    renderSettings();
  }

    renderProfile();
    renderAll();
    syncSectionFromHash();
    document.addEventListener('click', function(event){
      const control = event.target.closest('[data-target]');
      if(!control) return;
      event.preventDefault();
      navigateToSection(control.dataset.target || 'profile');
    });
    window.addEventListener('hashchange', syncSectionFromHash);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
