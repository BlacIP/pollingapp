/* ---------- Storage & IDs ---------- */
const STORAGE_KEY = "pollingapp_polls_v2";
const votedKey = (id, scope) => `voted_${scope}_${id}`;
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const read = () => JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
const write = (v) => localStorage.setItem(STORAGE_KEY, JSON.stringify(v));

/* ---------- State ---------- */
let polls = read();
let active = null;
let chart = null;

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

/* ---------- Helpers ---------- */
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
  const title = titleEl.value.trim();
  const options = getOptions().map(t => ({ id: uid(), text: t }));
  if (!title) return alert("Title is required.");
  if (options.length < 2) return alert("Add at least two options.");
  const poll = {
    id: uid(),
    title,
    description: descEl.value.trim() || "",
    image: imgEl.value.trim() || "",
    type: typeEl.value, // single|multiple
    requireName: requireName.checked,
    security: voteSecurity.value, // none|session|device|code
    closeAt: closeAt.value || null,
    options,
    votes: options.map(()=>0),
    codes: voteSecurity.value === "code" ? Array.from({length: 20}, ()=>uid().slice(0,6)) : [] // demo
  };
  polls.push(poll);
  write(polls);

  // open just-created poll
  openPoll(poll.id);
  renderPollsList();
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

  // share
  const url = `${location.origin}${location.pathname}#${active.id}`;
  setShareTargets(url);

  // results
  renderChart();
}

/* ---------- Vote ---------- */
voteForm.onsubmit = (e)=>{
  e.preventDefault();
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