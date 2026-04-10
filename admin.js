(function(){
  const USER_KEY = 'sf_user';
  const ADM_KEY = 'sf_admins_v1';
  const today = () => new Date().toISOString().slice(0, 10);

  function escape(s){
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function uid(prefix){
    return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
  }

  // Use central SmashData storage (sf_platform_data_v2). SmashData provides seed defaults and normalization.
  function loadData(){
    try{
      return typeof SmashData !== 'undefined' ? SmashData.load() : { members: [], past: [], attendance: {}, staffAttendance: {}, staff: [], hours: {}, finance: [] };
    } catch(e){
      return { members: [], past: [], attendance: {}, staffAttendance: {}, staff: [], hours: {}, finance: [] };
    }
  }

  function saveData(data){
    try{
      if(typeof SmashData !== 'undefined') SmashData.save(data);
      else localStorage.setItem('sf_admin_data_v1', JSON.stringify(data));
    } catch(e){
      // best-effort
    }
  }

  function getUser(){
    try{
      return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    } catch(e){
      return null;
    }
  }

  function loadAdminInfo(email){
    try{
      const admins = JSON.parse(localStorage.getItem(ADM_KEY) || '{}');
      return admins[email] || {};
    } catch(e){
      return {};
    }
  }

  function saveAdminInfo(email, info){
    try{
      const admins = JSON.parse(localStorage.getItem(ADM_KEY) || '{}');
      admins[email] = info;
      localStorage.setItem(ADM_KEY, JSON.stringify(admins));
    } catch(e){}
  }

  const currentUser = getUser();
  const container = document.querySelector('main.container');
  if(!currentUser || currentUser.role !== 'admin'){
    if(container){
      container.innerHTML = `
        <section class="card">
          <span class="page-pill">Restricted area</span>
          <h2>Admin access required</h2>
          <p class="muted">Sign in with the <strong>Admin</strong> role from <a href="account.html">Account settings</a>, then return to this dashboard.</p>
          <div class="cta-row" style="margin-top:1rem">
            <a class="btn" href="account.html">Open account settings</a>
            <a class="btn secondary" href="index.html">Back to home</a>
          </div>
        </section>
      `;
    }
    window.__sfAdmin = {allowed:false};
    return;
  }

  const data = loadData();
  const membersList = document.getElementById('membersList');
  const pastList = document.getElementById('pastList');
  const dueList = document.getElementById('dueList');
  const attendanceList = document.getElementById('attendanceList');
  const staffList = document.getElementById('staffList');
  const hoursForm = document.getElementById('hoursForm');
  const calendarEvents = document.getElementById('calendarEvents');
  const financeList = document.getElementById('financeList');
  const tabLinks = Array.from(document.querySelectorAll('.tab-link'));
  const sections = Array.from(document.querySelectorAll('.section-card'));

  function showSection(id){
    sections.forEach(section => {
      section.style.display = section.id === id ? '' : 'none';
    });
    tabLinks.forEach(link => {
      link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
    });
  }

  function syncSectionFromHash(){
    const hash = (window.location.hash || '#profile').slice(1);
    const targetExists = sections.some(section => section.id === hash);
    showSection(targetExists ? hash : 'profile');
  }

  function renderSummary(){
    const kpiRoot = document.getElementById('kpiRow');
    if(!kpiRoot) return;
    const activeMembers = data.members.length;
    const dueMembers = data.members.filter(member => member.subscriptionEnd && member.subscriptionEnd <= today()).length;
    const staffPresent = (data.staffAttendance[today()] || []).length;
    const income = data.finance.filter(item => item.type === 'income').reduce((sum, item) => sum + item.amount, 0);
    const expenses = data.finance.filter(item => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0);

    kpiRoot.innerHTML = `
      <div class="kpi"><strong>${activeMembers}</strong><span class="muted">Active members</span></div>
      <div class="kpi"><strong>${dueMembers}</strong><span class="muted">Due renewals</span></div>
      <div class="kpi"><strong>${staffPresent}</strong><span class="muted">Staff present today</span></div>
      <div class="kpi"><strong>Rs. ${(income - expenses).toFixed(0)}</strong><span class="muted">Current net total</span></div>
    `;
  }

  function renderProfile(){
    const form = document.getElementById('adminProfileForm');
    if(!form) return;

    const nameInput = document.getElementById('aName');
    const emailInput = document.getElementById('aEmail');
    const employeeIdInput = document.getElementById('aEmployeeId');
    const roleInput = document.getElementById('aRole');
    const profileNote = document.getElementById('profileMsg');
    const savedInfo = loadAdminInfo(currentUser.email || '');

    nameInput.value = currentUser.name || '';
    emailInput.value = currentUser.email || '';
    employeeIdInput.value = savedInfo.employeeId || '';
    roleInput.value = savedInfo.role || 'manager';

    form.addEventListener('submit', function(e){
      e.preventDefault();
      const info = {
        employeeId: employeeIdInput.value.trim(),
        role: roleInput.value
      };
      saveAdminInfo(currentUser.email || '', info);
      const updatedUser = getUser() || {};
      updatedUser.name = nameInput.value.trim() || updatedUser.name;
      localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
      if(profileNote){
        profileNote.textContent = 'Profile saved locally in this browser.';
      }
      window.dispatchEvent(new Event('storage'));
    });
  }

  function renderMembers(){
    if(!membersList) return;
    if(data.members.length === 0){
      membersList.innerHTML = '<p class="small-muted">No members yet. Add a member to start tracking payments and attendance.</p>';
      return;
    }

    membersList.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Joined</th>
            <th>Payment</th>
            <th>Duration</th>
            <th>Expiry</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${data.members.map(member => `
            <tr>
              <td>${escape(member.name)}</td>
              <td>${escape(member.email || '')}</td>
              <td>${member.joinDateTime ? member.joinDateTime.replace('T', ' ') : '-'}</td>
              <td>${escape(member.paymentMode || '-')}</td>
              <td>${member.durationMonths ? `${member.durationMonths} mo` : '-'}</td>
              <td>${member.subscriptionEnd || '-'}</td>
              <td>
                <div class="cta-row">
                  <button type="button" data-id="${member.id}" class="btn mark-past">Past</button>
                  <button type="button" data-id="${member.id}" class="btn secondary mark-due">Due today</button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    document.querySelectorAll('.mark-past').forEach(button => {
      button.addEventListener('click', () => markPast(button.dataset.id));
    });
    document.querySelectorAll('.mark-due').forEach(button => {
      button.addEventListener('click', () => markDue(button.dataset.id));
    });
  }

  function renderPast(){
    if(!pastList) return;
    if(data.past.length === 0){
      pastList.innerHTML = '<p class="small-muted">No past members yet.</p>';
      return;
    }

    pastList.innerHTML = `
      <ul class="feature-list">
        ${data.past.map(member => `<li><span><strong>${escape(member.name)}</strong><br><span class="small-muted">${escape(member.email || 'No email')}</span></span></li>`).join('')}
      </ul>
    `;
  }

  function renderDue(){
    if(!dueList) return;
    const dueMembers = data.members.filter(member => member.subscriptionEnd && member.subscriptionEnd <= today());
    if(dueMembers.length === 0){
      dueList.innerHTML = '<p class="small-muted">No renewals are due right now.</p>';
      return;
    }

    dueList.innerHTML = `
      <table>
        <thead><tr><th>Name</th><th>Expiry</th><th>Status</th></tr></thead>
        <tbody>
          ${dueMembers.map(member => `
            <tr>
              <td>${escape(member.name)}</td>
              <td>${member.subscriptionEnd}</td>
              <td>Needs renewal</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  function markPast(id){
    const index = data.members.findIndex(member => member.id === id);
    if(index === -1) return;
    const member = data.members.splice(index, 1)[0];
    member.active = false;
    data.past.unshift(member);
    saveData(data);
    renderAll();
  }

  function markDue(id){
    const member = data.members.find(entry => entry.id === id);
    if(!member) return;
    member.subscriptionEnd = today();
    saveData(data);
    renderAll();
  }

  function addMonthsToDate(dateStr, months){
    const date = dateStr ? new Date(dateStr) : new Date();
    date.setMonth(date.getMonth() + Number(months || 0));
    return date.toISOString().slice(0, 10);
  }

  const memberForm = document.getElementById('memberForm');
  if(memberForm){
    memberForm.addEventListener('submit', function(e){
      e.preventDefault();
      const name = document.getElementById('mName').value.trim();
      const email = document.getElementById('mEmail').value.trim();
      const joinDateTime = document.getElementById('mJoinDateTime').value || null;
      const paymentMode = document.getElementById('mPaymentMode').value || '';
      const duration = Number(document.getElementById('mDuration').value || 0);
      if(!name){
        alert('Name required');
        return;
      }

      data.members.push({
        id: uid('m'),
        name,
        email,
        joinDateTime,
        paymentMode,
        durationMonths: duration || null,
        subscriptionEnd: duration > 0 ? addMonthsToDate(joinDateTime || new Date().toISOString(), duration) : null,
        active: true
      });

      saveData(data);
      memberForm.reset();
      renderAll();
    });
  }

  function renderAttendance(){
    if(!attendanceList) return;
    if(data.members.length === 0){
      attendanceList.innerHTML = '<p class="small-muted">Attendance will appear once you add members.</p>';
      return;
    }
    const dateKey = today();
    const present = data.attendance[dateKey] || [];
    attendanceList.innerHTML = `
      <table>
        <thead><tr><th>Member</th><th>Present</th></tr></thead>
        <tbody>
          ${data.members.map(member => `
            <tr>
              <td>${escape(member.name)}</td>
              <td><input type="checkbox" data-id="${member.id}" class="attChk" ${present.includes(member.id) ? 'checked' : ''}></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    document.querySelectorAll('.attChk').forEach(checkbox => {
      checkbox.addEventListener('change', function(event){
        toggleAttendance(event.target.dataset.id, dateKey, event.target.checked);
      });
    });
  }

  function toggleAttendance(memberId, dateKey, present){
    data.attendance[dateKey] = data.attendance[dateKey] || [];
    const list = data.attendance[dateKey];
    if(present && !list.includes(memberId)){
      list.push(memberId);
    }
    if(!present){
      const index = list.indexOf(memberId);
      if(index > -1) list.splice(index, 1);
    }
    saveData(data);
    renderSummary();
  }

  const staffForm = document.getElementById('staffForm');
  if(staffForm){
    staffForm.addEventListener('submit', function(e){
      e.preventDefault();
      const name = document.getElementById('sName').value.trim();
      if(!name) return;
      let staffMember = data.staff.find(entry => entry.name.toLowerCase() === name.toLowerCase());
      if(!staffMember){
        staffMember = { id: uid('s'), name };
        data.staff.push(staffMember);
      }
      const dateKey = today();
      data.staffAttendance[dateKey] = data.staffAttendance[dateKey] || [];
      if(!data.staffAttendance[dateKey].includes(staffMember.id)){
        data.staffAttendance[dateKey].push(staffMember.id);
      }
      saveData(data);
      document.getElementById('sName').value = '';
      renderAll();
    });
  }

  function renderStaff(){
    if(!staffList) return;
    if(data.staff.length === 0){
      staffList.innerHTML = '<p class="small-muted">No staff recorded yet.</p>';
      return;
    }
    const presentToday = data.staffAttendance[today()] || [];
    staffList.innerHTML = `
      <table>
        <thead><tr><th>Name</th><th>Present today</th></tr></thead>
        <tbody>
          ${data.staff.map(staffMember => `
            <tr>
              <td>${escape(staffMember.name)}</td>
              <td>${presentToday.includes(staffMember.id) ? 'Yes' : 'No'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  function renderHours(){
    if(!hoursForm) return;
    hoursForm.innerHTML = `
      ${Object.keys(data.hours).map(day => `
        <div class="form-row" style="margin-bottom:0.75rem">
          <strong style="min-width:64px; padding-top:0.7rem">${day}</strong>
          <input class="input hour-start" data-day="${day}" value="${data.hours[day][0]}">
          <input class="input hour-end" data-day="${day}" value="${data.hours[day][1]}">
        </div>
      `).join('')}
      <button type="button" class="btn" id="saveHours">Save hours</button>
    `;

    const saveButton = document.getElementById('saveHours');
    if(saveButton){
      saveButton.addEventListener('click', function(){
        document.querySelectorAll('.hour-start').forEach(startInput => {
          const day = startInput.dataset.day;
          const endInput = document.querySelector(`.hour-end[data-day="${day}"]`);
          data.hours[day] = [startInput.value || '00:00', endInput ? endInput.value || '00:00' : '00:00'];
        });
        saveData(data);
      });
    }
  }

  const showDateButton = document.getElementById('showDate');
  if(showDateButton){
    showDateButton.addEventListener('click', function(){
      const selectedDate = document.getElementById('calDate').value || today();
      const memberCount = (data.attendance[selectedDate] || []).length;
      const staffCount = (data.staffAttendance[selectedDate] || []).length;
      calendarEvents.innerHTML = `
        <div class="result">
          <strong>${selectedDate}</strong><br>
          <span class="muted">Attendance snapshot: ${memberCount} members and ${staffCount} staff present.</span>
        </div>
      `;
    });
  }

  const financeForm = document.getElementById('financeForm');
  if(financeForm){
    financeForm.addEventListener('submit', function(e){
      e.preventDefault();
      const type = document.getElementById('feType').value;
      const amount = parseFloat(document.getElementById('feAmount').value || 0);
      const desc = document.getElementById('feDesc').value || '';
      if(!amount){
        alert('Enter amount');
        return;
      }
      data.finance.push({
        id: uid('f'),
        type,
        amount,
        desc,
        date: today()
      });
      saveData(data);
      financeForm.reset();
      renderAll();
    });
  }

  function renderFinance(){
    if(!financeList) return;
    if(data.finance.length === 0){
      financeList.innerHTML = '<p class="small-muted">No income or expense records yet.</p>';
      return;
    }
    const income = data.finance.filter(item => item.type === 'income').reduce((sum, item) => sum + item.amount, 0);
    const expense = data.finance.filter(item => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0);
    financeList.innerHTML = `
      <table>
        <thead><tr><th>Date</th><th>Type</th><th>Amount</th><th>Description</th></tr></thead>
        <tbody>
          ${data.finance.slice().reverse().map(item => `
            <tr>
              <td>${item.date}</td>
              <td>${escape(item.type)}</td>
              <td>Rs. ${item.amount.toFixed(2)}</td>
              <td>${escape(item.desc)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="result" style="margin-top:1rem">
        <strong>Income:</strong> Rs. ${income.toFixed(2)}<br>
        <strong>Expense:</strong> Rs. ${expense.toFixed(2)}<br>
        <strong>Net:</strong> Rs. ${(income - expense).toFixed(2)}
      </div>
    `;
  }

  function renderAll(){
    renderSummary();
    renderMembers();
    renderPast();
    renderDue();
    renderAttendance();
    renderStaff();
    renderHours();
    renderFinance();
  }

  renderProfile();
  renderAll();
  syncSectionFromHash();

  tabLinks.forEach(link => {
    link.addEventListener('click', function(e){
      e.preventDefault();
      const target = (link.getAttribute('href') || '#profile').slice(1);
      history.replaceState(null, '', `#${target}`);
      showSection(target);
    });
  });

  window.addEventListener('hashchange', syncSectionFromHash);
  window.__sfAdmin = { allowed:true, data, saveData, renderAll };
})();
