(function(){
  const STORAGE_KEY = 'sf_platform_data_v2';
  const USER_KEY = 'sf_user';
  const PENDING_PLAN_KEY = 'sf_pending_member_plan';

  const seed = {
    members: [
      {
        id: 'm_raghu',
        name: 'Raghuveer V',
        email: 'raghu@example.com',
        phone: '+91 90000 11111',
        plan: 'Elite Annual',
        membershipStatus: 'active',
        joinDate: '2026-01-15',
        renewalDate: '2027-01-15',
        trainerId: 't_arjun',
        goals: ['Muscle gain', 'Consistency'],
        notes: 'Prefers evening training slots',
        biometricId: 'BIO-1024'
      },
      {
        id: 'm_priya',
        name: 'Priya Sharma',
        email: 'priya@example.com',
        phone: '+91 90000 22222',
        plan: 'Pro 6-Month',
        membershipStatus: 'active',
        joinDate: '2026-02-01',
        renewalDate: '2026-08-01',
        trainerId: 't_nisha',
        goals: ['Fat loss', 'Mobility'],
        notes: 'Morning cardio sessions',
        biometricId: 'BIO-1051'
      }
    ],
    past: [],
    trainers: [
      { id: 't_arjun', name: 'Arjun Menon', specialty: 'Strength and hypertrophy', experience: '7 years', slots: ['06:00', '07:00', '18:00', '19:00'] },
      { id: 't_nisha', name: 'Nisha Varma', specialty: 'Fat loss and conditioning', experience: '5 years', slots: ['08:00', '09:00', '17:00'] },
      { id: 't_karan', name: 'Karan Deep', specialty: 'Athletic performance', experience: '6 years', slots: ['10:00', '11:00', '20:00'] }
    ],
    staff: [
      { id: 's_frontdesk', name: 'Asha Kulkarni', role: 'Front Desk' },
      { id: 's_cashier', name: 'Ritesh Pawar', role: 'Cashier' },
      { id: 's_housekeeping', name: 'Mina Deshpande', role: 'Cleaning Staff' }
    ],
    plans: [
      { id: 'plan_basic', name: 'Basic Monthly', duration: '1 month', durationMonths: 1, price: 1500, features: ['Gym access', 'Workout starter sheet'] },
      { id: 'plan_pro', name: 'Pro 6-Month', duration: '6 months', durationMonths: 6, price: 7500, features: ['Gym access', 'Nutrition review', 'Priority renewal reminder'] },
      { id: 'plan_elite', name: 'Elite Annual', duration: '12 months', durationMonths: 12, price: 14000, features: ['Gym access', 'Trainer review', 'Progress tracking', 'Priority booking'] }
    ],
    classes: [
      { id: 'c_hiit', name: 'HIIT Blast', trainerId: 't_nisha', day: 'Monday', time: '07:00', capacity: 16, booked: ['m_priya'] },
      { id: 'c_strength', name: 'Strength Lab', trainerId: 't_arjun', day: 'Wednesday', time: '18:30', capacity: 12, booked: ['m_raghu'] },
      { id: 'c_core', name: 'Core and Mobility', trainerId: 't_karan', day: 'Saturday', time: '09:00', capacity: 14, booked: [] }
    ],
    appointments: [
      { id: 'a_1', memberId: 'm_raghu', trainerId: 't_arjun', date: '2026-04-02', time: '18:00', type: 'Personal training', status: 'confirmed' },
      { id: 'a_2', memberId: 'm_priya', trainerId: 't_nisha', date: '2026-04-03', time: '08:00', type: 'Progress review', status: 'confirmed' }
    ],
    attendance: {
      '2026-03-29': ['m_raghu'],
      '2026-03-30': ['m_raghu', 'm_priya'],
      '2026-03-31': ['m_priya']
    },
    staffAttendance: {
      '2026-04-01': ['s_frontdesk', 's_cashier']
    },
    finance: [
      { id: 'f_1', memberId: 'm_raghu', type: 'income', category: 'membership', amount: 14000, desc: 'Elite annual renewal', date: '2026-01-15', status: 'paid' },
      { id: 'f_2', memberId: 'm_priya', type: 'income', category: 'membership', amount: 7500, desc: 'Pro membership', date: '2026-02-01', status: 'paid' },
      { id: 'f_3', type: 'expense', category: 'operations', amount: 3200, desc: 'Equipment servicing', date: '2026-03-20', status: 'paid' }
    ],
    invoices: [
      { id: 'inv_1001', memberId: 'm_raghu', amount: 14000, dueDate: '2026-01-15', status: 'paid' },
      { id: 'inv_1002', memberId: 'm_priya', amount: 7500, dueDate: '2026-02-01', status: 'paid' }
    ],
    progress: {
      m_raghu: [
        { date: '2026-02-01', weight: 72, bodyFat: 18, chest: 38, waist: 32, note: 'Starting block' },
        { date: '2026-03-01', weight: 73.5, bodyFat: 17.2, chest: 39, waist: 31.5, note: 'Strength improving' }
      ],
      m_priya: [
        { date: '2026-02-05', weight: 68, bodyFat: 29, chest: 35, waist: 33, note: 'Starting point' },
        { date: '2026-03-10', weight: 65.8, bodyFat: 27.4, chest: 35, waist: 31.2, note: 'Strong compliance' }
      ]
    },
    notifications: [
      { id: 'n_1', role: 'member', memberId: 'm_raghu', title: 'Workout review due', message: 'Log your training performance after today’s push session.', date: '2026-04-01', read: false },
      { id: 'n_2', role: 'member', memberId: 'm_priya', title: 'Class reminder', message: 'HIIT Blast starts tomorrow at 07:00.', date: '2026-04-01', read: false },
      { id: 'n_3', role: 'admin', title: 'Renewals coming up', message: '2 members renew in the next 30 days.', date: '2026-04-01', read: false }
    ],
    leads: [
      { id: 'lead_1', name: 'Ankit', source: 'Instagram', status: 'tour-booked', interest: 'Fat loss' },
      { id: 'lead_2', name: 'Megha', source: 'Walk-in', status: 'follow-up', interest: 'Personal training' }
    ],
    settings: {
      gymName: 'Smash Fitness Studio',
      location: 'SIU Campus Road, Pune',
      whatsapp: '+91 90000 33333',
      email: 'hello@smashfit.example',
      hours: { Mon:['06:00','22:00'], Tue:['06:00','22:00'], Wed:['06:00','22:00'], Thu:['06:00','22:00'], Fri:['06:00','22:00'], Sat:['07:00','20:00'], Sun:['08:00','18:00'] }
    }
  };

  function clone(value){
    return JSON.parse(JSON.stringify(value));
  }

  function localDateKey(date){
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function parseDateParts(value){
    const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if(!match) return null;
    return {
      year: Number(match[1]),
      month: Number(match[2]),
      day: Number(match[3])
    };
  }

  function addMonths(dateValue, monthsToAdd){
    const parts = parseDateParts(dateValue);
    const base = parts
      ? new Date(parts.year, parts.month - 1, parts.day)
      : new Date();
    base.setMonth(base.getMonth() + Number(monthsToAdd || 0));
    return localDateKey(base);
  }

  function normalizePlanDuration(value){
    const months = Number(value || 0);
    if(months >= 12) return 12;
    if(months >= 6) return 6;
    return 1;
  }

  function getPlanByDuration(durationMonths){
    const months = normalizePlanDuration(durationMonths);
    return seed.plans.find(function(plan){
      return Number(plan.durationMonths || 0) === months;
    }) || seed.plans[0];
  }

  function getPlanByName(planName){
    const normalized = String(planName || '').trim().toLowerCase();
    if(!normalized) return null;

    return seed.plans.find(function(plan){
      return plan.name.toLowerCase() === normalized;
    }) || seed.plans.find(function(plan){
      return normalized.indexOf('elite') > -1 && plan.name.toLowerCase().indexOf('elite') > -1;
    }) || seed.plans.find(function(plan){
      return normalized.indexOf('pro') > -1 && plan.name.toLowerCase().indexOf('pro') > -1;
    }) || seed.plans.find(function(plan){
      return normalized.indexOf('basic') > -1 && plan.name.toLowerCase().indexOf('basic') > -1;
    }) || null;
  }

  function getPlanForMember(member){
    const fromName = getPlanByName(member && member.plan);
    if(fromName) return fromName;
    return getPlanByDuration(member && member.durationMonths ? member.durationMonths : 1);
  }

  function matchesUserRecord(record, user){
    if(!record || !user) return false;
    if(user.email && record.email){
      return record.email.toLowerCase() === user.email.toLowerCase();
    }
    return (record.name || '').toLowerCase() === (user.name || '').toLowerCase();
  }

  function normalizeData(raw){
    const source = raw && typeof raw === 'object' ? raw : {};
    const data = clone(seed);
    const listKeys = ['members', 'past', 'trainers', 'staff', 'plans', 'classes', 'appointments', 'finance', 'invoices', 'notifications', 'leads'];
    const objectKeys = ['attendance', 'staffAttendance', 'progress'];

    listKeys.forEach(function(key){
      if(Array.isArray(source[key])){
        data[key] = source[key];
      }
    });

    objectKeys.forEach(function(key){
      if(source[key] && typeof source[key] === 'object'){
        data[key] = source[key];
      }
    });

    if(source.settings && typeof source.settings === 'object'){
      data.settings = Object.assign({}, data.settings, source.settings);
      data.settings.hours = Object.assign({}, seed.settings.hours, source.settings.hours || {});
    }

    Object.keys(data.staffAttendance || {}).forEach(function(dateKey){
      const upgradedIds = [];
      (data.staffAttendance[dateKey] || []).forEach(function(id){
        const existingStaff = (data.staff || []).find(function(staffMember){
          return staffMember.id === id;
        });
        if(existingStaff){
          upgradedIds.push(existingStaff.id);
          return;
        }

        const trainer = (data.trainers || []).find(function(entry){
          return entry.id === id;
        });
        if(trainer){
          const derivedId = `s_${trainer.id.replace(/^t_/, '')}`;
          let trainerStaff = (data.staff || []).find(function(staffMember){
            return staffMember.id === derivedId || staffMember.name.toLowerCase() === trainer.name.toLowerCase();
          });
          if(!trainerStaff){
            trainerStaff = { id: derivedId, name: trainer.name, role: 'Trainer' };
            data.staff.push(trainerStaff);
          }
          upgradedIds.push(trainerStaff.id);
        }
      });
      data.staffAttendance[dateKey] = upgradedIds.filter(function(id, index){
        return upgradedIds.indexOf(id) === index;
      });
    });

    return data;
  }

  function load(){
    try{
      return normalizeData(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'));
    } catch(e){
      return clone(seed);
    }
  }

  function save(data){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeData(data)));
  }

  function getUser(){
    try{
      return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    } catch(e){
      return null;
    }
  }

  function readPendingMemberPlan(){
    try{
      return JSON.parse(localStorage.getItem(PENDING_PLAN_KEY) || 'null');
    } catch(e){
      return null;
    }
  }

  function clearPendingMemberPlan(){
    localStorage.removeItem(PENDING_PLAN_KEY);
  }

  function resolvePendingMemberPlan(){
    const pending = readPendingMemberPlan();
    if(!pending || typeof pending !== 'object') return null;
    return getPlanByName(pending.name) || getPlanByDuration(pending.durationMonths);
  }

  function getMemberRecord(data, user){
    if(!user) return null;
    return data.members.find(function(member){
      return matchesUserRecord(member, user);
    }) || null;
  }

  function getArchivedMemberRecord(data, user){
    if(!user) return null;
    return (data.past || []).find(function(member){
      return matchesUserRecord(member, user);
    }) || null;
  }

  function ensureMemberForUser(data, user){
    let member = getMemberRecord(data, user);
    if(member) return member;
    if(getArchivedMemberRecord(data, user)){
      clearPendingMemberPlan();
      return null;
    }
    const pendingPlan = resolvePendingMemberPlan();
    if(readPendingMemberPlan()) clearPendingMemberPlan();
    const plan = pendingPlan || getPlanByDuration(1);
    member = {
      id: `m_${Math.random().toString(36).slice(2, 8)}`,
      name: user.name || 'Member',
      email: user.email || '',
      phone: '',
      plan: plan.name,
      durationMonths: plan.durationMonths,
      membershipStatus: 'active',
      joinDate: localDateKey(new Date()),
      renewalDate: addMonths(localDateKey(new Date()), plan.durationMonths),
      trainerId: 't_arjun',
      goals: ['General fitness'],
      notes: 'Created from member login',
      biometricId: `BIO-${Math.floor(Math.random() * 9000) + 1000}`
    };
    data.members.push(member);
    return member;
  }

  function syncPendingMemberPlan(data, user){
    if(!user || user.role !== 'member') return false;

    const pending = readPendingMemberPlan();
    if(!pending){
      return false;
    }

    const plan = resolvePendingMemberPlan();
    if(!plan){
      clearPendingMemberPlan();
      return false;
    }

    const member = getMemberRecord(data, user);
    if(!member){
      return false;
    }
    clearPendingMemberPlan();

    const currentPlan = getPlanForMember(member);
    const unchanged = currentPlan
      && currentPlan.name === plan.name
      && Number(member.durationMonths || currentPlan.durationMonths || 0) === plan.durationMonths;

    if(unchanged){
      return false;
    }

    const selectedOn = localDateKey(new Date());
    member.plan = plan.name;
    member.durationMonths = plan.durationMonths;
    member.membershipStatus = 'active';
    member.joinDate = selectedOn;
    member.renewalDate = addMonths(selectedOn, plan.durationMonths);

    data.invoices.unshift({
      id: `inv_${Math.floor(Math.random() * 9000) + 1000}`,
      memberId: member.id,
      amount: plan.price,
      dueDate: selectedOn,
      status: 'paid'
    });

    data.finance.unshift({
      id: `f_${Math.random().toString(36).slice(2, 8)}`,
      memberId: member.id,
      type: 'income',
      category: 'membership',
      amount: plan.price,
      desc: `${plan.name} plan selected`,
      date: selectedOn,
      status: 'paid'
    });

    addNotification(data, {
      role: 'member',
      memberId: member.id,
      title: 'Membership updated',
      message: `Your ${plan.name} plan is active through ${member.renewalDate}.`
    });

    addNotification(data, {
      role: 'admin',
      title: 'Membership plan selected',
      message: `${member.name} selected the ${plan.name} plan.`
    });

    return true;
  }

  function getMemberNameById(data, memberId){
    const record = (data.members || []).find(function(member){
      return member.id === memberId;
    }) || (data.past || []).find(function(member){
      return member.id === memberId;
    }) || null;
    return record ? record.name : '';
  }

  function archiveMember(data, memberId){
    const index = (data.members || []).findIndex(function(member){
      return member.id === memberId;
    });
    if(index < 0) return null;

    const member = data.members.splice(index, 1)[0];
    member.membershipStatus = 'inactive';
    member.archivedDate = localDateKey(new Date());
    data.past = data.past || [];
    data.past.unshift(member);

    (data.classes || []).forEach(function(groupClass){
      groupClass.booked = (groupClass.booked || []).filter(function(id){
        return id !== memberId;
      });
    });

    (data.appointments || []).forEach(function(appointment){
      if(appointment.memberId === memberId && appointment.status !== 'completed'){
        appointment.status = 'cancelled';
      }
    });

    return member;
  }

  function addNotification(data, notification){
    data.notifications.unshift(Object.assign({
      id: `n_${Math.random().toString(36).slice(2, 8)}`,
      date: new Date().toISOString().slice(0, 10),
      read: false
    }, notification));
  }

  window.SmashData = {
    STORAGE_KEY,
    seed,
    load,
    save,
    clone,
    addMonths,
    getPlanByDuration,
    getPlanByName,
    getPlanForMember,
    getUser,
    syncPendingMemberPlan,
    getMemberRecord,
    getArchivedMemberRecord,
    getMemberNameById,
    ensureMemberForUser,
    archiveMember,
    addNotification
  };
})();
