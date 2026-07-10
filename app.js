const CATEGORIES = [
  "Tribunal", "Magistratura", "Promotoria", "Outros concursos",
  "Instagram", "Simulados", "Atividade física", "Pessoal",
  "Saúde", "Finanças", "Outros"
];

const DEFAULT_ROUTINES = [
  { id: "email", title: "Verificar e-mails", points: 1 },
  { id: "deadlines", title: "Analisar prazos", points: 2 },
  { id: "questions", title: "Fazer 30 questões", points: 2 },
  { id: "errors", title: "Revisar erros", points: 2 },
  { id: "law", title: "Ler a lei seca", points: 2 },
  { id: "content", title: "Publicar conteúdo", points: 1 },
  { id: "students", title: "Responder alunos", points: 1 },
  { id: "training", title: "Treinar", points: 1 },
  { id: "shower", title: "Tomar banho", points: 1 },
  { id: "tomorrow", title: "Preparar o dia seguinte", points: 2 }
];

const DAILY_QUESTIONS = [
  "Há e-mail sem resposta?",
  "Há alguém aguardando retorno?",
  "Há tarefa iniciada e não concluída?",
  "Qual é a principal tarefa do dia?",
  "Qual matéria será estudada?",
  "Quantas questões serão feitas?",
  "Há pendência do Instagram ou dos simulados?",
  "O que precisa ser preparado para amanhã?"
];

const todayKey = () => new Date().toISOString().slice(0,10);
const uid = () => crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());

const defaultState = {
  tasks: [],
  priorities: [],
  nowTaskId: null,
  routines: {},
  study: {
    date: todayKey(), track: "Magistratura", subject: "", questionGoal: 30,
    questionDone: 0, lawGoal: "", lawResume: ""
  },
  water: { date: todayKey(), total: 0, goal: 2000 },
  questions: { date: todayKey(), answers: {} },
  settings: {
    workStart: "08:00", workEnd: "14:00", studyStart: "16:30",
    reviewTime: "21:30", waterInterval: 60, scoreGoal: 12
  },
  history: {},
  lastOpenDate: todayKey()
};

let state = loadState();
let nowTimer = null;
let nowSeconds = 0;
let focusSeconds = 25 * 60;
let focusInterval = null;
let focusRunning = false;
let reminderInterval = null;
let lastReminderMinute = "";

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem("painelClodoaldo"));
    return saved ? { ...defaultState, ...saved, settings: { ...defaultState.settings, ...(saved.settings || {}) } } : structuredClone(defaultState);
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem("painelClodoaldo", JSON.stringify(state));
}

function dailyResetIfNeeded() {
  const today = todayKey();
  if (state.lastOpenDate !== today) {
    const yesterdayScore = calculateScore();
    state.history[state.lastOpenDate] = { score: yesterdayScore, completed: yesterdayScore >= state.settings.scoreGoal };
    state.routines = {};
    state.study = { ...defaultState.study, date: today };
    state.water = { date: today, total: 0, goal: state.water.goal || 2000 };
    state.questions = { date: today, answers: {} };
    state.priorities = state.priorities.filter(id => {
      const t = state.tasks.find(x => x.id === id);
      return t && !t.done && (!t.date || t.date === today);
    });
    state.lastOpenDate = today;
    saveState();
  }
}

function seedTasks() {
  if (state.tasks.length) return;
  const today = todayKey();
  const seeds = [
    ["Verificar e-mails e mensagens pendentes", "Tribunal", "important", 1],
    ["Analisar prazos e processos do PJe", "Tribunal", "urgent", 2],
    ["Fazer 30 questões", "Magistratura", "important", 2],
    ["Ler a lei seca do dia", "Magistratura", "important", 2],
    ["Revisar erros das questões", "Magistratura", "important", 2],
    ["Responder alunos", "Simulados", "wait", 1],
    ["Treinar", "Atividade física", "important", 1],
    ["Tomar banho", "Saúde", "important", 1],
    ["Verificar contas e vencimentos", "Finanças", "important", 2],
    ["Preparar o dia seguinte", "Pessoal", "important", 2]
  ];
  state.tasks = seeds.map(([title, category, priority, points]) => ({
    id: uid(), title, category, priority, points, date: today, time: "", process: "", notes: "", done: false, createdAt: Date.now()
  }));
  state.priorities = state.tasks.slice(0,3).map(t => t.id);
  saveState();
}

function formatDateBR(dateStr) {
  if (!dateStr) return "Sem data";
  return new Date(dateStr + "T12:00:00").toLocaleDateString("pt-BR");
}

function todayLabel() {
  return new Date().toLocaleDateString("pt-BR", { weekday:"long", day:"2-digit", month:"long", year:"numeric" });
}

function priorityLabel(value) {
  return value === "urgent" ? "Urgente" : value === "important" ? "Importante" : "Pode esperar";
}

function calculateScore() {
  const routineScore = DEFAULT_ROUTINES.reduce((sum, r) => sum + (state.routines[r.id] ? r.points : 0), 0);
  const taskScore = state.tasks.reduce((sum, t) => sum + (t.done && t.completedDate === todayKey() ? Number(t.points || 0) : 0), 0);
  const waterScore = state.water.total >= state.water.goal ? 1 : 0;
  return routineScore + taskScore + waterScore;
}

function calculateStreak() {
  let streak = calculateScore() >= state.settings.scoreGoal ? 1 : 0;
  let cursor = new Date();
  cursor.setDate(cursor.getDate() - 1);
  while (true) {
    const key = cursor.toISOString().slice(0,10);
    if (state.history[key]?.completed) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else break;
  }
  return streak;
}

function render() {
  document.getElementById("todayLabel").textContent = todayLabel();
  renderCategories();
  renderPriorities();
  renderTasks();
  renderRoutines();
  renderStudy();
  renderWater();
  renderQuestions();
  renderScore();
  renderAlerts();
  renderNowTask();
  loadSettingsFields();
}

function renderCategories() {
  const taskCat = document.getElementById("taskCategory");
  const filterCat = document.getElementById("filterCategory");
  if (taskCat.options.length !== CATEGORIES.length) {
    taskCat.innerHTML = CATEGORIES.map(c => `<option>${c}</option>`).join("");
  }
  if (filterCat.options.length === 1) {
    filterCat.innerHTML = `<option value="all">Todas as áreas</option>` + CATEGORIES.map(c => `<option>${c}</option>`).join("");
  }
}

function renderPriorities() {
  const grid = document.getElementById("prioritiesGrid");
  const priorityTasks = state.priorities.map(id => state.tasks.find(t => t.id === id)).filter(Boolean).slice(0,3);
  if (!priorityTasks.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">Escolha até três tarefas essenciais para hoje.</div>`;
    return;
  }
  grid.innerHTML = priorityTasks.map((t, index) => `
    <div class="priority-card ${t.priority}">
      <div>
        <span class="kicker">PRIORIDADE ${index + 1}</span>
        <h3>${escapeHtml(t.title)}</h3>
        <div class="meta-row">
          <span class="tag">${escapeHtml(t.category)}</span>
          <span class="tag">${priorityLabel(t.priority)}</span>
          ${t.process ? `<span class="tag">${escapeHtml(t.process)}</span>` : ""}
        </div>
      </div>
      <div class="priority-actions">
        <button class="primary small" onclick="setNowTask('${t.id}')">Fazer agora</button>
        <button class="success small" onclick="toggleTask('${t.id}')">${t.done ? "Reabrir" : "Concluir"}</button>
        <button class="ghost small" onclick="removePriority('${t.id}')">Remover</button>
      </div>
    </div>
  `).join("");
}

function filteredTasks() {
  const category = document.getElementById("filterCategory").value;
  const status = document.getElementById("filterStatus").value;
  const query = document.getElementById("searchTask").value.toLowerCase().trim();
  const today = todayKey();
  return state.tasks.filter(t => {
    if (category !== "all" && t.category !== category) return false;
    if (query && !(t.title + " " + t.process + " " + t.notes).toLowerCase().includes(query)) return false;
    if (status === "open" && t.done) return false;
    if (status === "today" && (t.date !== today || t.done)) return false;
    if (status === "overdue" && (t.done || !t.date || t.date >= today)) return false;
    if (status === "done" && !t.done) return false;
    return true;
  }).sort((a,b) => {
    const order = { urgent:0, important:1, wait:2 };
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (order[a.priority] !== order[b.priority]) return order[a.priority] - order[b.priority];
    return (a.date || "9999").localeCompare(b.date || "9999") || (a.time || "99").localeCompare(b.time || "99");
  });
}

function renderTasks() {
  const list = document.getElementById("taskList");
  const tasks = filteredTasks();
  if (!tasks.length) {
    list.innerHTML = `<div class="empty-state">Nenhuma tarefa neste filtro.</div>`;
    return;
  }
  const today = todayKey();
  list.innerHTML = tasks.map(t => `
    <div class="task-row ${t.done ? "done" : ""} ${!t.done && t.date && t.date < today ? "overdue" : ""}">
      <input type="checkbox" ${t.done ? "checked" : ""} onchange="toggleTask('${t.id}')" />
      <div>
        <h3>${escapeHtml(t.title)}</h3>
        <div class="meta-row">
          <span class="tag">${escapeHtml(t.category)}</span>
          <span class="tag">${priorityLabel(t.priority)}</span>
          <span class="tag">${formatDateBR(t.date)} ${t.time || ""}</span>
          ${t.process ? `<span class="tag">Proc. ${escapeHtml(t.process)}</span>` : ""}
          <span class="tag">${Number(t.points || 0)} pt</span>
        </div>
        ${t.notes ? `<p class="muted">${escapeHtml(t.notes)}</p>` : ""}
      </div>
      <div class="task-actions">
        <button class="icon-btn" title="Fazer agora" onclick="setNowTask('${t.id}')">▶</button>
        <button class="icon-btn" title="Prioridade" onclick="togglePriority('${t.id}')">★</button>
        <button class="icon-btn" title="Editar" onclick="editTask('${t.id}')">✎</button>
        <button class="icon-btn" title="Excluir" onclick="deleteTask('${t.id}')">×</button>
      </div>
    </div>
  `).join("");
}

function renderRoutines() {
  const list = document.getElementById("routineList");
  list.innerHTML = DEFAULT_ROUTINES.map(r => `
    <label class="routine-item ${state.routines[r.id] ? "done" : ""}">
      <span class="routine-left">
        <input type="checkbox" ${state.routines[r.id] ? "checked" : ""} onchange="toggleRoutine('${r.id}')" />
        <span>${r.title}</span>
      </span>
      <span class="tag">+${r.points}</span>
    </label>
  `).join("");
}

function renderStudy() {
  document.getElementById("studyTrack").value = state.study.track;
  document.getElementById("studySubject").value = state.study.subject;
  document.getElementById("questionGoal").value = state.study.questionGoal;
  document.getElementById("questionDone").value = state.study.questionDone;
  document.getElementById("lawGoal").value = state.study.lawGoal;
  document.getElementById("lawResume").value = state.study.lawResume;
  const pct = Math.min(100, Math.round((Number(state.study.questionDone || 0) / Math.max(1, Number(state.study.questionGoal || 0))) * 100));
  document.getElementById("questionPct").textContent = pct + "%";
  document.getElementById("questionProgress").style.width = pct + "%";
}

function renderWater() {
  const pct = Math.min(100, Math.round((state.water.total / Math.max(1, state.water.goal)) * 100));
  document.getElementById("waterTotal").textContent = state.water.total + " ml";
  document.getElementById("waterPct").textContent = pct + "%";
  document.getElementById("waterFill").style.height = pct + "%";
  document.getElementById("waterGoal").value = String(state.water.goal);
}

function renderQuestions() {
  const list = document.getElementById("dailyQuestions");
  list.innerHTML = DAILY_QUESTIONS.map((q, i) => {
    const answer = state.questions.answers[i] || "";
    return `<div class="question-item ${answer ? "open" : ""}">
      <button class="ghost full" style="margin:0;text-align:left" onclick="toggleQuestion(${i})">${escapeHtml(q)}</button>
      <textarea id="answer-${i}" placeholder="Registre em uma frase..." onchange="saveQuestion(${i}, this.value)">${escapeHtml(answer)}</textarea>
    </div>`;
  }).join("");
}

function renderScore() {
  const score = calculateScore();
  const goal = Number(state.settings.scoreGoal || 12);
  document.getElementById("scoreValue").textContent = score;
  document.getElementById("scoreGoalLabel").textContent = goal;
  document.getElementById("scoreProgress").style.width = Math.min(100, Math.round(score / goal * 100)) + "%";
  document.getElementById("streakValue").textContent = calculateStreak() + " dias";
}

function getAlerts() {
  const today = todayKey();
  const alerts = [];
  state.tasks.filter(t => !t.done && t.date && t.date < today).forEach(t => alerts.push(`Atrasada: ${t.title}`));
  state.tasks.filter(t => !t.done && t.date === today && t.priority === "urgent").forEach(t => alerts.push(`Urgente hoje: ${t.title}`));
  if (!state.routines.email) alerts.push("Ainda não verificou os e-mails.");
  if (!state.routines.deadlines) alerts.push("Ainda não analisou os prazos.");
  if (state.water.total < state.water.goal * .35 && new Date().getHours() >= 12) alerts.push("Hidratação abaixo do esperado.");
  if (state.priorities.length < 3) alerts.push("Defina as três prioridades do dia.");
  return alerts;
}

function renderAlerts() {
  const alerts = getAlerts();
  document.getElementById("alertCount").textContent = `${alerts.length} ${alerts.length === 1 ? "pendência" : "pendências"}`;
  document.getElementById("alertsList").innerHTML = alerts.length
    ? alerts.slice(0,6).map(a => `<div class="alert-item">${escapeHtml(a)}</div>`).join("")
    : `<p class="muted">Nenhum alerta crítico agora.</p>`;
}

function renderNowTask() {
  const t = state.tasks.find(x => x.id === state.nowTaskId);
  document.getElementById("nowTaskTitle").textContent = t ? t.title : "Escolha a tarefa atual";
  document.getElementById("nowTaskMeta").textContent = t ? `${t.category} • ${priorityLabel(t.priority)}${t.process ? " • Proc. " + t.process : ""}` : "Defina uma das três prioridades como tarefa atual.";
}

function loadSettingsFields() {
  ["workStart","workEnd","studyStart","reviewTime","waterInterval","scoreGoal"].forEach(id => {
    document.getElementById(id).value = state.settings[id];
  });
}

function openTaskDialog(task = null) {
  document.getElementById("taskForm").reset();
  document.getElementById("taskId").value = task?.id || "";
  document.getElementById("dialogTitle").textContent = task ? "Editar tarefa" : "Nova tarefa";
  document.getElementById("taskTitle").value = task?.title || "";
  document.getElementById("taskCategory").value = task?.category || "Tribunal";
  document.getElementById("taskPriority").value = task?.priority || "important";
  document.getElementById("taskDate").value = task?.date || todayKey();
  document.getElementById("taskTime").value = task?.time || "";
  document.getElementById("taskPoints").value = task?.points ?? 1;
  document.getElementById("taskProcess").value = task?.process || "";
  document.getElementById("taskNotes").value = task?.notes || "";
  document.getElementById("taskIsPriority").checked = task ? state.priorities.includes(task.id) : false;
  document.getElementById("taskDialog").showModal();
}

function editTask(id) { openTaskDialog(state.tasks.find(t => t.id === id)); }

function deleteTask(id) {
  if (!confirm("Excluir esta tarefa?")) return;
  state.tasks = state.tasks.filter(t => t.id !== id);
  state.priorities = state.priorities.filter(x => x !== id);
  if (state.nowTaskId === id) state.nowTaskId = null;
  saveState(); render();
}

function toggleTask(id) {
  const t = state.tasks.find(x => x.id === id);
  if (!t) return;
  t.done = !t.done;
  t.completedDate = t.done ? todayKey() : null;
  if (t.done && state.nowTaskId === id) state.nowTaskId = null;
  saveState(); render(); toast(t.done ? "Tarefa concluída." : "Tarefa reaberta.");
}

function toggleRoutine(id) {
  state.routines[id] = !state.routines[id];
  saveState(); render();
}

function togglePriority(id) {
  if (state.priorities.includes(id)) state.priorities = state.priorities.filter(x => x !== id);
  else {
    if (state.priorities.length >= 3) return toast("Você já definiu três prioridades.");
    state.priorities.push(id);
  }
  saveState(); render();
}

function removePriority(id) {
  state.priorities = state.priorities.filter(x => x !== id);
  saveState(); render();
}

function setNowTask(id) {
  state.nowTaskId = id;
  saveState(); render();
  toast("Tarefa atual definida.");
}

function saveStudy() {
  state.study = {
    date: todayKey(),
    track: document.getElementById("studyTrack").value,
    subject: document.getElementById("studySubject").value,
    questionGoal: Number(document.getElementById("questionGoal").value || 0),
    questionDone: Number(document.getElementById("questionDone").value || 0),
    lawGoal: document.getElementById("lawGoal").value,
    lawResume: document.getElementById("lawResume").value
  };
  saveState(); render(); toast("Missão de estudo salva.");
}

function saveSettings() {
  ["workStart","workEnd","studyStart","reviewTime","waterInterval","scoreGoal"].forEach(id => {
    state.settings[id] = document.getElementById(id).value;
  });
  state.settings.waterInterval = Number(state.settings.waterInterval);
  state.settings.scoreGoal = Number(state.settings.scoreGoal);
  saveState(); render(); scheduleReminders(); toast("Horários salvos.");
}

function toggleQuestion(i) {
  const item = document.getElementById(`answer-${i}`).parentElement;
  item.classList.toggle("open");
}

function saveQuestion(i, value) {
  state.questions.answers[i] = value;
  saveState();
}

function startNowTimer() {
  if (nowTimer) {
    clearInterval(nowTimer); nowTimer = null;
    document.getElementById("startTimerBtn").textContent = "Continuar";
    return;
  }
  if (!state.nowTaskId) return toast("Escolha uma tarefa atual primeiro.");
  document.getElementById("startTimerBtn").textContent = "Pausar";
  nowTimer = setInterval(() => {
    nowSeconds++;
    const m = String(Math.floor(nowSeconds / 60)).padStart(2,"0");
    const s = String(nowSeconds % 60).padStart(2,"0");
    document.getElementById("nowTaskTimer").textContent = `${m}:${s}`;
    document.getElementById("nowProgress").style.width = Math.min(100, nowSeconds / 1500 * 100) + "%";
    if (nowSeconds === 1500) notify("Bloco de foco concluído", "Faça uma pausa curta ou conclua a tarefa.");
  }, 1000);
}

function clearNow() {
  state.nowTaskId = null;
  if (nowTimer) clearInterval(nowTimer);
  nowTimer = null; nowSeconds = 0;
  document.getElementById("nowTaskTimer").textContent = "00:00";
  document.getElementById("nowProgress").style.width = "0";
  document.getElementById("startTimerBtn").textContent = "Iniciar 25 min";
  saveState(); render();
}

function openFocus() {
  const t = state.tasks.find(x => x.id === state.nowTaskId);
  document.getElementById("focusTitle").textContent = t?.title || "Escolha uma tarefa atual";
  document.getElementById("focusMeta").textContent = t ? `${t.category} • ${priorityLabel(t.priority)}` : "";
  document.getElementById("focusDialog").showModal();
}

function updateFocusTimer() {
  const m = String(Math.floor(focusSeconds / 60)).padStart(2,"0");
  const s = String(focusSeconds % 60).padStart(2,"0");
  document.getElementById("focusTimer").textContent = `${m}:${s}`;
}

function toggleFocusTimer() {
  if (!state.nowTaskId) return toast("Escolha uma tarefa atual primeiro.");
  focusRunning = !focusRunning;
  document.getElementById("focusStartPause").textContent = focusRunning ? "Pausar" : "Continuar";
  if (focusRunning) {
    focusInterval = setInterval(() => {
      focusSeconds--;
      updateFocusTimer();
      if (focusSeconds <= 0) {
        clearInterval(focusInterval); focusRunning = false; focusSeconds = 25*60;
        updateFocusTimer(); notify("Bloco de 25 minutos concluído", "Registre o avanço e escolha a próxima ação.");
      }
    }, 1000);
  } else clearInterval(focusInterval);
}

function notify(title, body) {
  if ("Notification" in window && Notification.permission === "granted") new Notification(title, { body, icon: "icon.svg" });
  toast(`${title}: ${body}`);
}

function requestNotifications() {
  if (!("Notification" in window)) return toast("Este navegador não oferece notificações.");
  Notification.requestPermission().then(p => toast(p === "granted" ? "Notificações ativadas." : "Permissão não concedida."));
}

function scheduleReminders() {
  if (reminderInterval) clearInterval(reminderInterval);
  reminderInterval = setInterval(() => {
    const now = new Date();
    const hhmm = now.toTimeString().slice(0,5);
    const minuteKey = todayKey() + hhmm;
    if (lastReminderMinute === minuteKey) return;
    const map = {
      [state.settings.workStart]: ["Início do trabalho", "Abra o painel e defina as três prioridades."],
      [state.settings.workEnd]: ["Encerramento do expediente", "Verifique pendências e registre a próxima ação."],
      [state.settings.studyStart]: ["Hora do estudo", "Comece pela missão acadêmica do dia."],
      [state.settings.reviewTime]: ["Revisão final", "Prepare amanhã e confira contas, retornos e leitura."]
    };
    if (map[hhmm]) {
      notify(map[hhmm][0], map[hhmm][1]); lastReminderMinute = minuteKey;
    }
    const interval = Number(state.settings.waterInterval || 60);
    if (now.getMinutes() === 0 && now.getHours() % Math.max(1, Math.round(interval/60)) === 0) {
      notify("Hora de se hidratar", "Beba água e registre no painel.");
    }
  }, 20000);
}

function downloadFile(name, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

function exportJson() {
  downloadFile(`painel-backup-${todayKey()}.json`, JSON.stringify(state, null, 2), "application/json");
}

function exportCsv() {
  const rows = [["Tarefa","Área","Prioridade","Data","Horário","Status","Processo","Pontos","Observações"]];
  state.tasks.forEach(t => rows.push([t.title,t.category,priorityLabel(t.priority),t.date,t.time,t.done?"Concluída":"Em aberto",t.process,t.points,t.notes]));
  const csv = rows.map(row => row.map(v => `"${String(v ?? "").replaceAll('"','""')}"`).join(",")).join("\n");
  downloadFile(`tarefas-notion-${todayKey()}.csv`, "\ufeff" + csv, "text/csv;charset=utf-8");
}

function exportIcs() {
  const events = state.tasks.filter(t => !t.done && t.date);
  const parts = ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Painel Clodoaldo//PT-BR"];
  events.forEach(t => {
    const time = (t.time || "09:00").replace(":","");
    const start = t.date.replaceAll("-","") + "T" + time + "00";
    const endDate = new Date(`${t.date}T${t.time || "09:00"}:00`);
    endDate.setMinutes(endDate.getMinutes()+30);
    const end = endDate.toISOString().replace(/[-:]/g,"").slice(0,15);
    parts.push("BEGIN:VEVENT",`UID:${t.id}@painel-clodoaldo`,`DTSTAMP:${new Date().toISOString().replace(/[-:]/g,"").split(".")[0]}Z`,`DTSTART:${start}`,`DTEND:${end}`,`SUMMARY:${escapeIcs(t.title)}`,`DESCRIPTION:${escapeIcs(`${t.category}${t.process ? " | Proc. " + t.process : ""}${t.notes ? " | " + t.notes : ""}`)}`,"END:VEVENT");
  });
  parts.push("END:VCALENDAR");
  downloadFile(`agenda-painel-${todayKey()}.ics`, parts.join("\r\n"), "text/calendar");
}

function escapeIcs(v) { return String(v || "").replace(/\\/g,"\\\\").replace(/\n/g,"\\n").replace(/,/g,"\\,").replace(/;/g,"\\;"); }
function escapeHtml(v) { return String(v ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])); }

function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg; el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2600);
}

document.getElementById("addTaskBtn").onclick = () => openTaskDialog();
document.getElementById("addPriorityBtn").onclick = () => openTaskDialog();
document.getElementById("closeDialogBtn").onclick = () => document.getElementById("taskDialog").close();
document.getElementById("taskForm").addEventListener("submit", e => {
  e.preventDefault();
  const id = document.getElementById("taskId").value || uid();
  const existing = state.tasks.find(t => t.id === id);
  const task = {
    id,
    title: document.getElementById("taskTitle").value.trim(),
    category: document.getElementById("taskCategory").value,
    priority: document.getElementById("taskPriority").value,
    date: document.getElementById("taskDate").value,
    time: document.getElementById("taskTime").value,
    points: Number(document.getElementById("taskPoints").value || 0),
    process: document.getElementById("taskProcess").value.trim(),
    notes: document.getElementById("taskNotes").value.trim(),
    done: existing?.done || false,
    completedDate: existing?.completedDate || null,
    createdAt: existing?.createdAt || Date.now()
  };
  if (!task.title) return;
  if (existing) Object.assign(existing, task); else state.tasks.push(task);
  const wantPriority = document.getElementById("taskIsPriority").checked;
  if (wantPriority && !state.priorities.includes(id)) {
    if (state.priorities.length >= 3) toast("Tarefa salva, mas já existem três prioridades.");
    else state.priorities.push(id);
  }
  if (!wantPriority) state.priorities = state.priorities.filter(x => x !== id);
  saveState(); document.getElementById("taskDialog").close(); render();
});
document.getElementById("filterCategory").onchange = renderTasks;
document.getElementById("filterStatus").onchange = renderTasks;
document.getElementById("searchTask").oninput = renderTasks;
document.getElementById("resetRoutineBtn").onclick = () => { state.routines = {}; saveState(); render(); };
document.getElementById("saveStudyBtn").onclick = saveStudy;
document.getElementById("questionDone").oninput = () => {
  const goal = Number(document.getElementById("questionGoal").value || 0);
  const done = Number(document.getElementById("questionDone").value || 0);
  const pct = Math.min(100, Math.round(done/Math.max(1,goal)*100));
  document.getElementById("questionPct").textContent = pct+"%";
  document.getElementById("questionProgress").style.width = pct+"%";
};
document.querySelectorAll(".water-btn").forEach(btn => btn.onclick = () => {
  state.water.total += Number(btn.dataset.water); saveState(); render();
});
document.getElementById("resetWaterBtn").onclick = () => { state.water.total = 0; saveState(); render(); };
document.getElementById("waterGoal").onchange = e => { state.water.goal = Number(e.target.value); saveState(); render(); };
document.getElementById("saveSettingsBtn").onclick = saveSettings;
document.getElementById("notifyBtn").onclick = requestNotifications;
document.getElementById("startTimerBtn").onclick = startNowTimer;
document.getElementById("completeNowBtn").onclick = () => { if (state.nowTaskId) toggleTask(state.nowTaskId); else toast("Nenhuma tarefa atual."); };
document.getElementById("clearNowBtn").onclick = clearNow;
document.getElementById("focusBtn").onclick = openFocus;
document.getElementById("focusStartPause").onclick = toggleFocusTimer;
document.getElementById("focusComplete").onclick = () => { if (state.nowTaskId) toggleTask(state.nowTaskId); document.getElementById("focusDialog").close(); };
document.getElementById("focusClose").onclick = () => document.getElementById("focusDialog").close();
document.getElementById("exportJsonBtn").onclick = exportJson;
document.getElementById("exportCsvBtn").onclick = exportCsv;
document.getElementById("exportIcsBtn").onclick = exportIcs;
document.getElementById("importJsonInput").onchange = e => {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try { state = JSON.parse(reader.result); saveState(); render(); toast("Backup restaurado."); }
    catch { toast("Arquivo de backup inválido."); }
  };
  reader.readAsText(file);
};

dailyResetIfNeeded();
seedTasks();
render();
scheduleReminders();
if ("serviceWorker" in navigator) navigator.serviceWorker.register("service-worker.js");
