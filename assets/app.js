/* ===========================
   HH SUPER UI v2 (Deluxe JS)
   - Many UI effects (sound "tạch", ripple, HUD)
   - Startup overlay check Device + Server
   - More pages: Tools, Devices, Settings
   - Keep full login/key logic with Firebase transaction
   =========================== */

/* ========= 0) Helpers ========= */
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
const $  = (sel, root=document) => root.querySelector(sel);
const sleep = (ms) => new Promise(res => setTimeout(res, ms));

/* ========= 1) UI Settings (local) ========= */
const SETTINGS_KEY = 'hhsuper_settings_v2';
const DEFAULT_SETTINGS = {
  accent: 'gold',          // 'gold' | 'aqua'
  clickSound: true,        // click "tạch"
  haptic: false,           // vibrate if supported
  particles: true,         // background stars
  reduceMotion: false,     // force reduce motion

  // V3: Modern UI tuning
  glow: 95,                // 0..120 (%)
  blur: 16,                // 6..24 (px)
  fontScale: 100,          // 90..110 (%)
  roundness: 26            // 18..34 (px)
};

const UISettings = {
  value: { ...DEFAULT_SETTINGS },

  load(){
    try{
      const raw = localStorage.getItem(SETTINGS_KEY);
      if(!raw) return;
      const obj = JSON.parse(raw);
      if(obj && typeof obj === 'object'){
        this.value = { ...DEFAULT_SETTINGS, ...obj };
      }
    }catch(e){}
  },

  save(){
    try{ localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.value)); }catch(e){}
  },

  apply(){
    const v = this.value;

    // Data attrs
    document.body.dataset.accent = (v.accent === 'aqua') ? 'aqua' : 'gold';
    document.body.dataset.particles = v.particles ? '1' : '0';
    document.body.dataset.reduceMotion = v.reduceMotion ? '1' : '0';

    // CSS vars (V3 modern tuning)
    const root = document.documentElement;

    const blur = Math.max(6, Math.min(24, Number(v.blur || 16)));
    const glow = Math.max(0, Math.min(120, Number(v.glow ?? 95)));
    const fontScale = Math.max(90, Math.min(110, Number(v.fontScale ?? 100)));
    const roundness = Math.max(18, Math.min(34, Number(v.roundness ?? 26)));

    root.style.setProperty('--blurAmt', blur + 'px');
    root.style.setProperty('--glowPower', String(glow / 100));
    root.style.setProperty('--fontScale', String(fontScale / 100));

    // roundness derived
    root.style.setProperty('--radiusCard', roundness + 'px');
    root.style.setProperty('--radiusTile', Math.max(18, roundness - 4) + 'px');
    root.style.setProperty('--radiusBtn', Math.max(14, roundness - 10) + 'px');
    root.style.setProperty('--radiusInput', Math.max(16, roundness - 8) + 'px');
  }
};

/* ========= 2) HUD Toast ========= */
function hud(type, msg){
  const hudWrap = document.getElementById('hud');
  if(!hudWrap) return;
  const el = document.createElement('div');
  el.className = 'hud-toast ' + (type || 'info');

  let icon = 'fa-circle-info';
  if(type === 'ok') icon = 'fa-circle-check';
  if(type === 'err') icon = 'fa-circle-exclamation';
  if(type === 'warn') icon = 'fa-triangle-exclamation';

  el.innerHTML = `<i class="fa-solid ${icon}"></i><span>${msg || 'Thông báo'}</span>`;
  hudWrap.appendChild(el);

  requestAnimationFrame(() => el.classList.add('show'));

  const life = 2300;
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 280);
  }, life);
}
function toastOk(msg){ hud('ok', msg || 'Thành công'); }
function toastErr(msg){ hud('err', msg || 'Có lỗi'); }
function toastInfo(msg){ hud('info', msg || 'Thông tin'); }
function toastWarn(msg){ hud('warn', msg || 'Cảnh báo'); }

/* ========= 3) Click "tạch" + Ripple + Haptic ========= */
const ClickFX = {
  ctx: null,
  enabled: true,
  _noiseBuf: null,

  ensureCtx(){
    if(this.ctx) return this.ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if(!AC) return null;
    this.ctx = new AC();
    return this.ctx;
  },

  buildNoise(ctx){
    // 30ms noise buffer
    const duration = 0.03;
    const sampleRate = ctx.sampleRate;
    const buffer = ctx.createBuffer(1, Math.floor(sampleRate * duration), sampleRate);
    const data = buffer.getChannelData(0);
    for(let i=0;i<data.length;i++){
      data[i] = (Math.random()*2 - 1) * 0.75;
    }
    this._noiseBuf = buffer;
  },

  play(){
    if(!UISettings.value.clickSound) return;
    const ctx = this.ensureCtx();
    if(!ctx) return;

    // iOS requires resume on gesture
    if(ctx.state === 'suspended'){
      ctx.resume().catch(()=>{});
    }

    if(!this._noiseBuf) this.buildNoise(ctx);

    const t0 = ctx.currentTime;

    // click "tick": short square wave
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1900, t0);

    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.24, t0 + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.045);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t0);
    osc.stop(t0 + 0.05);

    // tiny noise burst to make it "tạch"
    const noise = ctx.createBufferSource();
    noise.buffer = this._noiseBuf;

    const nGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1200, t0);

    nGain.gain.setValueAtTime(0.0001, t0);
    nGain.gain.exponentialRampToValueAtTime(0.16, t0 + 0.002);
    nGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.03);

    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(ctx.destination);

    noise.start(t0);
    noise.stop(t0 + 0.035);

    // optional haptic
    if(UISettings.value.haptic && navigator.vibrate){
      try{ navigator.vibrate(8); }catch(e){}
    }
  },

  ripple(e, target){
    if(!target) return;
    const rect = target.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = (e.clientX - rect.left) - size/2;
    const y = (e.clientY - rect.top) - size/2;

    const span = document.createElement('span');
    span.className = 'ripple';
    span.style.width = span.style.height = size + 'px';
    span.style.left = x + 'px';
    span.style.top = y + 'px';

    // Ensure target is positioned
    const cs = getComputedStyle(target);
    if(cs.position === 'static'){
      target.style.position = 'relative';
    }
    target.appendChild(span);
    setTimeout(() => span.remove(), 700);
  }
};

// Global click detector
function isInteractive(el){
  if(!el) return false;
  const t = el.closest(
    'button, a, .menu-item, .chip-btn, .tab-btn, .quick-tile, .hex-btn, .mini-hex, .dpi-btn, .drawer-close, .eye-btn, .preset-btn, .social-link, .carousel-nav, .carousel-dot, label.hex-switch'
  );
  if(!t) return false;
  if(t.disabled) return false;
  if(t.getAttribute && t.getAttribute('aria-disabled') === 'true') return false;
  return true;
}

document.addEventListener('pointerdown', (e) => {
  const target = e.target && e.target.closest ? e.target.closest(
    'button, a, .menu-item, .chip-btn, .tab-btn, .quick-tile, .hex-btn, .mini-hex, .dpi-btn, .drawer-close, .eye-btn, .preset-btn, .social-link, .carousel-nav, .carousel-dot'
  ) : null;

  if(isInteractive(e.target)){
    ClickFX.play();
  }
  if(target){
    ClickFX.ripple(e, target);
  }
}, { passive:true });

/* ========= 4) Particle Background (Canvas Stars) ========= */
const ParticleFX = {
  canvas: null,
  ctx: null,
  stars: [],
  running: false,
  last: 0,

  init(){
    this.canvas = document.getElementById('fxCanvas');
    if(!this.canvas) return;
    this.ctx = this.canvas.getContext('2d', { alpha:true });
    this.resize();
    window.addEventListener('resize', () => this.resize());
  },

  resize(){
    if(!this.canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.floor(window.innerWidth * dpr);
    this.canvas.height = Math.floor(window.innerHeight * dpr);
    this.canvas.style.width = window.innerWidth + 'px';
    this.canvas.style.height = window.innerHeight + 'px';
    this.dpr = dpr;

    this.seed();
  },

  seed(){
    if(!this.ctx) return;
    const w = this.canvas.width;
    const h = this.canvas.height;

    const count = Math.max(40, Math.floor((w*h) / 65000));
    this.stars = [];
    for(let i=0;i<count;i++){
      this.stars.push({
        x: Math.random()*w,
        y: Math.random()*h,
        r: (Math.random()*1.2 + 0.4) * this.dpr,
        a: Math.random()*0.55 + 0.18,
        vx: (Math.random()*0.22 + 0.05) * this.dpr,
        vy: (Math.random()*0.14 + 0.02) * this.dpr,
        tw: Math.random()*0.9 + 0.2
      });
    }
  },

  start(){
    if(!this.ctx) this.init();
    if(!this.ctx) return;
    if(this.running) return;
    this.running = true;
    this.last = performance.now();
    requestAnimationFrame((t)=>this.loop(t));
  },

  stop(){
    this.running = false;
    if(this.ctx){
      this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
    }
  },

  loop(t){
    if(!this.running) return;
    const dt = Math.min(32, t - this.last);
    this.last = t;

    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0,0,w,h);

    // subtle drift
    for(const s of this.stars){
      s.x += s.vx * (dt/16);
      s.y += s.vy * (dt/16);
      if(s.x > w+20) s.x = -20;
      if(s.y > h+20) s.y = -20;

      const tw = (Math.sin((t/1000)*s.tw + s.x*0.002) + 1) * 0.5; // 0..1
      const alpha = s.a * (0.55 + 0.45*tw);

      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fill();
    }

    requestAnimationFrame((tt)=>this.loop(tt));
  }
};

/* ========= 5) App State ========= */
let CURRENT_KEY = null;

/* ========= 6) Menu Controls ========= */
function openMenu(){
  document.getElementById('menuOverlay').classList.add('show');
  document.getElementById('drawer').classList.add('show');
}
function closeMenu(){
  document.getElementById('menuOverlay').classList.remove('show');
  document.getElementById('drawer').classList.remove('show');
}

function showPage(id){
  $$('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById(id);
  if(el) el.classList.add('active');

  // Home carousel autoplay
  try{
    if(typeof HomeCarousel !== 'undefined' && HomeCarousel.onPageChange){
      HomeCarousel.onPageChange(id);
    }
  }catch(e){}
}

function menuGo(pageId){
  closeMenu();
  showPage(pageId);
  // page hooks
  if(pageId === 'page-checkkey' && CURRENT_KEY) loadKeyInfo(CURRENT_KEY);
  if(pageId === 'page-devices' && CURRENT_KEY) loadDevicesList(CURRENT_KEY);
  if(pageId === 'page-settings') syncSettingsUI();
}

function menuActionAbout(){
  closeMenu();
  Swal.fire({
    title: 'Giới thiệu',
    icon: 'info',
    html: '<div style="text-align:left;line-height:1.6;font-size:13px;color:#0f172a">' +
          '<b>HH SUPER</b> - Ứng dụng đăng nhập bằng key (UI Deluxe).<br>' +
          '• Auto login khi có key đã lưu.<br>' +
          '• Giới hạn thiết bị bằng transaction.<br>' +
          '• Overlay check thiết bị + server khi vào app.<br>' +
          '• Hiệu ứng click “tạch” + ripple + HUD gaming.<br>' +
          '</div>',
    confirmButtonText: 'Đóng'
  });
}

function menuActionRefresh(){ closeMenu(); refreshKeyInfo(); }
function menuActionCopyKey(){ closeMenu(); copyCurrentKey(); }
function menuActionCopyDevice(){ closeMenu(); copyDeviceId(); }
function menuActionClearSaved(){ closeMenu(); clearSavedKey(); }
function menuActionLogout(){ closeMenu(); logoutKey(); }

/* ========= 7) Login tabs ========= */
function switchLoginTab(which){
  const map = { info:'tab-info', warn:'tab-warn', contact:'tab-contact' };
  const btnMap = { info:'tabInfoBtn', warn:'tabWarnBtn', contact:'tabContactBtn' };

  Object.values(map).forEach(id => document.getElementById(id).classList.remove('active'));
  Object.values(btnMap).forEach(id => document.getElementById(id).classList.remove('active'));

  document.getElementById(map[which]).classList.add('active');
  document.getElementById(btnMap[which]).classList.add('active');
}

function goContactPage(){
  window.location.href = 'lienhe.html';
}

/* ========= 8) Key input helpers ========= */
function getDeviceId() {
  let id = localStorage.getItem('hhsuper_device_id');
  if (!id) {
    id = (window.crypto && crypto.randomUUID) ? crypto.randomUUID()
      : ('dev-' + Math.random().toString(36).slice(2) + Date.now().toString(36));
    localStorage.setItem('hhsuper_device_id', id);
  }
  return id;
}

function formatDateVN(d) {
  try { return d.toLocaleDateString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit' }); }
  catch(e) { return d.toString(); }
}

function formatTs(ts){
  if(!ts) return 'Không';
  try{ return new Date(ts).toLocaleString('vi-VN'); }catch(e){ return String(ts); }
}

function showError(msg) {
  const errMsg = document.getElementById('error-msg');
  const errText = document.getElementById('error-text');
  if (errText) errText.textContent = msg;
  errMsg.classList.add('show');
}
function hideError() {
  const el = document.getElementById('error-msg');
  if(el) el.classList.remove('show');
}

function buildDeviceInfo(now) {
  return {
    firstSeen: now,
    lastSeen: now,
    userAgent: navigator.userAgent || '',
    platform: navigator.platform || '',
    language: navigator.language || '',
    screen: (window.screen ? (screen.width + 'x' + screen.height) : '')
  };
}

function sanitizeKeyInput(raw) {
  const k = (raw || '').trim().toLowerCase();
  if (!k) return { ok: false, key: '', reason: 'Vui lòng nhập key!' };
  if (/[.#$\[\]\/]/.test(k)) return { ok: false, key: '', reason: 'Key chứa ký tự không hợp lệ!' };
  return { ok: true, key: k };
}

/* ========= 9) Screen transitions ========= */
function showMainApp() {
  const loginScreen = document.getElementById('login-screen');
  const mainApp = document.getElementById('main-app');

  loginScreen.style.opacity = '0';
  loginScreen.style.visibility = 'hidden';

  setTimeout(() => {
    loginScreen.style.display = 'none';
    mainApp.style.display = 'block';
    showPage('page-home');

    // Startup overlay check
    runStartupOverlay().catch(()=>{});
  }, 600);
}

function showLoginScreen() {
  const loginScreen = document.getElementById('login-screen');
  const mainApp = document.getElementById('main-app');

  mainApp.style.display = 'none';
  loginScreen.style.display = 'flex';
  loginScreen.style.visibility = 'visible';
  loginScreen.style.opacity = '1';
  hideError();
}

function setHeaderKey(key) {
  const mk = document.getElementById('menuKey');
  if(mk) mk.textContent = key ? key : '—';
}
function setHeaderDevice() {
  const md = document.getElementById('menuDevice');
  if(md) md.textContent = getDeviceId();
}

/* ========= 9.1) Home Carousel (Auto) ========= */
const HomeCarousel = {
  el: null,
  track: null,
  slides: [],
  dots: [],
  index: 0,
  timer: null,

  init(){
    this.el = document.getElementById('homeCarousel');
    if(!this.el) return;

    this.track = this.el.querySelector('.carousel-track');
    this.slides = Array.from(this.el.querySelectorAll('.carousel-slide'));
    this.dots = Array.from(this.el.querySelectorAll('.carousel-dot'));

    const prevBtn = this.el.querySelector('.carousel-nav.prev');
    const nextBtn = this.el.querySelector('.carousel-nav.next');

    if(prevBtn) prevBtn.addEventListener('click', () => { this.prev(); this.restart(); });
    if(nextBtn) nextBtn.addEventListener('click', () => { this.next(); this.restart(); });

    this.dots.forEach(d => {
      d.addEventListener('click', () => {
        const i = Number(d.dataset.idx || 0);
        this.go(i);
        this.restart();
      });
    });

    // Pause on hover
    this.el.addEventListener('pointerenter', () => this.stop());
    this.el.addEventListener('pointerleave', () => this.start());

    // Swipe (simple)
    let down = false;
    let startX = 0;
    this.el.addEventListener('pointerdown', (e) => {
      down = true;
      startX = e.clientX || 0;
    }, { passive:true });

    window.addEventListener('pointerup', (e) => {
      if(!down) return;
      down = false;
      const endX = e.clientX || 0;
      const dx = endX - startX;
      if(Math.abs(dx) > 45){
        if(dx > 0) this.prev(); else this.next();
        this.restart();
      }
    }, { passive:true });

    // Init state
    this.go(0, false);

    // Visibility pause
    document.addEventListener('visibilitychange', () => {
      if(document.hidden) this.stop();
      else this.start();
    });

    // Start if Home is active
    this.start();
  },

  isMainVisible(){
    const main = document.getElementById('main-app');
    if(!main) return false;
    try{
      return getComputedStyle(main).display !== 'none' && main.offsetParent !== null;
    }catch(e){
      return true;
    }
  },

  isHomeActive(){
    const home = document.getElementById('page-home');
    return !!(home && home.classList.contains('active'));
  },

  go(i, animate=true){
    if(!this.track || !this.slides.length) return;
    const n = this.slides.length;

    this.index = (i % n + n) % n;

    if(!animate) this.track.classList.add('no-anim');
    else this.track.classList.remove('no-anim');

    this.track.style.transform = `translateX(-${this.index * 100}%)`;

    this.slides.forEach((s, idx) => s.classList.toggle('is-active', idx === this.index));
    this.dots.forEach((d, idx) => d.classList.toggle('active', idx === this.index));

    if(!animate) requestAnimationFrame(() => this.track && this.track.classList.remove('no-anim'));
  },

  next(){ this.go(this.index + 1); },
  prev(){ this.go(this.index - 1); },

  start(){
    if(!this.el) return;
    if(!this.isMainVisible()) return;
    if(!this.isHomeActive()) return;
    if(this.timer) return;

    const interval = (UISettings.value && UISettings.value.reduceMotion) ? 5200 : 3800;
    this.timer = setInterval(() => this.next(), interval);
  },

  stop(){
    if(this.timer){
      clearInterval(this.timer);
      this.timer = null;
    }
  },

  restart(){
    this.stop();
    this.start();
  },

  onPageChange(pageId){
    if(pageId === 'page-home') this.start();
    else this.stop();
  }
};


/* ========= 10) Firebase ========= */
const firebaseConfig = {
  apiKey: "AIzaSyBbAx15pD9xXtw6H9ijMm0-hbY3Opq7mDY",
  authDomain: "app---ob520.firebaseapp.com",
  databaseURL: "https://app---ob520-default-rtdb.firebaseio.com/",
  projectId: "app---ob520",
  storageBucket: "app---ob520.firebasestorage.app",
  messagingSenderId: "1050579000808",
  appId: "1:1050579000808:web:d10fc84cf7c80fdbc0985d"
};

let db = null;

function initFirebase(){
  try{
    if(!firebase.apps || !firebase.apps.length){
      firebase.initializeApp(firebaseConfig);
    }
    db = firebase.database();
  }catch(e){
    console.error('Firebase init error', e);
  }

  // anon auth
  try{
    firebase.auth().onAuthStateChanged((u) => {
      if (!u) firebase.auth().signInAnonymously().catch(()=>{});
    });
  }catch(e){}
}

/* ========= 11) Startup overlay (Device + Server check) ========= */
function showStartupOverlay(){
  const wrap = document.getElementById('startup-overlay');
  if(!wrap) return;
  wrap.classList.add('show');
}
function hideStartupOverlay(){
  const wrap = document.getElementById('startup-overlay');
  if(!wrap) return;
  wrap.classList.remove('show');
}

function setStepStatus(stepId, status, text){
  const el = document.getElementById(stepId);
  if(!el) return;
  const tag = el.querySelector('.tag');
  if(!tag) return;

  if(status === 'ok'){
    tag.className = 'tag ok';
    tag.innerHTML = '<i class="fa-solid fa-check"></i> OK';
  }else if(status === 'bad'){
    tag.className = 'tag bad';
    tag.innerHTML = '<i class="fa-solid fa-xmark"></i> FAIL';
  }else if(status === 'warn'){
    tag.className = 'tag warn';
    tag.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> WARN';
  }else{
    tag.className = 'tag';
    tag.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> ...';
  }

  const small = el.querySelector('small');
  if(small && text) small.textContent = text;
}

function setStartupProgress(pct){
  const bar = document.getElementById('startupProgress');
  if(bar) bar.style.width = Math.max(0, Math.min(100, pct)) + '%';
}

function setStartupMsg(msg, type){
  const el = document.getElementById('startupMsg');
  if(!el) return;
  el.textContent = msg || '';
  if(type === 'ok') el.style.color = '#bfffe4';
  else if(type === 'bad') el.style.color = '#ffd0d0';
  else if(type === 'warn') el.style.color = '#ffe8b3';
  else el.style.color = 'rgba(234,240,255,0.86)';
}

async function checkFirebaseConnected(timeoutMs=4500){
  if(!db) return false;
  // .info/connected is boolean
  const ref = db.ref('.info/connected');
  return await new Promise((resolve) => {
    let done = false;
    const timer = setTimeout(() => {
      if(done) return;
      done = true;
      ref.off('value');
      resolve(false);
    }, timeoutMs);

    ref.on('value', (snap) => {
      const ok = !!snap.val();
      if(ok && !done){
        done = true;
        clearTimeout(timer);
        ref.off('value');
        resolve(true);
      }
    }, () => {
      if(!done){
        done = true;
        clearTimeout(timer);
        ref.off('value');
        resolve(false);
      }
    });
  });
}

async function runStartupOverlay(){
  const wrap = document.getElementById('startup-overlay');
  if(!wrap) return;

  // If user disabled motion, keep overlay quick and without scan? (CSS handles)
  showStartupOverlay();

  // reset UI
  setStepStatus('step-device', 'loading', 'Đang tạo Device ID...');
  setStepStatus('step-browser', 'loading', 'Đang kiểm tra trình duyệt...');
  setStepStatus('step-network', 'loading', 'Đang kiểm tra mạng...');
  setStepStatus('step-firebase', 'loading', 'Đang bắt tay Firebase...');
  setStepStatus('step-server', 'loading', 'Đang kiểm tra server...');
  setStartupProgress(4);
  setStartupMsg('Đang kiểm tra thiết bị & server...', null);

  // hide actions by default
  const actions = document.getElementById('startupActions');
  if(actions) actions.style.display = 'none';

  let okAll = true;

  // Step 1: device
  try{
    const id = getDeviceId();
    setHeaderDevice();
    setStepStatus('step-device', 'ok', 'Device ID: ' + id.slice(0, 8) + '…');
  }catch(e){
    okAll = false;
    setStepStatus('step-device', 'bad', 'Không tạo được Device ID.');
  }
  setStartupProgress(20);
  await sleep(160);

  // Step 2: browser
  try{
    const ua = (navigator.userAgent || 'Unknown').slice(0, 45);
    const secure = (location.protocol === 'https:' || location.hostname === 'localhost') ? 'Secure' : 'Not secure';
    setStepStatus('step-browser', 'ok', secure + ' • ' + ua + '…');
  }catch(e){
    okAll = false;
    setStepStatus('step-browser', 'bad', 'Không đọc được thông tin trình duyệt.');
  }
  setStartupProgress(36);
  await sleep(160);

  // Step 3: network
  try{
    const online = (navigator.onLine !== false);
    if(online){
      setStepStatus('step-network', 'ok', 'Online');
    }else{
      okAll = false;
      setStepStatus('step-network', 'bad', 'Offline (không có mạng)');
    }
  }catch(e){
    setStepStatus('step-network', 'warn', 'Không xác định (browser hạn chế)');
  }
  setStartupProgress(52);
  await sleep(160);

  // Step 4: firebase
  try{
    if(!firebase || !db){
      okAll = false;
      setStepStatus('step-firebase', 'bad', 'Firebase chưa khởi tạo.');
    }else{
      // ensure auth
      try{
        if (!firebase.auth().currentUser) {
          await firebase.auth().signInAnonymously();
        }
      }catch(e){}

      const connected = await checkFirebaseConnected(4500);
      if(connected){
        setStepStatus('step-firebase', 'ok', 'Kết nối Firebase OK');
      }else{
        okAll = false;
        setStepStatus('step-firebase', 'bad', 'Không kết nối được Firebase.');
      }
    }
  }catch(e){
    okAll = false;
    setStepStatus('step-firebase', 'bad', 'Lỗi Firebase.');
  }
  setStartupProgress(74);
  await sleep(160);

  // Step 5: server check (read serverTimeOffset + small read)
  try{
    if(!db){
      okAll = false;
      setStepStatus('step-server', 'bad', 'DB chưa sẵn sàng.');
    }else{
      // Server time offset
      const offSnap = await db.ref('.info/serverTimeOffset').once('value');
      const off = Number(offSnap.val() || 0);
      const offStr = (Math.abs(off) < 120000) ? ('offset ' + Math.round(off/1000) + 's') : ('offset ' + Math.round(off/60000) + 'm');

      // Try a lightweight read (optional node)
      let extra = '';
      try{
        const ping = await db.ref('server/ping').once('value');
        if(ping.exists()){
          extra = ' • ping: ' + String(ping.val()).slice(0, 18);
        }else{
          extra = ' • ping: n/a';
        }
      }catch(e2){
        extra = ' • ping: blocked';
      }

      setStepStatus('step-server', 'ok', 'Server OK • ' + offStr + extra);
    }
  }catch(e){
    // not fatal, show warn
    setStepStatus('step-server', 'warn', 'Không kiểm tra ping (rules chặn).');
  }
  setStartupProgress(92);
  await sleep(180);

  if(okAll){
    setStartupProgress(100);
    setStartupMsg('KẾT NỐI THÀNH CÔNG ✓', 'ok');
    toastOk('Sever check: OK');
    await sleep(850);
    hideStartupOverlay();
  }else{
    setStartupProgress(100);
    setStartupMsg('KẾT NỐI THẤT BẠI ✕ (Bạn có thể thử lại)', 'bad');
    toastErr('Sever check: FAIL');
    if(actions) actions.style.display = 'flex';
  }
}

// Startup overlay buttons
async function startupRetry(){
  await runStartupOverlay();
}
function startupClose(){
  hideStartupOverlay();
}
function startupLogout(){
  hideStartupOverlay();
  logoutKey();
}

/* ========= 12) Key info page ========= */
function setKeyInfoLoading() {
  const pill = document.getElementById('keyStatusPill');
  if(pill){
    pill.className = 'status-pill';
    pill.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Đang tải';
  }

  const setSk = (id) => {
    const el = document.getElementById(id);
    if(el) el.innerHTML = '<span class="skeleton" style="height:14px"></span>';
  };

  setSk('infoKey');
  setSk('infoDevice');
  setSk('infoExpire');
  setSk('infoDevices');
  setSk('infoLastLogin');
  setSk('infoNote');
}

function statusFromData(data) {
  const now = Date.now();
  const active = data && data.active !== false;
  const exp = Number((data && data.expiresAt) || 0);

  if (!active) return { type:'bad', text:'Khoá', icon:'fa-ban' };
  if (exp && now > exp) return { type:'bad', text:'Hết hạn', icon:'fa-clock' };
  if (exp && (exp - now) < (3*24*60*60*1000)) return { type:'warn', text:'Sắp hết', icon:'fa-triangle-exclamation' };
  return { type:'ok', text:'OK', icon:'fa-check' };
}

async function loadKeyInfo(key){
  if(!key || !db) return;
  setKeyInfoLoading();

  const deviceId = getDeviceId();
  const keyRef = db.ref('keys/' + key);

  try{
    const snap = await keyRef.once('value');
    if(!snap.exists()){
      throw new Error('Không tìm thấy dữ liệu key.');
    }
    const data = snap.val() || {};
    const st = statusFromData(data);

    const pill = document.getElementById('keyStatusPill');
    if(pill){
      pill.className = 'status-pill ' + st.type;
      pill.innerHTML = `<i class="fa-solid ${st.icon}"></i> ${st.text}`;
    }

    const expiresAt = Number(data.expiresAt || 0);
    const maxDevices = Math.max(1, Number(data.maxDevices || 1));
    const devices = data.devices || {};
    const usedDevices = Object.keys(devices).length;

    const setText = (id, txt, addMono) => {
      const el = document.getElementById(id);
      if(!el) return;
      el.textContent = txt;
      if(addMono) el.classList.add('mono');
    };

    setText('infoKey', key, true);
    setText('infoDevice', deviceId, true);
    setText('infoExpire', expiresAt ? (formatDateVN(new Date(expiresAt)) + ' (' + formatTs(expiresAt) + ')') : 'Không');
    setText('infoDevices', usedDevices + ' / ' + maxDevices);
    setText('infoLastLogin', data.lastLoginAt ? formatTs(data.lastLoginAt) : 'Chưa có');
    setText('infoNote', (data.note || '—'));

    // render mini devices table in Check page
    renderDevicesMini(devices, deviceId);

  }catch(e){
    const pill = document.getElementById('keyStatusPill');
    if(pill){
      pill.className = 'status-pill bad';
      pill.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> Lỗi';
    }
    toastErr(e && e.message ? e.message : 'Không tải được thông tin key.');
  }
}

function renderDevicesMini(devicesObj, currentDeviceId){
  const wrap = document.getElementById('miniDevices');
  if(!wrap) return;
  const devices = devicesObj || {};
  const ids = Object.keys(devices);
  if(!ids.length){
    wrap.innerHTML = '<div class="muted">Chưa có thiết bị nào.</div>';
    return;
  }
  ids.sort((a,b)=> (devices[b]?.lastSeen||0) - (devices[a]?.lastSeen||0));
  const top = ids.slice(0, 4);

  wrap.innerHTML = top.map((id) => {
    const d = devices[id] || {};
    const isMe = (id === currentDeviceId);
    const seen = d.lastSeen ? formatTs(d.lastSeen) : 'Không';
    return `
      <div class="device-item" style="margin-bottom:10px">
        <div>
          <b>${isMe ? '⭐ ' : ''}${id}</b>
          <small>Last seen: ${seen}<br>Platform: ${(d.platform||'—')} • Lang: ${(d.language||'—')}</small>
        </div>
        <div class="device-actions">
          <button onclick="copyText('${id}')"><i class="fa-solid fa-copy"></i> Copy</button>
        </div>
      </div>
    `;
  }).join('') + (ids.length>4 ? `<div class="muted">+${ids.length-4} thiết bị khác (xem tab <b>Thiết bị</b>).</div>` : '');
}

async function refreshKeyInfo(){
  if(!CURRENT_KEY) return toastWarn('Chưa có key đang dùng.');
  await loadKeyInfo(CURRENT_KEY);
  toastOk('Đã làm mới thông tin key.');
}

async function copyText(t){
  try{
    await navigator.clipboard.writeText(String(t));
    toastOk('Đã copy.');
  }catch(e){
    toastErr('Không copy được (trình duyệt chặn).');
  }
}

async function copyCurrentKey(){
  if(!CURRENT_KEY) return toastWarn('Chưa có key.');
  await copyText(CURRENT_KEY);
}
async function copyDeviceId(){
  try{
    const id = getDeviceId();
    await copyText(id);
  }catch(e){
    toastErr('Không copy được (trình duyệt chặn).');
  }
}

function clearSavedKey(){
  localStorage.removeItem('hhsuper_last_key');
  toastInfo('Đã xoá key đã lưu.');
  try{ document.getElementById('login-key').value = ''; }catch(e){}
}

function logoutKey(){
  localStorage.removeItem('hhsuper_last_key');
  CURRENT_KEY = null;
  setHeaderKey('—');
  toastInfo('Đã đăng xuất key.');
  showLoginScreen();
}

/* ========= 13) Devices page (full list + remove) ========= */
async function loadDevicesList(key){
  const wrap = document.getElementById('devicesList');
  const status = document.getElementById('devicesStatus');
  if(!wrap) return;

  wrap.innerHTML = '<span class="skeleton" style="height:14px"></span>';
  if(status) status.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Đang tải';

  if(!db || !key){
    wrap.innerHTML = '<div class="muted">Chưa có dữ liệu.</div>';
    if(status) status.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> Lỗi';
    return;
  }

  try{
    const snap = await db.ref('keys/' + key + '/devices').once('value');
    const devices = snap.val() || {};
    const ids = Object.keys(devices);

    if(status){
      status.className = 'status-pill ' + (ids.length ? 'ok' : '');
      status.innerHTML = `<i class="fa-solid fa-microchip"></i> ${ids.length} thiết bị`;
    }

    if(!ids.length){
      wrap.innerHTML = '<div class="muted">Chưa có thiết bị nào.</div>';
      return;
    }

    const me = getDeviceId();
    ids.sort((a,b)=> (devices[b]?.lastSeen||0) - (devices[a]?.lastSeen||0));

    wrap.innerHTML = ids.map((id) => {
      const d = devices[id] || {};
      const seen = d.lastSeen ? formatTs(d.lastSeen) : 'Không';
      const isMe = (id === me);
      return `
        <div class="device-item">
          <div style="min-width:0">
            <b class="mono" style="color: var(--accent-2)">${isMe ? '⭐ ' : ''}${id}</b>
            <small>
              Last seen: ${seen}<br>
              Platform: ${(d.platform||'—')} • Screen: ${(d.screen||'—')}<br>
              UA: ${(d.userAgent||'—').slice(0, 80)}${(d.userAgent||'').length>80?'…':''}
            </small>
          </div>
          <div class="device-actions">
            <button onclick="copyText('${id}')"><i class="fa-solid fa-copy"></i> Copy</button>
            <button class="danger" onclick="removeDevice('${id}')"><i class="fa-solid fa-trash"></i> Xóa</button>
          </div>
        </div>
      `;
    }).join('');

  }catch(e){
    wrap.innerHTML = '<div class="muted">Không tải được danh sách thiết bị.</div>';
    if(status){
      status.className = 'status-pill bad';
      status.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> Lỗi';
    }
    toastErr(e && e.message ? e.message : 'Lỗi tải thiết bị.');
  }
}

async function removeDevice(deviceId){
  if(!CURRENT_KEY) return toastWarn('Chưa có key.');
  const me = getDeviceId();

  const confirm = await Swal.fire({
    title: 'Xóa thiết bị?',
    icon: 'warning',
    html: `<div style="text-align:left;line-height:1.6;font-size:13px;color:#0f172a">
            Thiết bị: <b>${deviceId}</b><br>
            ${deviceId===me ? '<span style="color:#ef4444"><b>Lưu ý:</b> Đây là thiết bị hiện tại. Xóa xong có thể phải đăng nhập lại!</span>' : ''}
          </div>`,
    showCancelButton: true,
    confirmButtonText: 'Xóa',
    cancelButtonText: 'Hủy'
  });

  if(!confirm.isConfirmed) return;

  try{
    await db.ref('keys/' + CURRENT_KEY + '/devices/' + deviceId).remove();
    toastOk('Đã xóa thiết bị.');
    await loadDevicesList(CURRENT_KEY);
    await loadKeyInfo(CURRENT_KEY);
  }catch(e){
    toastErr('Không xóa được (rules chặn hoặc không đủ quyền).');
  }
}

async function resetAllDevices(){
  if(!CURRENT_KEY) return toastWarn('Chưa có key.');

  const confirm = await Swal.fire({
    title: 'Reset toàn bộ thiết bị?',
    icon: 'warning',
    html: '<div style="text-align:left;line-height:1.6;font-size:13px;color:#0f172a">' +
          'Hành động này sẽ xóa <b>tất cả</b> thiết bị đã ghi nhận trong key.<br>' +
          'Sau đó bạn cần đăng nhập lại trên các thiết bị.<br>' +
          '</div>',
    showCancelButton: true,
    confirmButtonText: 'Reset',
    cancelButtonText: 'Hủy'
  });

  if(!confirm.isConfirmed) return;

  try{
    await db.ref('keys/' + CURRENT_KEY + '/devices').remove();
    toastOk('Đã reset thiết bị.');
    await loadDevicesList(CURRENT_KEY);
    await loadKeyInfo(CURRENT_KEY);
  }catch(e){
    toastErr('Không reset được (rules chặn hoặc không đủ quyền).');
  }
}

/* ========= 14) Login logic (Key check + transaction) ========= */
let _lastLoginTry = 0;

async function pasteFromClipboard(){
  try{
    const t = await navigator.clipboard.readText();
    if(t){
      document.getElementById('login-key').value = t.trim();
      toastOk('Đã dán key từ clipboard.');
    }else{
      toastWarn('Clipboard trống.');
    }
  }catch(e){
    toastErr('Không đọc được clipboard (trình duyệt chặn).');
  }
}

/* Toggle show/hide key */
function toggleKeyVisibility(){
  const inp = document.getElementById('login-key');
  const ic = document.getElementById('eyeIcon');
  if(!inp) return;
  if(inp.type === 'password'){
    inp.type = 'text';
    if(ic) ic.className = 'fa-solid fa-eye-slash';
    toastInfo('Đang hiển thị key.');
  }else{
    inp.type = 'password';
    if(ic) ic.className = 'fa-solid fa-eye';
    toastInfo('Đã ẩn key.');
  }
}

async function checkKey() {
  const keyInput = document.getElementById('login-key');
  const btn = document.getElementById('login-btn');

  const nowTry = Date.now();
  if(nowTry - _lastLoginTry < 500) return;
  _lastLoginTry = nowTry;

  const parsed = sanitizeKeyInput(keyInput.value);
  if (!parsed.ok) {
    showError(parsed.reason);
    toastWarn(parsed.reason);
    return;
  }
  const key = parsed.key;

  const originalText = btn.innerHTML;
  btn.innerHTML = '<span class="shine"></span><i class="fa-solid fa-spinner fa-spin"></i> Đang kiểm tra...';
  btn.style.opacity = '0.92';
  btn.disabled = true;

  try {
    if (!firebase.auth().currentUser) {
      await firebase.auth().signInAnonymously();
    }

    const deviceId = getDeviceId();
    const keyRef = db.ref('keys/' + key);

    const snap = await keyRef.once('value');
    if (!snap.exists()) {
      throw new Error('Key không tồn tại, vui lòng thử lại!');
    }

    const data = snap.val() || {};
    if (data.active === false) {
      throw new Error('Key đã bị khoá!');
    }

    const now = Date.now();
    const expiresAt = Number(data.expiresAt || 0);
    if (expiresAt && now > expiresAt) {
      throw new Error('Key đã hết hạn ngày ' + formatDateVN(new Date(expiresAt)) + '!');
    }

    const maxDevices = Math.max(1, Number(data.maxDevices || 1));
    const devicesRef = keyRef.child('devices');
    const info = buildDeviceInfo(now);

    // Transaction: reserve device slot
    const txResult = await devicesRef.transaction((devices) => {
      devices = devices || {};

      if (devices[deviceId]) {
        devices[deviceId].lastSeen = now;
        devices[deviceId].userAgent = info.userAgent;
        devices[deviceId].platform = info.platform;
        devices[deviceId].language = info.language;
        devices[deviceId].screen = info.screen;
        return devices;
      }

      const count = Object.keys(devices).length;
      if (count >= maxDevices) {
        return;
      }

      devices[deviceId] = info;
      return devices;
    });

    if (!txResult.committed) {
      throw new Error('Key đã đạt giới hạn ' + maxDevices + ' thiết bị!');
    }

    await keyRef.update({ lastLoginAt: now });

    hideError();
    btn.innerHTML = '<span class="shine"></span><i class="fa-solid fa-check"></i> Thành công';
    btn.style.color = '#bfffe4';

    localStorage.setItem('hhsuper_last_key', key);

    CURRENT_KEY = key;
    setHeaderKey(key);
    setHeaderDevice();

    toastOk('Đăng nhập thành công!');

    // Show main
    setTimeout(() => {
      showMainApp();
      loadKeyInfo(key);
      loadDevicesList(key);
    }, 450);

  } catch (e) {
    btn.innerHTML = originalText;
    btn.style.opacity = '1';
    btn.disabled = false;

    const msg = (e && e.message) ? e.message : 'Có lỗi xảy ra, vui lòng thử lại!';
    showError(msg);
    toastErr(msg);

    keyInput.style.animation = 'shake 0.5s';
    setTimeout(() => keyInput.style.animation = '', 500);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const keyEl = document.getElementById('login-key');
  if(keyEl){
    keyEl.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') checkKey();
    });
    keyEl.addEventListener('input', function() { hideError(); });
  }
});

/* ========= 15) Sliders + DPI ========= */
function applySliderRed(slider){
  const min = Number(slider.min || 0);
  const max = Number(slider.max || 100);
  const val = Number(slider.value || 0);
  const p = ((val - min) / (max - min)) * 100;

  slider.style.background = `linear-gradient(to right, rgba(239,68,68,0.98) ${p}%, rgba(255,255,255,0.10) ${p}%)`;

  const r = 239;
  const g = Math.max(68, Math.round(96 - (p * 0.45)));
  const b = Math.max(68, Math.round(68 - (p * 0.10)));
  slider.style.setProperty('--thumbColor', `rgb(${r},${g},${b})`);

  const valId = slider.id + '-val';
  const badge = document.getElementById(valId);
  if(badge) badge.textContent = val + '%';
}

function bindSliders(){
  $$('.sensitivity-slider').forEach(slider => {
    applySliderRed(slider);
    slider.addEventListener('input', () => applySliderRed(slider));
  });
}

function applyDPI() {
  const dpiInput = document.getElementById('dpi-input').value;
  const dpiBtn = document.getElementById('dpi-apply');

  if(!dpiInput || dpiInput <= 0) {
    toastWarn('Vui lòng nhập một mức DPI hợp lệ!');
    return;
  }

  const originalText = dpiBtn.innerHTML;
  dpiBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang áp dụng';
  dpiBtn.disabled = true;

  setTimeout(() => {
    dpiBtn.innerHTML = '<i class="fa-solid fa-check"></i> Xong';
    dpiBtn.style.background = 'rgba(16,185,129,0.18)';
    dpiBtn.style.color = '#bfffe4';
    toastOk('Đã áp dụng DPI: ' + dpiInput);

    setTimeout(() => {
      dpiBtn.innerHTML = originalText;
      dpiBtn.style.background = 'rgba(255,255,255,0.06)';
      dpiBtn.style.color = 'rgba(234,240,255,0.92)';
      dpiBtn.disabled = false;
    }, 1600);
  }, 800);
}

/* ========= 16) Tools: Presets + Quick actions ========= */
function setSliderValue(id, value){
  const el = document.getElementById(id);
  if(!el) return;
  el.value = value;
  applySliderRed(el);
}

function applyPreset(name){
  // Presets are UI-only (no game hack). Values are just demo.
  const presets = {
    smooth: { general: 98, reddot: 90, scope: 82, sniper: 62, dpi: 950 },
    headshot: { general: 100, reddot: 92, scope: 78, sniper: 55, dpi: 850 },
    sniper: { general: 86, reddot: 75, scope: 70, sniper: 42, dpi: 700 },
    balanced: { general: 95, reddot: 85, scope: 75, sniper: 50, dpi: 800 }
  };
  const p = presets[name];
  if(!p) return;

  setSliderValue('sens-general', p.general);
  setSliderValue('sens-reddot', p.reddot);
  setSliderValue('sens-scope', p.scope);
  setSliderValue('sens-sniper', p.sniper);

  const dpiInput = document.getElementById('dpi-input');
  if(dpiInput) dpiInput.value = p.dpi;

  toastOk('Đã áp dụng preset: ' + name.toUpperCase());
}

/* ========= 17) Settings page ========= */
function syncSettingsUI(){
  // Toggles + ranges
  const s = UISettings.value;

  const tSound = document.getElementById('st-clicksound');
  const tHaptic = document.getElementById('st-haptic');
  const tParticles = document.getElementById('st-particles');
  const tReduce = document.getElementById('st-reducemotion');
  const tAccent = document.getElementById('st-accent');

  if(tSound) tSound.checked = !!s.clickSound;
  if(tHaptic) tHaptic.checked = !!s.haptic;
  if(tParticles) tParticles.checked = !!s.particles;
  if(tReduce) tReduce.checked = !!s.reduceMotion;
  if(tAccent) tAccent.value = s.accent;

  const setRange = (rangeEl, val, labelId, fmt) => {
    if(!rangeEl) return;
    rangeEl.value = String(val);
    const lb = document.getElementById(labelId);
    if(lb) lb.textContent = fmt(val);
  };

  setRange(document.getElementById('st-glow'), (s.glow ?? 95), 'st-glow-val', v => v + '%');
  setRange(document.getElementById('st-blur'), (s.blur ?? 16), 'st-blur-val', v => v + 'px');
  setRange(document.getElementById('st-font'), (s.fontScale ?? 100), 'st-font-val', v => v + '%');
  setRange(document.getElementById('st-round'), (s.roundness ?? 26), 'st-round-val', v => v + 'px');

  // Preview badges
  const bDevice = document.getElementById('st-device');
  const bKey = document.getElementById('st-key');
  if(bDevice) bDevice.textContent = getDeviceId();
  if(bKey) bKey.textContent = CURRENT_KEY || '—';
}

function setSetting(key, value){
  UISettings.value[key] = value;
  UISettings.save();
  UISettings.apply();

  // particles start/stop
  if(key === 'particles'){
    if(value) ParticleFX.start();
    else ParticleFX.stop();
  }

  toastInfo('Đã cập nhật cài đặt.');
}

function resetSettings(){
  UISettings.value = { ...DEFAULT_SETTINGS };
  UISettings.save();
  UISettings.apply();
  if(UISettings.value.particles) ParticleFX.start(); else ParticleFX.stop();
  syncSettingsUI();
  toastOk('Đã reset cài đặt.');
}

/* ========= 18) Misc UI actions (Home tiles) ========= */
function quickToggle(id){
  const el = document.getElementById(id);
  if(!el) return;
  const on = el.dataset.on !== '1';
  el.dataset.on = on ? '1' : '0';

  const pill = el.querySelector('.status-pill');
  if(pill){
    if(on){
      pill.className = 'status-pill ok';
      pill.innerHTML = '<i class="fa-solid fa-check"></i> ON';
    }else{
      pill.className = 'status-pill bad';
      pill.innerHTML = '<i class="fa-solid fa-xmark"></i> OFF';
    }
  }
  toastInfo(on ? 'Đã bật.' : 'Đã tắt.');
}

/* ========= 19) Typewriter ========= */
function typeText(el, text, speedMs){
  if(!el) return;
  el.textContent = "";
  let i = 0;
  const tick = () => {
    el.textContent = text.slice(0, i);
    i++;
    if(i <= text.length) setTimeout(tick, speedMs);
  };
  tick();
}

/* ========= 20) Boot ========= */
window.addEventListener('load', async function() {
  // Settings
  UISettings.load();

  // If user prefers reduced motion, set default reduceMotion unless user already set it.
  try{
    const prm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(prm && !localStorage.getItem(SETTINGS_KEY)){
      UISettings.value.reduceMotion = true;
      UISettings.value.particles = false;
      UISettings.save();
    }
  }catch(e){}

  UISettings.apply();

  // FX
  ParticleFX.init();
  if(UISettings.value.particles) ParticleFX.start();

  // Firebase
  initFirebase();

  // Header typing
  typeText(document.getElementById('authorText'), "Hà Văn Huấn", 55);
  typeText(document.getElementById('loginBrandTyping'), "HH SUPER", 70);

  // Device in menu
  setHeaderDevice();

  // Bind sliders
  bindSliders();

  // Home carousel
  HomeCarousel.init();

  // Load saved key (only if login screen exists)
  const hasLoginUI = !!document.getElementById('login-screen') && !!document.getElementById('login-key') && !!document.getElementById('login-btn');
  const saved = localStorage.getItem('hhsuper_last_key');

  if(hasLoginUI){
    if (saved) {
      try { document.getElementById('login-key').value = saved; } catch(e) {}
      toastInfo('Đang tự đăng nhập...');
      try{ await checkKey(); }catch(e){}
    } else {
      toastInfo('Nhập key để đăng nhập.');
    }
  }

  // Settings UI initial
  syncSettingsUI();

  // Online/offline toast
  window.addEventListener('online', () => toastOk('Mạng đã kết nối.'));
  window.addEventListener('offline', () => toastWarn('Mất kết nối mạng.'));
});

/* ========= 21) Expose functions to window (HTML onclick) ========= */
window.openMenu = openMenu;
window.closeMenu = closeMenu;
window.menuGo = menuGo;
window.menuActionAbout = menuActionAbout;
window.menuActionRefresh = menuActionRefresh;
window.menuActionCopyKey = menuActionCopyKey;
window.menuActionCopyDevice = menuActionCopyDevice;
window.menuActionClearSaved = menuActionClearSaved;
window.menuActionLogout = menuActionLogout;

window.switchLoginTab = switchLoginTab;
window.goContactPage = goContactPage;

window.toggleKeyVisibility = toggleKeyVisibility;
window.pasteFromClipboard = pasteFromClipboard;
window.clearSavedKey = clearSavedKey;
window.checkKey = checkKey;

window.refreshKeyInfo = refreshKeyInfo;
window.copyCurrentKey = copyCurrentKey;
window.copyDeviceId = copyDeviceId;

window.applyDPI = applyDPI;
window.applyPreset = applyPreset;

window.copyText = copyText;
window.removeDevice = removeDevice;
window.resetAllDevices = resetAllDevices;

window.startupRetry = startupRetry;
window.startupClose = startupClose;
window.startupLogout = startupLogout;

window.setSetting = setSetting;
window.resetSettings = resetSettings;

window.quickToggle = quickToggle;
