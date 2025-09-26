/* ---------- Storage & IDs ---------- */
const STORAGE_KEY = "pollingapp_polls_v2";
const votedKey = (id, scope) => `voted_${scope}_${id}`;
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ValidationError";
  }
}

const read = () => {
  const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  return raw.map(normalizePoll);
};
const write = (v) => localStorage.setItem(STORAGE_KEY, JSON.stringify(v));

/* ---------- State ---------- */
let polls = read();
let active = null;
let chart = null;

function normalizePoll(poll) {
  if (!poll) return poll;
  const options = (poll.options || []).map((opt, idx) => normalizeOption(opt, Array.isArray(poll.votes) ? poll.votes[idx] : 0));
  const votes = Array.isArray(poll.votes) ? poll.votes : options.map(opt => opt.votes || 0);
  return { ...poll, options, votes };
}

function normalizeOption(option = {}, fallbackVotes = 0) {
  const children = Array.isArray(option.children) ? option.children.map(child => normalizeOption(child, 0)) : [];
  const votes = typeof option.votes === "number" ? option.votes : (typeof fallbackVotes === "number" ? fallbackVotes : 0);
  return {
    ...option,
    id: option.id || uid(),
    text: option.text || "",
    votes,
    children
  };
}

/* ---------- DOM ---------- */
const byId = (x) => document.getElementById(x);

const titleEl = byId("poll-title");
const addDescBtn = byId("add-desc");
const descWrap = byId("desc-wrap");
const descEl = byId("poll-desc");
const imgEl = byId("img-url");
const typeEl = byId("poll-type");

const optionsWrap = byId("options");
const addOptBtn = byId("add-option");
const addOtherBtn = byId("add-other");
const pasteBtn = byId("paste");

const allowMulti = byId("allow-multi");
const requireName = byId("require-name");
const voteSecurity = byId("vote-security");
const useCaptcha = byId("use-captcha"); // visual only in this demo
const closeAt = byId("close-at");

const createBtn = byId("create-btn");

const activeCard = byId("active-card");
const viewTitle = byId("view-title");
const viewDesc = byId("view-desc");
const viewImg = byId("view-img");

const voteForm = byId("vote-form");
const voteOptions = byId("vote-options");
const nameRow = byId("name-row");
const voterName = byId("voter-name");
const voteBtn = byId("vote-btn");
const showResultsBtn = byId("show-results");
const securityNote = byId("security-note");

const results = byId("results");

const pollsCard = byId("polls");
const pollsList = byId("polls-list");

const menuBtn = byId("menu-btn");
const menu = byId("menu");
const resetBtn = byId("reset-poll");
const exportBtn = byId("export-poll");
const deleteBtn = byId("delete-poll");
const closeInfo = byId("close-info");
const formError = byId("form-error");

/* Share modal */
const shareOpen = byId("share-open");
const shareModal = byId("share-modal");
const shareClose = byId("share-close");
const closeModalBtn = byId("close-modal");
const shareLink = byId("share-link");
const copyLinkBtn = byId("copy-link");
const shareWA = byId("share-whatsapp");
const shareTW = byId("share-twitter");
const shareFB = byId("share-facebook");
const qrcodeBox = byId("qrcode");
const nestedSummary = byId("nested-summary");
const nestedTotal = byId("nested-total");
const nestedTree = byId("nested-tree");

/* ---------- Helpers ---------- */
const formatDateTime = (value) => {
  if (!value) return "";
  try {
    return dayjs(value).format("MMM D, YYYY h:mm A");
  } catch (err) {
    return new Date(value).toLocaleString();
  }
};

function optionTotal(option) {
  const own = option && typeof option.votes === "number" ? option.votes : 0;
  const childTotal = option && Array.isArray(option.children) && option.children.length
    ? tallyNested(option.children)
    : 0;
  return own + childTotal;
}

function tallyNested(options) {
  return (options || []).reduce((sum, opt) => sum + optionTotal(opt), 0);
}

function renderOptionsTree(container, options) {
  const list = document.createElement("ul");
  list.className = "nested-list";

  (options || []).forEach(option => {
    const li = document.createElement("li");
    const row = document.createElement("div");
    row.className = "nested-row";

    const label = document.createElement("span");
    label.textContent = option.text;

    const totalPill = document.createElement("span");
    totalPill.className = "pill";
    totalPill.textContent = optionTotal(option);

    row.append(label, totalPill);
    li.appendChild(row);

    const meta = document.createElement("span");
    meta.className = "nested-meta";
    const directVotes = option && typeof option.votes === "number" ? option.votes : 0;
    if (option.children && option.children.length) {
      const count = option.children.length;
      meta.textContent = `self ${directVotes} • ${count} sub option${count === 1 ? "" : "s"}`;
    } else {
      meta.textContent = `${directVotes} vote${directVotes === 1 ? "" : "s"}`;
    }
    li.appendChild(meta);

    if (option.children && option.children.length) {
      renderOptionsTree(li, option.children);
    }

    list.appendChild(li);
  });

  container.appendChild(list);
}

function renderNestedSummary() {
  if (!nestedSummary) return;

  nestedTree.innerHTML = "";
  if (!active || !Array.isArray(active.options) || active.options.length === 0) {
    nestedSummary.classList.add("hidden");
    nestedTotal.textContent = "0";
    return;
  }

  nestedSummary.classList.remove("hidden");
  nestedTotal.textContent = tallyNested(active.options);
  renderOptionsTree(nestedTree, active.options);
}

function resetOptionVotes(option) {
  if (!option) return;
  option.votes = 0;
  if (Array.isArray(option.children)) {
    option.children.forEach(resetOptionVotes);
  }
}

function addOptionRow(value = "") {
  const row = document.createElement("div");
  row.className = "option-row";
  row.innerHTML = `
    <input class="input opt" placeholder="Option" value="${value.replace(/"/g, '&quot;')}"/>
    <button class="icon-btn remove" title="Remove">✕</button>`;
  row.querySelector(".remove").onclick = () => row.remove();
  optionsWrap.appendChild(row);
}

function getOptions() {
  return [...optionsWrap.querySelectorAll(".opt")]
    .map(i => i.value.trim())
    .filter(Boolean);
}

function setShareTargets(url) {
  shareLink.value = url;
  shareWA.href = `https://wa.me/?text=${encodeURIComponent(url)}`;
  shareTW.href = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}`;
  shareFB.href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  qrcodeBox.innerHTML = "";
  new QRCode(qrcodeBox, { text: url, width: 120, height: 120 });
}

function renderPollsList() {
  polls = read();
  pollsList.innerHTML = "";
  if (polls.length === 0) { pollsCard.classList.add("hidden"); return; }
  pollsCard.classList.remove("hidden");
  polls.forEach(p => {
    const li = document.createElement("li");
    const a = document.createElement("button");
    a.className = "btn ghost";
    a.textContent = p.title;
    a.onclick = () => openPoll(p.id);
    const small = document.createElement("span");
    small.className = "muted";
    small.textContent = "Open";
    li.append(a, small);
    pollsList.appendChild(li);
  });
}

/* ---------- Create flow ---------- */
addDescBtn.onclick = () => descWrap.classList.toggle("collapse");
addOptBtn.onclick = () => addOptionRow();
addOtherBtn.onclick = () => addOptionRow("Other");
pasteBtn.onclick = async () => {
  try{
    const t = await navigator.clipboard.readText();
    t.split(/\r?\n/).map(s=>s.trim()).filter(Boolean).forEach(v=>addOptionRow(v));
  }catch{ alert("Paste failed. Copy your lines and try again."); }
};

createBtn.onclick = () => {
  formError.classList.add("hidden");
  formError.textContent = "";

  const title = titleEl.value.trim();
  const optionNodes = getOptions().map(text => ({ id: uid(), text, votes: 0, children: [] }));

  try {
    if (!title) throw new ValidationError("Title is required.");
    if (optionNodes.length < 2) throw new ValidationError("Add at least two options.");

    const allHaveContent = optionNodes.every(opt => opt.text.trim().length > 0);
    if (!allHaveContent) throw new ValidationError("Options cannot be blank.");

    const hasDuplicate = optionNodes.some((opt, idx) =>
      optionNodes.slice(idx + 1).some(other => other.text.trim().toLowerCase() === opt.text.trim().toLowerCase())
    );
    if (hasDuplicate) throw new ValidationError("Use unique option labels to avoid confusion.");

    if (closeAt.value) {
      const closeTime = dayjs(closeAt.value);
      if (!closeTime.isValid()) {
        throw new ValidationError("Close time must be a valid date and time.");
      }
      if (closeTime.isBefore(dayjs())) {
        throw new ValidationError("Close time must be in the future.");
      }
    }

    const poll = normalizePoll({
      id: uid(),
      title,
      description: descEl.value.trim() || "",
      image: imgEl.value.trim() || "",
      type: typeEl.value, // single|multiple
      requireName: requireName.checked,
      security: voteSecurity.value, // none|session|device|code
      closeAt: closeAt.value || null,
      options: optionNodes,
      votes: optionNodes.map(() => 0),
      codes: voteSecurity.value === "code" ? Array.from({ length: 20 }, () => uid().slice(0, 6)) : []
    });

    polls.push(poll);
    write(polls);

    openPoll(poll.id);
    renderPollsList();
  } catch (err) {
    if (err instanceof ValidationError) {
      formError.textContent = err.message;
      formError.classList.remove("hidden");
      return;
    }
    console.error("Failed to create poll", err);
    alert("Something unexpected happened while creating the poll. Please try again.");
  }
};

/* ---------- Open + render ---------- */
function openPoll(id){
  active = read().find(p=>p.id===id);
  if(!active) return;

  document.querySelector("header h1").textContent = "Poll";
  document.querySelector("header .subtitle").textContent = "Vote and view live results.";
  activeCard.classList.remove("hidden");

  viewTitle.textContent = active.title;
  viewDesc.textContent = active.description || "";
  viewDesc.classList.toggle("hidden", !active.description);
  if(active.image){
    viewImg.src = active.image; viewImg.classList.remove("hidden");
  }else{
    viewImg.classList.add("hidden");
  }

  // options
  voteOptions.innerHTML = "";
  const inputType = active.type === "multiple" ? "checkbox" : "radio";
  active.options.forEach((opt, idx)=>{
    const row = document.createElement("label");
    row.className = "choice";
    row.innerHTML = `<input name="vote" type="${inputType}" value="${idx}"><span>${opt.text}</span>`;
    voteOptions.appendChild(row);
  });

  nameRow.classList.toggle("collapse", !active.requireName);

  // security note
  const notes = {
    none: "Multiple votes allowed.",
    session: "One vote per browser session allowed.",
    device: "One vote per device allowed.",
    code: "One vote per unique code. You'll be asked for a code."
  };
  securityNote.textContent = notes[active.security] || "";
  if (active.closeAt) {
    closeInfo.textContent = `Closes ${formatDateTime(active.closeAt)}`;
    closeInfo.classList.remove("hidden");
  } else {
    closeInfo.classList.add("hidden");
  }

  // share
  const url = `${location.origin}${location.pathname}#${active.id}`;
  setShareTargets(url);

  // results
  renderChart();
}

/* ---------- Vote ---------- */
voteForm.onsubmit = (e)=>{
  e.preventDefault();
  if(active.closeAt && dayjs().isAfter(dayjs(active.closeAt))){
    return alert("This poll is closed.");
  }
  if(active.requireName && !voterName.value.trim()){
    return alert("Please enter your name.");
  }

  // collect selected indices
  const selected = [...voteOptions.querySelectorAll("input:checked")].map(i=>+i.value);
  if (selected.length === 0) return alert("Select an option.");
  if (active.type === "single" && selected.length > 1) return alert("Select only one option.");

  // security checks
  const scope = active.security === "session" ? "session" :
                active.security === "device" ? "device" :
                active.security === "code" ? "code" : "none";

  if(scope === "session" && sessionStorage.getItem(votedKey(active.id, scope))){
    return alert("You already voted in this session.");
  }
  if(scope === "device" && localStorage.getItem(votedKey(active.id, scope))){
    return alert("You already voted on this device.");
  }
  if(scope === "code"){
    const code = prompt("Enter your voting code:");
    if(!code) return;
    if(!active.codes.includes(code)) return alert("Invalid code.");
    if(localStorage.getItem(votedKey(active.id, code))) return alert("Code already used on this device.");
    localStorage.setItem(votedKey(active.id, code), "1");
  }

  // tally
  const fresh = read();
  const poll = fresh.find(p=>p.id===active.id);
  selected.forEach(i => poll.votes[i]++);
  selected.forEach(i => {
    const option = poll.options[i];
    option.votes = (option.votes || 0) + 1;
  });
  write(fresh);
  active = poll;

  // mark voted
  if(scope==="session") sessionStorage.setItem(votedKey(active.id, scope),"1");
  if(scope==="device") localStorage.setItem(votedKey(active.id, scope),"1");

  renderChart();
  alert("Vote successful");
};

/* ---------- Results ---------- */
function renderChart(){
  const ctx = document.getElementById("resultsChart").getContext("2d");
  results.classList.remove("hidden");
  if(chart) chart.destroy();
  chart = new Chart(ctx, {
    type:"bar",
    data:{
      labels: active.options.map(o=>o.text),
      datasets:[{ label:"Votes", data: active.votes }]
    },
    options:{ responsive:true, animation:false, scales:{y:{beginAtZero:true, ticks:{precision:0}}} }
  });
  renderNestedSummary();
}
showResultsBtn.onclick = ()=> renderChart();

/* ---------- Menu actions ---------- */
menuBtn.onclick = ()=> menu.classList.toggle("hidden");
document.addEventListener("click",(e)=>{ if(!menu.contains(e.target) && e.target!==menuBtn) menu.classList.add("hidden"); });

resetBtn.onclick = ()=>{
  if(!confirm("Reset all votes to 0?")) return;
  const fresh = read();
  const p = fresh.find(x=>x.id===active.id);
  p.votes = p.votes.map(()=>0);
  (p.options || []).forEach(resetOptionVotes);
  write(fresh); active = p; renderChart();
};

exportBtn.onclick = ()=>{
  const rows = [["Option","Votes"], ...active.options.map((o,i)=>[o.text, active.votes[i]])];
  const csv = rows.map(r=>r.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], {type:"text/csv"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${active.title.replace(/\W+/g,"_")}.csv`;
  a.click();
};

deleteBtn.onclick = ()=>{
  if(!confirm("Delete this poll?")) return;
  polls = read().filter(p=>p.id!==active.id);
  write(polls);
  active = null;
  activeCard.classList.add("hidden");
  renderPollsList();
};

/* ---------- Share modal ---------- */
shareOpen.onclick = ()=> shareModal.classList.remove("hidden");
shareClose.onclick = closeModalBtn.onclick = ()=> shareModal.classList.add("hidden");
copyLinkBtn.onclick = async ()=>{
  try{ await navigator.clipboard.writeText(shareLink.value); copyLinkBtn.textContent="Copied!"; setTimeout(()=>copyLinkBtn.textContent="Copy",1000);}catch{}
};

/* ---------- Boot ---------- */
renderPollsList();
if(location.hash.length>1){ openPoll(location.hash.slice(1)); }
/* add one more option row default for UX */
if(optionsWrap.querySelectorAll(".option-row").length<2){ addOptionRow(); addOptionRow(); }
