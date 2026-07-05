const supa = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const app = document.getElementById('app');
const statusLine = document.getElementById('statusLine');
let currentCategory = null;
let allQuestions = [];

// ---------- Routing ----------
window.addEventListener('hashchange', render);
window.addEventListener('DOMContentLoaded', () => {
  checkConnection();
  render();
});

function checkConnection(){
  if (SUPABASE_URL.includes('YOUR_SUPABASE')) {
    statusLine.textContent = 'not connected — add your Supabase keys in config.js';
    statusLine.style.color = 'var(--red)';
  } else {
    statusLine.textContent = 'live';
  }
}

function route(){
  const hash = location.hash.replace('#','') || '/';
  const parts = hash.split('/').filter(Boolean);
  if (parts[0] === 'question' && parts[1]) return { view:'thread', id: parts[1] };
  return { view:'home' };
}

async function render(){
  const r = route();
  if (r.view === 'thread') return renderThread(r.id);
  return renderHome();
}

// ---------- Home / Feed ----------
async function renderHome(){
  app.innerHTML = `
    <section class="hero">
      <div class="hero-grid">
        <div class="hero-copy">
          <span class="eyebrow">Post a problem · Any field</span>
          <h1>Stuck on something? Route it to someone who isn't.</h1>
          <p>Post whatever you're actually stuck on — networking, cooking, legal, code, parenting, anything. Anyone in the world can pick it up and answer.</p>
          <button class="btn btn-primary" onclick="document.getElementById('askBtn').click()">Post a problem</button>
        </div>
        ${relayDiagramSVG()}
      </div>
    </section>

    <div class="feed-head">
      <h2>Open channel</h2>
      <div class="filters" id="filters"></div>
    </div>
    <div id="feed" class="card-list"><div class="empty-state">Loading…</div></div>
  `;
  await loadQuestions();
}

function relayDiagramSVG(){
  return `
  <div class="relay-diagram">
    <svg viewBox="0 0 320 200">
      <path class="relay-line" d="M40,100 C 100,100 100,40 180,40" id="path1"/>
      <path class="relay-line" d="M40,100 C 100,100 100,160 180,160" id="path2"/>
      <path class="relay-line" d="M40,100 C 110,100 110,100 180,100" id="path3"/>
      <circle class="node origin" cx="40" cy="100" r="7"/>
      <circle class="node solved" cx="185" cy="40" r="6"/>
      <circle class="node" cx="185" cy="100" r="6"/>
      <circle class="node solved" cx="185" cy="160" r="6"/>
      <circle class="packet p1" r="4" style="offset-path:path('M40,100 C 100,100 100,40 180,40')"/>
      <circle class="packet p2" r="4" style="offset-path:path('M40,100 C 100,100 100,100 180,100')"/>
      <circle class="packet p3" r="4" style="offset-path:path('M40,100 C 100,100 100,160 180,160')"/>
    </svg>
  </div>`;
}

async function loadQuestions(){
  const feed = document.getElementById('feed');
  try{
    const { data, error } = await supa
      .from('questions')
      .select('id, name, title, category, solved, created_at, answers(count)')
      .order('created_at', { ascending:false });
    if (error) throw error;
    allQuestions = data || [];
    renderFilters();
    renderFeed(allQuestions);
  }catch(e){
    feed.innerHTML = `<div class="empty-state"><h3>Can't reach the database</h3>
      <p>${escapeHtml(e.message || 'Check your Supabase config.js keys and table setup.')}</p></div>`;
  }
}

function renderFilters(){
  const cats = [...new Set(allQuestions.map(q => q.category).filter(Boolean))];
  const el = document.getElementById('filters');
  if (!el) return;
  el.innerHTML = `<button class="chip ${!currentCategory?'active':''}" onclick="setFilter(null)">All</button>` +
    cats.map(c => `<button class="chip ${currentCategory===c?'active':''}" onclick="setFilter('${escapeAttr(c)}')">${escapeHtml(c)}</button>`).join('');
}

window.setFilter = function(cat){
  currentCategory = cat;
  renderFilters();
  const filtered = cat ? allQuestions.filter(q => q.category === cat) : allQuestions;
  renderFeed(filtered);
};

function renderFeed(list){
  const feed = document.getElementById('feed');
  const q = document.getElementById('searchInput').value.trim().toLowerCase();
  const filtered = q ? list.filter(item => item.title.toLowerCase().includes(q) || (item.category||'').toLowerCase().includes(q)) : list;
  if (!filtered.length){
    feed.innerHTML = `<div class="empty-state"><h3>Nothing here yet</h3><p>Be the first to post a problem in this channel.</p></div>`;
    return;
  }
  feed.innerHTML = filtered.map(qn => {
    const count = qn.answers?.[0]?.count ?? 0;
    return `
    <div class="q-card" onclick="location.hash='/question/${qn.id}'">
      <span class="q-status ${qn.solved?'solved':'open'}">${qn.solved?'Solved':'Open'}</span>
      <div class="q-main">
        <p class="q-title">${escapeHtml(qn.title)}</p>
        <div class="q-meta">
          <span class="tag">${escapeHtml(qn.category || 'general')}</span>
          <span>posted by ${escapeHtml(qn.name)}</span>
          <span>· ${timeAgo(qn.created_at)}</span>
        </div>
      </div>
      <div class="q-answers-count"><b>${count}</b>answer${count===1?'':'s'}</div>
    </div>`;
  }).join('');
}

document.getElementById('searchInput').addEventListener('input', () => {
  const filtered = currentCategory ? allQuestions.filter(q => q.category === currentCategory) : allQuestions;
  renderFeed(filtered);
});

// ---------- Thread view ----------
async function renderThread(id){
  app.innerHTML = `<div class="back-link" onclick="location.hash='/'">← back to channel</div><div class="empty-state">Loading…</div>`;
  try{
    const { data: qn, error: qErr } = await supa.from('questions').select('*').eq('id', id).single();
    if (qErr) throw qErr;
    const { data: answers, error: aErr } = await supa.from('answers').select('*').eq('question_id', id).order('created_at', { ascending:true });
    if (aErr) throw aErr;

    app.innerHTML = `
      <div class="back-link" onclick="location.hash='/'">← back to channel</div>
      <div class="thread-head">
        <span class="q-status ${qn.solved?'solved':'open'}">${qn.solved?'Solved':'Open'}</span>
        <h1>${escapeHtml(qn.title)}</h1>
        <div class="thread-meta">
          <span class="tag">${escapeHtml(qn.category || 'general')}</span>
          <span>posted by ${escapeHtml(qn.name)}</span>
          <span>· ${timeAgo(qn.created_at)}</span>
        </div>
      </div>
      <div class="thread-body">${escapeHtml(qn.body)}</div>
      ${qn.solved ? '' : `<button class="btn btn-ghost" id="markSolvedBtn">Mark as solved</button>`}

      <div class="answers-head">${answers.length} answer${answers.length===1?'':'s'}</div>
      <div id="answersList">
        ${answers.length ? answers.map(a => `
          <div class="answer-card">
            <div class="answer-body">${escapeHtml(a.body)}</div>
            <div class="answer-meta"><span>${escapeHtml(a.name)}</span><span>${timeAgo(a.created_at)}</span></div>
          </div>`).join('') : `<p class="muted">No answers yet — first response wins the gratitude.</p>`}
      </div>

      <form class="answer-form" id="answerForm">
        <h3>Add an answer</h3>
        <label>Your name<input type="text" name="name" required maxlength="60" placeholder="How should they know it's you?"/></label>
        <label>Answer<textarea name="body" required rows="5" placeholder="Explain your fix or advice."></textarea></label>
        <div class="modal-actions"><button type="submit" class="btn btn-primary">Post answer</button></div>
      </form>
    `;

    document.getElementById('answerForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const { error } = await supa.from('answers').insert({
        question_id: id, name: fd.get('name'), body: fd.get('body')
      });
      if (error) return alert('Could not post answer: ' + error.message);
      renderThread(id);
    });

    const solvedBtn = document.getElementById('markSolvedBtn');
    if (solvedBtn){
      solvedBtn.addEventListener('click', async () => {
        const { error } = await supa.from('questions').update({ solved:true }).eq('id', id);
        if (!error) renderThread(id);
      });
    }
  }catch(e){
    app.innerHTML = `<div class="back-link" onclick="location.hash='/'">← back to channel</div>
      <div class="empty-state"><h3>Couldn't load this thread</h3><p>${escapeHtml(e.message)}</p></div>`;
  }
}

// ---------- Ask modal ----------
const askModal = document.getElementById('askModal');
document.getElementById('askBtn').addEventListener('click', () => askModal.classList.remove('hidden'));
document.getElementById('closeAsk').addEventListener('click', () => askModal.classList.add('hidden'));
document.getElementById('cancelAsk').addEventListener('click', () => askModal.classList.add('hidden'));
askModal.addEventListener('click', (e) => { if (e.target === askModal) askModal.classList.add('hidden'); });

document.getElementById('askForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const payload = {
    name: fd.get('name'), title: fd.get('title'),
    category: fd.get('category'), body: fd.get('body')
  };
  const { data, error } = await supa.from('questions').insert(payload).select().single();
  if (error) return alert('Could not post: ' + error.message);
  askModal.classList.add('hidden');
  e.target.reset();
  location.hash = `/question/${data.id}`;
});

// ---------- Helpers ----------
function escapeHtml(str){
  return String(str ?? '').replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
}
function escapeAttr(str){ return escapeHtml(str).replace(/'/g, '&#39;'); }
function timeAgo(dateStr){
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff/60) + 'm ago';
  if (diff < 86400) return Math.floor(diff/3600) + 'h ago';
  return Math.floor(diff/86400) + 'd ago';
}
