// Simple client-side auth simulation using localStorage
(function(){
  const AUTH_KEY = 'sf_user';
  function getUser(){try{return JSON.parse(localStorage.getItem(AUTH_KEY))}catch(e){return null}}
  function setUser(u){localStorage.setItem(AUTH_KEY, JSON.stringify(u))}
  function clearUser(){localStorage.removeItem(AUTH_KEY)}

  function escapeHtml(str){ return String(str||'').replace(/[&<>\\\"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c] }) }

  function render(){
    const area = document.getElementById('auth-area');
    if(!area) return;
    const user = getUser();
    if(user){
      const roleLabel = user.role === 'admin' ? ' (Admin)' : '';
      area.innerHTML = `
        <div class="auth-menu">
          <button id="account-btn" class="auth-btn" aria-haspopup="true" aria-expanded="false">Hi, ${escapeHtml(user.name||user.email||'Member')}${roleLabel} ▾</button>
          <div id="auth-dropdown" class="auth-dropdown" style="display:none" role="menu">
            <a href="account.html" role="menuitem">Account settings</a>
            <button id="logout-btn" role="menuitem">Logout</button>
          </div>
        </div>
      `;
      attachMenu();
      updateNavForRole(user.role);
    } else {
      area.innerHTML = `<button id="auth-btn" class="auth-btn">Login</button>`;
      const btn = document.getElementById('auth-btn');
      if(btn) btn.addEventListener('click', showLoginModal);
      updateNavForRole(null);
    }
  }

  // Swap header navigation links when an admin is signed in.
  function updateNavForRole(role){
    try{
      const nav = document.querySelector('nav.main-nav');
      if(!nav) return;
      if(role === 'admin'){
        nav.innerHTML = `
          <a href="admin.html#members">Members</a>
          <a href="admin.html#past">Past Members</a>
          <a href="admin.html#due">Due Members</a>
          <a href="admin.html#attendance">Attendance</a>
          <a href="admin.html#staff">Staff Attendance</a>
          <a href="admin.html#hours">Working Hours</a>
          <a href="admin.html#calendar">Calendar</a>
          <a href="admin.html#finance">Incomes & Expenses</a>
        `;
        nav.classList.add('admin-mode');
      } else {
        // restore public nav
        nav.innerHTML = `
          <a href="index.html">Home</a>
          <a href="workouts.html">Workouts</a>
          <a href="nutrition.html">Nutrition</a>
          <a href="membership.html">Membership</a>
          <a href="bmi.html">BMI</a>
          <a href="calories.html">Calorie Calc</a>
        `;
        nav.classList.remove('admin-mode');
      }
    }catch(e){/* ignore */}
  }

  function attachMenu(){
    const accBtn = document.getElementById('account-btn');
    const dd = document.getElementById('auth-dropdown');
    const logout = document.getElementById('logout-btn');
    if(!accBtn || !dd) return;
    accBtn.addEventListener('click', (e)=>{
      e.stopPropagation();
      const opened = dd.style.display === 'block';
      dd.style.display = opened ? 'none' : 'block';
      accBtn.setAttribute('aria-expanded', !opened);
    });
    logout.addEventListener('click', ()=>{ clearUser(); render(); });
    // close on outside click
    document.addEventListener('click', function(){ if(dd) dd.style.display='none'; if(accBtn) accBtn.setAttribute('aria-expanded','false') });
  }

  // Modal login UI
  function showLoginModal(){
    // avoid multiple modals
    if(document.getElementById('sf-auth-modal')) return;
    const modalHtml = `
      <div id="sf-auth-modal" class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="sf-auth-title">
        <div class="modal" role="document">
          <h3 id="sf-auth-title">Sign in to Smash</h3>
          <form id="sf-auth-form" class="modal-form" autocomplete="on">
            <label class="small">Full name</label>
            <input id="sf-name" class="input" name="name" placeholder="Your full name" required>
            <label class="small" style="margin-top:8px">Email (optional)</label>
            <input id="sf-email" class="input" name="email" placeholder="you@example.com" type="email">
            <label class="small" style="margin-top:8px">Role</label>
            <select id="sf-role" class="input" name="role">
              <option value="member" selected>Member</option>
              <option value="admin">Admin</option>
            </select>
            <div style="margin-top:12px;display:flex;gap:8px;justify-content:flex-end">
              <button type="button" id="sf-cancel" class="btn secondary">Cancel</button>
              <button type="submit" id="sf-submit" class="btn">Continue</button>
            </div>
          </form>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = document.getElementById('sf-auth-modal');
    const form = document.getElementById('sf-auth-form');
    const nameIn = document.getElementById('sf-name');
    const emailIn = document.getElementById('sf-email');
    const cancelBtn = document.getElementById('sf-cancel');

    // focus first input
    setTimeout(()=> nameIn.focus(), 10);

    function closeModal(){ if(modal) modal.remove(); }

    cancelBtn.addEventListener('click', ()=>{ closeModal(); });
    modal.addEventListener('click', (e)=>{ if(e.target === modal) closeModal(); });
    document.addEventListener('keydown', function escHandler(e){ if(e.key==='Escape'){ closeModal(); document.removeEventListener('keydown', escHandler) } });

    form.addEventListener('submit', function(ev){
      ev.preventDefault();
      const name = nameIn.value.trim();
      const email = emailIn.value.trim();
      const role = (document.getElementById('sf-role')||{}).value || 'member';
      if(!name){ nameIn.focus(); nameIn.classList.add('input-error'); return }
      setUser({name, email, role});
      closeModal();
      // Auto-redirect admins to the admin dashboard after sign-in
      if(role === 'admin'){
        // small timeout to ensure modal removal and storage write complete
        setTimeout(()=> { window.location.href = 'admin.html'; }, 100);
      } else {
        render();
      }
    });
  }

  // keep header in sync on storage events (e.g., account page saves)
  window.addEventListener('storage', function(){ render(); });

  // init
  document.addEventListener('DOMContentLoaded', render);
})();
