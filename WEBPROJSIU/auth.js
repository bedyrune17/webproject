// Simple client-side auth simulation using localStorage
(function(){
  const AUTH_KEY = 'sf_user';
  const PENDING_PLAN_KEY = 'sf_pending_member_plan';
  const MEMBER_HOME = 'account.html';
  const ADMIN_HOME = 'admin.html';
  const PUBLIC_HOME = 'index.html';
  let menuOutsideHandler = null;
  let menuEscapeHandler = null;
  function getUser(){try{return JSON.parse(localStorage.getItem(AUTH_KEY))}catch(e){return null}}
  function setUser(u){localStorage.setItem(AUTH_KEY, JSON.stringify(u))}
  function clearUser(){localStorage.removeItem(AUTH_KEY)}

  function escapeHtml(str){ return String(str||'').replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c] }) }
  function getPageScope(){ return (document.body && document.body.dataset && document.body.dataset.pageScope) || 'member' }
  function clearPendingPlanIntent(){ localStorage.removeItem(PENDING_PLAN_KEY) }
  function rememberRequestedPlan(trigger, role){
    if(role !== 'member'){
      clearPendingPlanIntent();
      return;
    }
    const planName = trigger && trigger.dataset ? (trigger.dataset.planName || '').trim() : '';
    const durationMonths = Number(trigger && trigger.dataset ? trigger.dataset.planDuration : 0);
    if(!planName && !durationMonths){
      clearPendingPlanIntent();
      return;
    }
    localStorage.setItem(PENDING_PLAN_KEY, JSON.stringify({
      name: planName,
      durationMonths: durationMonths || undefined,
      requestedAt: new Date().toISOString()
    }));
  }
  function currentFile(){
    const raw = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
    return raw || 'index.html';
  }
  function getPublicActiveHref(){
    const file = currentFile();
    const aliasMap = {
      'personal-training.html': 'workouts.html',
      'nutrition-coaching.html': 'nutrition.html'
    };
    return aliasMap[file] || file;
  }

  function syncActiveNavigation(){
    const nav = document.querySelector('nav.main-nav');
    if(!nav) return;

    const scope = getPageScope();
    const controls = Array.from(nav.querySelectorAll('a, .nav-tab'));
    const defaultHashTarget = (() => {
      const firstControl = controls.find(function(control){
        return (control.getAttribute('href') || '').charAt(0) === '#' || control.dataset.target;
      });
      if(!firstControl) return '';
      return firstControl.getAttribute('href') || `#${firstControl.dataset.target}`;
    })();
    const activeTarget = scope === 'public'
      ? getPublicActiveHref()
      : (window.location.hash || defaultHashTarget);

    controls.forEach(function(control){
      const href = control.getAttribute('href') || '';
      const target = href || (control.dataset.target ? `#${control.dataset.target}` : '');
      const active = target === activeTarget;
      control.classList.toggle('active', active);
      if(active){
        control.setAttribute('aria-current', scope === 'public' ? 'page' : 'location');
      } else {
        control.removeAttribute('aria-current');
      }
    });
  }

  function setupResponsiveHeader(){
    const header = document.querySelector('.site-header');
    const nav = header && header.querySelector('.main-nav');
    if(!header || !nav) return;

    header.classList.add('has-nav-toggle');
    nav.id = nav.id || 'site-nav';

    let toggle = header.querySelector('.nav-toggle');
    if(!toggle){
      toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'nav-toggle';
      toggle.setAttribute('aria-controls', nav.id);
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Toggle navigation menu');
      toggle.innerHTML = `
        <span class="nav-toggle-box" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
        </span>
        <span class="nav-toggle-label">Menu</span>
      `;
      header.insertBefore(toggle, nav);
    }

    function setMenuOpen(open){
      header.classList.toggle('nav-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      const label = toggle.querySelector('.nav-toggle-label');
      if(label) label.textContent = open ? 'Close' : 'Menu';
    }

    if(!toggle.dataset.bound){
      toggle.addEventListener('click', function(event){
        event.stopPropagation();
        setMenuOpen(!header.classList.contains('nav-open'));
      });

      nav.addEventListener('click', function(event){
        if(window.innerWidth > 960) return;
        if(event.target.closest('a, .nav-tab')){
          setMenuOpen(false);
        }
      });

      document.addEventListener('click', function(event){
        if(window.innerWidth > 960) return;
        if(!header.contains(event.target)){
          setMenuOpen(false);
        }
      });

      document.addEventListener('keydown', function(event){
        if(event.key === 'Escape'){
          setMenuOpen(false);
        }
      });

      window.addEventListener('resize', function(){
        if(window.innerWidth > 960){
          setMenuOpen(false);
        }
      });

      toggle.dataset.bound = 'true';
    }
  }

  function enforcePageScope(user){
    const scope = getPageScope();
    if(!user){
      if(scope === 'member' || scope === 'admin'){
        window.location.replace(PUBLIC_HOME);
        return true;
      }
      return false;
    }
    if(scope === 'member' && user.role === 'admin'){
      window.location.replace(ADMIN_HOME);
      return true;
    }
    if(scope === 'admin' && user.role !== 'admin'){
      window.location.replace(MEMBER_HOME);
      return true;
    }
    return false;
  }

  function render(){
    const area = document.getElementById('auth-area');
    if(!area) return;
    const user = getUser();
    if(enforcePageScope(user)) return;
    if(user){
      const roleLabel = user.role === 'admin' ? ' (Admin)' : '';
      const dashboardHref = user.role === 'admin' ? ADMIN_HOME : MEMBER_HOME;
      const dashboardLabel = user.role === 'admin' ? 'Admin dashboard' : 'Member dashboard';
      area.innerHTML = `
        <div class="auth-menu">
          <button id="account-btn" class="auth-btn" aria-haspopup="true" aria-expanded="false">Hi, ${escapeHtml(user.name||user.email||'Member')}${roleLabel} ▾</button>
          <div id="auth-dropdown" class="auth-dropdown" style="display:none" role="menu">
            <a href="${dashboardHref}" role="menuitem">${dashboardLabel}</a>
            <button id="logout-btn" role="menuitem">Logout</button>
          </div>
        </div>
      `;
      attachMenu();
      updateNavForRole(user.role);
    } else {
      area.innerHTML = `<button id="auth-btn" class="auth-btn">Login</button>`;
      const btn = document.getElementById('auth-btn');
      if(btn) btn.addEventListener('click', function(){
        clearPendingPlanIntent();
        showLoginModal();
      });
      updateNavForRole(null);
    }
    setupResponsiveHeader();
    syncActiveNavigation();
  }

  // Swap header navigation links when an admin is signed in.
  function updateNavForRole(role){
    try{
      const nav = document.querySelector('nav.main-nav');
      if(!nav) return;
      const scope = getPageScope();
      const existingQuickLink = nav.querySelector('.admin-quick-link');
      if(existingQuickLink) existingQuickLink.remove();
      if(scope === 'admin'){
        nav.classList.add('admin-mode');
        return;
      }
      nav.classList.remove('admin-mode');
      if(scope === 'member'){
        nav.classList.remove('admin-mode');
        return;
      }
      if(role === 'admin') return;
    }catch(e){/* ignore */}
  }


  function attachMenu(){
    const accBtn = document.getElementById('account-btn');
    const dd = document.getElementById('auth-dropdown');
    const logout = document.getElementById('logout-btn');
    if(!accBtn || !dd) return;
    if(menuOutsideHandler){
      document.removeEventListener('click', menuOutsideHandler);
      menuOutsideHandler = null;
    }
    if(menuEscapeHandler){
      document.removeEventListener('keydown', menuEscapeHandler);
      menuEscapeHandler = null;
    }
    accBtn.addEventListener('click', (e)=>{
      e.stopPropagation();
      const opened = dd.style.display === 'block';
      dd.style.display = opened ? 'none' : 'block';
      accBtn.setAttribute('aria-expanded', opened ? 'false' : 'true');
    });
    logout.addEventListener('click', ()=>{
      clearUser();
      render();
      window.location.href = PUBLIC_HOME;
    });
    menuOutsideHandler = function(event){
      if(!event.target.closest('.auth-menu')){
        dd.style.display = 'none';
        accBtn.setAttribute('aria-expanded', 'false');
      }
    };
    menuEscapeHandler = function(event){
      if(event.key === 'Escape'){
        dd.style.display = 'none';
        accBtn.setAttribute('aria-expanded', 'false');
      }
    };
    document.addEventListener('click', menuOutsideHandler);
    document.addEventListener('keydown', menuEscapeHandler);
  }

  // Modal login UI
  function showLoginModal(defaultRole){
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
    const roleSelect = document.getElementById('sf-role');
    let escHandler = null;
    let didSubmit = false;

    if(roleSelect && (defaultRole === 'admin' || defaultRole === 'member')){
      roleSelect.value = defaultRole;
    }

    // focus first input
    setTimeout(()=> nameIn.focus(), 10);

    function closeModal(){
      if(escHandler){
        document.removeEventListener('keydown', escHandler);
        escHandler = null;
      }
      if(!didSubmit){
        clearPendingPlanIntent();
      }
      if(modal) modal.remove();
    }

    cancelBtn.addEventListener('click', ()=>{ closeModal(); });
    modal.addEventListener('click', (e)=>{ if(e.target === modal) closeModal(); });
    escHandler = function(e){
      if(e.key === 'Escape'){
        closeModal();
      }
    };
    document.addEventListener('keydown', escHandler);

    form.addEventListener('submit', function(ev){
      ev.preventDefault();
      const name = nameIn.value.trim();
      const email = emailIn.value.trim();
      const role = (roleSelect||{}).value || 'member';
      if(!name){ nameIn.focus(); nameIn.classList.add('input-error'); return }
      didSubmit = true;
      if(role !== 'member'){
        clearPendingPlanIntent();
      }
      setUser({name, email, role});
      window.dispatchEvent(new Event('storage'));
      closeModal();
      // Auto-redirect admins to the admin dashboard after sign-in
      if(role === 'admin'){
        // small timeout to ensure modal removal and storage write complete
        setTimeout(()=> { window.location.href = ADMIN_HOME; }, 100);
      } else {
        setTimeout(()=> { window.location.href = MEMBER_HOME; }, 100);
      }
    });
  }

  // keep header in sync on storage events (e.g., account page saves)
  window.addEventListener('storage', function(){ render(); });
  window.addEventListener('hashchange', function(){ syncActiveNavigation(); });
  document.addEventListener('click', function(event){
    const trigger = event.target.closest('[data-open-login]');
    if(!trigger) return;
    event.preventDefault();
    const requestedRole = trigger.dataset.openLogin === 'admin' ? 'admin' : 'member';
    rememberRequestedPlan(trigger, requestedRole);
    const user = getUser();
    if(user && user.role === requestedRole){
      window.location.href = requestedRole === 'admin' ? ADMIN_HOME : MEMBER_HOME;
      return;
    }
    showLoginModal(requestedRole);
  });

  // init
  document.addEventListener('DOMContentLoaded', render);
})();
