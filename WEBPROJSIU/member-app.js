(function(){
  const USER_KEY = 'sf_user';
  const PUBLIC_HOME = 'index.html';
  const q = function(id){ return document.getElementById(id); };
  const nameEl = q('acct-name');
  const emailEl = q('acct-email');
  const msgEl = q('acctMsg');
  const modeArea = q('modeArea');
  const saveBtn = q('saveAcct');
  const clearBtn = q('clearAcct');
  const allowedSections = ['overview', 'attendance', 'classes', 'billing', 'progress'];
  let currentSection = readSectionFromHash();
  let messageTimer = null;

  function escape(value){
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function localDateKey(date){
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function today(){
    return localDateKey(new Date());
  }

  function formatMoney(value){
    return `Rs. ${Number(value || 0).toFixed(0)}`;
  }

  function getUser(){
    try{
      return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    } catch(e){
      return null;
    }
  }

  function setUser(user){
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  function setMessage(text, persist){
    if(!msgEl) return;
    msgEl.textContent = text || '';
    if(messageTimer){
      clearTimeout(messageTimer);
      messageTimer = null;
    }
    if(text && !persist){
      messageTimer = setTimeout(function(){
        msgEl.textContent = '';
      }, 2400);
    }
  }

  function syncForm(user){
    if(!nameEl || !emailEl) return;
    nameEl.value = user && user.name ? user.name : '';
    emailEl.value = user && user.email ? user.email : '';
  }

  function readSectionFromHash(){
    const raw = (window.location.hash || '#overview').replace('#', '');
    return allowedSections.indexOf(raw) > -1 ? raw : 'overview';
  }

  function updateHash(section){
    const next = allowedSections.indexOf(section) > -1 ? section : 'overview';
    try{
      history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${next}`);
    } catch(e){
      window.location.hash = next;
    }
  }

  function getContext(){
    const user = getUser();
    if(!user || user.role !== 'member') return null;

    const data = SmashData.load();
    if(SmashData.syncPendingMemberPlan(data, user)){
      SmashData.save(data);
    }
    let member = SmashData.getMemberRecord(data, user);
    const archivedMember = SmashData.getArchivedMemberRecord(data, user);
    if(!member && archivedMember){
      const archivedTrainer = data.trainers.find(function(item){
        return item.id === archivedMember.trainerId;
      }) || null;
      return {
        user: user,
        data: data,
        member: archivedMember,
        trainer: archivedTrainer,
        archived: true
      };
    }
    if(!member){
      member = SmashData.ensureMemberForUser(data, user);
      if(!member){
        return null;
      }
      SmashData.save(data);
    }

    const trainer = data.trainers.find(function(item){
      return item.id === member.trainerId;
    }) || null;

    const appointments = data.appointments
      .filter(function(item){ return item.memberId === member.id; })
      .slice()
      .sort(function(a, b){
        return `${a.date}T${a.time || '00:00'}`.localeCompare(`${b.date}T${b.time || '00:00'}`);
      });
    const upcomingAppointments = appointments.filter(function(item){
      const status = String(item.status || '').toLowerCase();
      if(status === 'cancelled' || status === 'completed') return false;
      return `${item.date}T${item.time || '00:00'}` >= `${today()}T00:00`;
    });

    const visitDates = Object.keys(data.attendance || {})
      .filter(function(dateKey){
        return (data.attendance[dateKey] || []).indexOf(member.id) > -1;
      })
      .sort();

    const recentVisits = visitDates.slice().reverse().slice(0, 8);
    const checkedInToday = recentVisits.indexOf(today()) > -1;

    let streak = 0;
    const cursor = new Date();
    while(true){
      const dateKey = localDateKey(cursor);
      if((data.attendance[dateKey] || []).indexOf(member.id) > -1){
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }

    const invoices = data.invoices.filter(function(item){
      return item.memberId === member.id;
    });

    const notifications = data.notifications.filter(function(item){
      return item.role === 'member' && (!item.memberId || item.memberId === member.id);
    }).slice(0, 6);

    const progressEntries = (data.progress[member.id] || []).slice().sort(function(a, b){
      return b.date.localeCompare(a.date);
    });

    const bookedClasses = data.classes.filter(function(item){
      return item.booked.indexOf(member.id) > -1;
    });

    const balanceDue = invoices
      .filter(function(item){ return item.status !== 'paid'; })
      .reduce(function(sum, item){ return sum + Number(item.amount || 0); }, 0);

    return {
      user: user,
      data: data,
      member: member,
      trainer: trainer,
      appointments: appointments,
      nextAppointment: upcomingAppointments[0] || appointments[0] || null,
      visitDates: visitDates,
      recentVisits: recentVisits,
      checkedInToday: checkedInToday,
      streak: streak,
      invoices: invoices,
      notifications: notifications,
      progressEntries: progressEntries,
      bookedClasses: bookedClasses,
      balanceDue: balanceDue
    };
  }

  function buildNotificationList(notifications){
    if(!notifications.length){
      return '<p class="small-muted">No alerts right now. Your member inbox is clear.</p>';
    }
    return `<ul class="feature-list">${notifications.map(function(item){
      return `<li><span><strong>${escape(item.title)}</strong><br><span class="small-muted">${escape(item.message)}</span></span></li>`;
    }).join('')}</ul>`;
  }

  function buildOverviewHtml(context){
    const member = context.member;
    const trainer = context.trainer;
    const latestProgress = context.progressEntries[0] || null;
    return `
      <span class="page-pill">Overview</span>
      <h2>Membership overview</h2>
      <p class="muted">This section keeps your gym essentials in one clean place without mixing in public or admin pages.</p>
      <div class="split-layout member-section-grid" style="margin-top:1rem">
        <div class="card compact-card">
          <span class="page-pill">Plan</span>
          <h3>${escape(member.plan)}</h3>
          <ul class="feature-list">
            <li><span><strong>Status</strong><br><span class="small-muted">${escape(member.membershipStatus || 'active')}</span></span></li>
            <li><span><strong>Renewal date</strong><br><span class="small-muted">${escape(member.renewalDate || '-')}</span></span></li>
            <li><span><strong>Goals</strong><br><span class="small-muted">${escape((member.goals || ['General fitness']).join(', '))}</span></span></li>
          </ul>
        </div>
        <div class="card compact-card">
          <span class="page-pill">Coach</span>
          <h3>${trainer ? escape(trainer.name) : 'Trainer pending'}</h3>
          <ul class="feature-list">
            <li><span><strong>Specialty</strong><br><span class="small-muted">${trainer ? escape(trainer.specialty) : 'Trainer assignment will appear here.'}</span></span></li>
            <li><span><strong>Experience</strong><br><span class="small-muted">${trainer ? escape(trainer.experience) : 'Pending'}</span></span></li>
            <li><span><strong>Next appointment</strong><br><span class="small-muted">${context.nextAppointment ? escape(`${context.nextAppointment.type} on ${context.nextAppointment.date} at ${context.nextAppointment.time}`) : 'No session booked yet.'}</span></span></li>
          </ul>
        </div>
      </div>
      <div class="split-layout member-section-grid" style="margin-top:1rem">
        <div class="card compact-card">
          <span class="page-pill">Notifications</span>
          <h3>Member alerts</h3>
          ${buildNotificationList(context.notifications)}
        </div>
        <div class="card compact-card">
          <span class="page-pill">Progress</span>
          <h3>Latest check-in</h3>
          ${latestProgress ? `<div class="result"><strong>${escape(latestProgress.date)}</strong><br><span class="muted">Weight ${escape(latestProgress.weight)} kg, body fat ${escape(latestProgress.bodyFat)}%, waist ${escape(latestProgress.waist)} in.</span></div>` : '<p class="small-muted">Your first progress log will appear here after a trainer review.</p>'}
        </div>
      </div>
    `;
  }

  function buildAttendanceHtml(context){
    const visitCountThisMonth = context.visitDates.filter(function(dateKey){
      return dateKey.slice(0, 7) === today().slice(0, 7);
    }).length;

    const visitList = context.recentVisits.length
      ? `<ul class="feature-list">${context.recentVisits.map(function(dateKey){
          return `<li><span><strong>${escape(dateKey)}</strong><br><span class="small-muted">Biometric attendance captured.</span></span></li>`;
        }).join('')}</ul>`
      : '<p class="small-muted">No visits have been recorded yet.</p>';

    return `
      <span class="page-pill">Attendance</span>
      <h2>Biometric attendance</h2>
      <p class="muted">Check in privately from member mode and keep a clear attendance history.</p>
      <div class="split-layout member-section-grid" style="margin-top:1rem">
        <div class="card compact-card member-action-card">
          <span class="page-pill">Today</span>
          <h3>${context.checkedInToday ? 'Check-in complete' : 'Ready for check-in'}</h3>
          <p class="muted">Biometric ID: ${escape(context.member.biometricId || 'Pending')}</p>
          <div class="cta-row">
            <button type="button" class="btn" data-member-action="check-in" ${context.checkedInToday ? 'disabled' : ''}>${context.checkedInToday ? 'Already checked in' : 'Mark biometric attendance'}</button>
          </div>
        </div>
        <div class="card compact-card">
          <span class="page-pill">History</span>
          <h3>Consistency snapshot</h3>
          <div class="kpi-row" style="margin-top:1rem">
            <div class="kpi"><strong>${context.visitDates.length}</strong><span class="muted">Total visits</span></div>
            <div class="kpi"><strong>${visitCountThisMonth}</strong><span class="muted">This month</span></div>
            <div class="kpi"><strong>${context.streak}</strong><span class="muted">Current streak</span></div>
          </div>
          ${visitList}
        </div>
      </div>
    `;
  }

  function buildAppointmentTable(context){
    if(!context.appointments.length){
      return '<p class="small-muted">No personal training or review sessions are booked yet.</p>';
    }
    return `
      <table>
        <thead><tr><th>Session</th><th>Date</th><th>Coach</th><th>Status</th></tr></thead>
        <tbody>
          ${context.appointments.map(function(item){
            const trainer = context.data.trainers.find(function(entry){ return entry.id === item.trainerId; });
            return `<tr><td>${escape(item.type)}</td><td>${escape(item.date)} ${escape(item.time || '')}</td><td>${trainer ? escape(trainer.name) : '-'}</td><td>${escape(item.status)}</td></tr>`;
          }).join('')}
        </tbody>
      </table>
    `;
  }

  function buildClassCards(context){
    return context.data.classes.map(function(groupClass){
      const trainer = context.data.trainers.find(function(item){ return item.id === groupClass.trainerId; });
      const booked = groupClass.booked.indexOf(context.member.id) > -1;
      const full = groupClass.booked.length >= groupClass.capacity && !booked;
      const openSeats = Math.max(groupClass.capacity - groupClass.booked.length, 0);
      return `
        <div class="card compact-card">
          <span class="page-pill">${escape(groupClass.day)} ${escape(groupClass.time)}</span>
          <h3>${escape(groupClass.name)}</h3>
          <p class="muted">${trainer ? escape(trainer.name) : 'Assigned coach'}${trainer ? ` • ${escape(trainer.specialty)}` : ''}</p>
          <p class="small-muted">${booked ? 'You are booked for this class.' : full ? 'Class is currently full.' : `${openSeats} seats available.`}</p>
          <div class="cta-row" style="margin-top:0.9rem">
            <button type="button" class="btn ${booked ? 'secondary' : ''}" data-class-booking="${escape(groupClass.id)}" ${full ? 'disabled' : ''}>${booked ? 'Cancel booking' : 'Book class'}</button>
          </div>
        </div>
      `;
    }).join('');
  }

  function buildClassesHtml(context){
    return `
      <span class="page-pill">Classes</span>
      <h2>Classes and sessions</h2>
      <p class="muted">Your member area should let you manage training without exposing public site pages.</p>
      <div class="cards dense-cards" style="margin-top:1rem">
        ${buildClassCards(context)}
      </div>
      <div class="card compact-card" style="margin-top:1rem">
        <span class="page-pill">Appointments</span>
        <h3>Upcoming coaching sessions</h3>
        ${buildAppointmentTable(context)}
      </div>
    `;
  }

  function buildBillingHtml(context){
    const unpaidCount = context.invoices.filter(function(item){ return item.status !== 'paid'; }).length;
    const invoicesHtml = context.invoices.length ? `
      <table>
        <thead><tr><th>Invoice</th><th>Due date</th><th>Amount</th><th>Status</th></tr></thead>
        <tbody>
          ${context.invoices.map(function(invoice){
            return `<tr><td>${escape(invoice.id)}</td><td>${escape(invoice.dueDate)}</td><td>${formatMoney(invoice.amount)}</td><td>${escape(invoice.status)}</td></tr>`;
          }).join('')}
        </tbody>
      </table>
    ` : '<p class="small-muted">No invoices generated yet.</p>';

    return `
      <span class="page-pill">Billing</span>
      <h2>Plan and payments</h2>
      <p class="muted">Track renewals, invoices, and dues from your private member dashboard.</p>
      <div class="split-layout member-section-grid" style="margin-top:1rem">
        <div class="card compact-card">
          <span class="page-pill">Current plan</span>
          <h3>${escape(context.member.plan)}</h3>
          <div class="kpi-row" style="margin-top:1rem">
            <div class="kpi"><strong>${escape(context.member.renewalDate || '-')}</strong><span class="muted">Renewal date</span></div>
            <div class="kpi"><strong>${formatMoney(context.balanceDue)}</strong><span class="muted">Balance due</span></div>
            <div class="kpi"><strong>${unpaidCount}</strong><span class="muted">Open invoices</span></div>
          </div>
        </div>
        <div class="card compact-card">
          <span class="page-pill">Invoices</span>
          <h3>Billing history</h3>
          ${invoicesHtml}
        </div>
      </div>
    `;
  }

  function buildProgressHtml(context){
    const latest = context.progressEntries[0] || null;
    const first = context.progressEntries.length ? context.progressEntries[context.progressEntries.length - 1] : null;
    const progressTable = context.progressEntries.length ? `
      <table>
        <thead><tr><th>Date</th><th>Weight</th><th>Body fat</th><th>Waist</th><th>Coach note</th></tr></thead>
        <tbody>
          ${context.progressEntries.map(function(entry){
            return `<tr><td>${escape(entry.date)}</td><td>${escape(entry.weight)} kg</td><td>${escape(entry.bodyFat)}%</td><td>${escape(entry.waist)} in</td><td>${escape(entry.note)}</td></tr>`;
          }).join('')}
        </tbody>
      </table>
    ` : '<p class="small-muted">No progress logs yet.</p>';

    return `
      <span class="page-pill">Progress</span>
      <h2>Progress tracking</h2>
      <p class="muted">Review your recent body metrics and coaching notes in one focused section.</p>
      <div class="split-layout member-section-grid" style="margin-top:1rem">
        <div class="card compact-card">
          <span class="page-pill">Latest</span>
          <h3>Most recent update</h3>
          ${latest ? `<div class="result"><strong>${escape(latest.date)}</strong><br><span class="muted">Weight ${escape(latest.weight)} kg, body fat ${escape(latest.bodyFat)}%, waist ${escape(latest.waist)} in.</span></div>` : '<p class="small-muted">Your trainer has not added a progress review yet.</p>'}
          ${latest && first ? `<p class="small-muted" style="margin-top:0.85rem">Tracking since ${escape(first.date)} with ${context.progressEntries.length} logged review${context.progressEntries.length === 1 ? '' : 's'}.</p>` : ''}
        </div>
        <div class="card compact-card">
          <span class="page-pill">History</span>
          <h3>Body metrics log</h3>
          ${progressTable}
        </div>
      </div>
    `;
  }

  function buildSummaryHtml(context){
    return `
      <section class="card member-summary">
        <span class="page-pill">Member dashboard</span>
        <h2>${escape(context.member.name)}</h2>
        <p class="muted">Your member dashboard now behaves like a real app: private features only, one focused section at a time, and no public or admin pages mixed in.</p>
        <div class="kpi-row member-stat-grid" style="margin-top:1rem">
          <div class="kpi"><strong>${escape(context.member.plan)}</strong><span class="muted">Current plan</span></div>
          <div class="kpi"><strong>${escape(context.member.renewalDate || '-')}</strong><span class="muted">Renewal date</span></div>
          <div class="kpi"><strong>${context.streak}</strong><span class="muted">Attendance streak</span></div>
          <div class="kpi"><strong>${context.trainer ? escape(context.trainer.name) : 'Pending'}</strong><span class="muted">Assigned trainer</span></div>
        </div>
        <div class="cta-row member-summary-actions" style="margin-top:1rem">
          <button type="button" class="btn" data-member-action="check-in" ${context.checkedInToday ? 'disabled' : ''}>${context.checkedInToday ? 'Checked in today' : 'Biometric attendance'}</button>
          <button type="button" class="btn secondary" data-member-target="classes">Open classes</button>
          <button type="button" class="btn secondary" data-member-target="billing">View billing</button>
        </div>
      </section>
    `;
  }

  function buildArchivedHtml(context){
    return `
      <section class="card member-summary">
        <span class="page-pill">Membership inactive</span>
        <h2>${escape(context.member.name)}</h2>
        <p class="muted">This login matches an archived member record, so attendance, class booking, and billing actions are locked until the front desk reactivates your membership.</p>
        <div class="kpi-row member-stat-grid" style="margin-top:1rem">
          <div class="kpi"><strong>${escape(context.member.plan || 'Previous plan')}</strong><span class="muted">Last plan</span></div>
          <div class="kpi"><strong>${escape(context.member.renewalDate || '-')}</strong><span class="muted">Last renewal date</span></div>
          <div class="kpi"><strong>${context.trainer ? escape(context.trainer.name) : 'Pending'}</strong><span class="muted">Assigned trainer</span></div>
        </div>
        <div class="result" style="margin-top:1rem">
          <strong>Reactivation required</strong><br>
          <span class="muted">Please contact the admin desk to move this profile back into active members before using gym features again.</span>
        </div>
      </section>
    `;
  }

  function renderDashboard(section){
    if(!modeArea) return;
    const context = getContext();
    if(!context){
      modeArea.innerHTML = '';
      return;
    }

    if(context.archived){
      modeArea.innerHTML = `
        <div class="member-dashboard-shell">
          ${buildArchivedHtml(context)}
        </div>
      `;
      Array.from(document.querySelectorAll('[data-member-target]')).forEach(function(button){
        button.classList.remove('active');
      });
      return;
    }

    modeArea.innerHTML = `
      <div class="member-dashboard-shell">
        ${buildSummaryHtml(context)}
        <section class="card member-section" data-member-section="overview">${buildOverviewHtml(context)}</section>
        <section class="card member-section" data-member-section="attendance">${buildAttendanceHtml(context)}</section>
        <section class="card member-section" data-member-section="classes">${buildClassesHtml(context)}</section>
        <section class="card member-section" data-member-section="billing">${buildBillingHtml(context)}</section>
        <section class="card member-section" data-member-section="progress">${buildProgressHtml(context)}</section>
      </div>
    `;

    showSection(section || currentSection, { updateHash: false, scroll: false });
  }

  function showSection(section, options){
    const config = options || {};
    const next = allowedSections.indexOf(section) > -1 ? section : 'overview';
    currentSection = next;

    Array.from(document.querySelectorAll('[data-member-section]')).forEach(function(panel){
      const active = panel.dataset.memberSection === next;
      panel.hidden = !active;
      panel.style.display = active ? 'block' : 'none';
    });

    Array.from(document.querySelectorAll('[data-member-target]')).forEach(function(button){
      button.classList.toggle('active', button.dataset.memberTarget === next);
    });

    if(config.updateHash !== false){
      updateHash(next);
    }

    if(config.scroll !== false){
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function saveProfile(){
    const currentUser = getUser();
    const name = nameEl ? nameEl.value.trim() : '';
    const email = emailEl ? emailEl.value.trim() : '';
    if(!name){
      setMessage('Please enter your name before saving.');
      if(nameEl) nameEl.focus();
      return;
    }

    if(currentUser){
      const data = SmashData.load();
      const member = SmashData.getMemberRecord(data, currentUser) || SmashData.getArchivedMemberRecord(data, currentUser);
      if(member){
        member.name = name;
        member.email = email;
        SmashData.save(data);
      }
    }

    setUser({ name: name, email: email, role: 'member' });
    window.dispatchEvent(new Event('storage'));
    setMessage('Member profile saved.');
    renderDashboard(currentSection);
  }

  function clearProfile(){
    localStorage.removeItem(USER_KEY);
    window.dispatchEvent(new Event('storage'));
    setMessage('Logged out.', true);
    window.location.href = PUBLIC_HOME;
  }

  function markBiometricAttendance(){
    const user = getUser();
    if(!user || user.role !== 'member'){
      setMessage('Member mode is required for biometric attendance.');
      return;
    }

    const data = SmashData.load();
    const member = SmashData.ensureMemberForUser(data, user);
    if(!member){
      setMessage('This membership is archived. Contact the front desk to reactivate it.');
      renderDashboard(currentSection);
      return;
    }
    const dateKey = today();
    data.attendance[dateKey] = data.attendance[dateKey] || [];

    if(data.attendance[dateKey].indexOf(member.id) === -1){
      data.attendance[dateKey].push(member.id);
      SmashData.addNotification(data, {
        role: 'member',
        memberId: member.id,
        title: 'Attendance captured',
        message: `Biometric check-in recorded for ${dateKey}.`
      });
      SmashData.addNotification(data, {
        role: 'admin',
        title: 'Member checked in',
        message: `${member.name} marked attendance for ${dateKey}.`
      });
      SmashData.save(data);
      setMessage('Biometric attendance saved for today.');
    } else {
      setMessage('Today already has a biometric check-in.');
    }

    renderDashboard('attendance');
  }

  function toggleClassBooking(classId){
    const user = getUser();
    if(!user || user.role !== 'member') return;

    const data = SmashData.load();
    const member = SmashData.ensureMemberForUser(data, user);
    if(!member){
      setMessage('Archived memberships cannot manage class bookings.');
      renderDashboard(currentSection);
      return;
    }
    const groupClass = data.classes.find(function(item){ return item.id === classId; });
    if(!groupClass) return;

    const currentIndex = groupClass.booked.indexOf(member.id);
    if(currentIndex > -1){
      groupClass.booked.splice(currentIndex, 1);
      SmashData.addNotification(data, {
        role: 'member',
        memberId: member.id,
        title: 'Class booking cancelled',
        message: `You cancelled ${groupClass.name} on ${groupClass.day} at ${groupClass.time}.`
      });
      SmashData.addNotification(data, {
        role: 'admin',
        title: 'Class seat released',
        message: `${member.name} cancelled ${groupClass.name}.`
      });
      setMessage('Class booking cancelled.');
    } else if(groupClass.booked.length < groupClass.capacity){
      groupClass.booked.push(member.id);
      SmashData.addNotification(data, {
        role: 'member',
        memberId: member.id,
        title: 'Class booked',
        message: `You booked ${groupClass.name} on ${groupClass.day} at ${groupClass.time}.`
      });
      SmashData.addNotification(data, {
        role: 'admin',
        title: 'New class booking',
        message: `${member.name} booked ${groupClass.name}.`
      });
      setMessage('Class booked successfully.');
    } else {
      setMessage('That class is full right now.');
      return;
    }

    SmashData.save(data);
    renderDashboard('classes');
  }

  if(saveBtn){
    saveBtn.addEventListener('click', saveProfile);
  }

  if(clearBtn){
    clearBtn.addEventListener('click', clearProfile);
  }

  document.addEventListener('click', function(event){
    const navButton = event.target.closest('[data-member-target]');
    if(navButton){
      event.preventDefault();
      showSection(navButton.dataset.memberTarget);
      return;
    }

    const actionButton = event.target.closest('[data-member-action="check-in"]');
    if(actionButton){
      event.preventDefault();
      markBiometricAttendance();
      return;
    }

    const classButton = event.target.closest('[data-class-booking]');
    if(classButton){
      event.preventDefault();
      toggleClassBooking(classButton.dataset.classBooking);
    }
  });

  window.addEventListener('hashchange', function(){
    showSection(readSectionFromHash(), { updateHash: false, scroll: false });
  });

  window.addEventListener('storage', function(){
    const user = getUser();
    syncForm(user);
    renderDashboard(currentSection);
  });

  syncForm(getUser());
  renderDashboard(currentSection);
})();
