// ============================================================
// UI-2 — LEITOR DO HISTÓRICO v2 (READ ONLY)
// ============================================================

const HISTORY_KEY = "kripta_focus_history_v2";

// estado local de visualização (não persistente)
let groupByState = false;

function loadHistory(){
  const raw = localStorage.getItem(HISTORY_KEY);
  return raw ? JSON.parse(raw) : [];
}

// ------------------------------------------------------------
// DATA + HORA HUMANA
// ------------------------------------------------------------
function formatDateTime(ts){
  const d = new Date(ts);
  const today = new Date();
  const oneDay = 24 * 60 * 60 * 1000;

  const d0 = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diff = Math.floor((t0 - d0) / oneDay);

  let dayLabel;
  if (diff === 0) dayLabel = "Hoje";
  else if (diff === 1) dayLabel = "Ontem";
  else {
    dayLabel = d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short"
    });
  }

  const timeLabel = d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit"
  });

  return `${dayLabel} · ${timeLabel}`;
}

// ------------------------------------------------------------
// DURAÇÃO
// ------------------------------------------------------------
function formatDuration(ms){
  const m = Math.floor(ms / 60000);
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h > 0 ? `${h}h ${r}min` : `${r}min`;
}

// ------------------------------------------------------------
// COR POR ESTADO (consistente com o sistema)
// ------------------------------------------------------------
function colorForState(state){
  const map = {
    trabalho:   "#e53935", // vermelho
    estudo:     "#1e88e5", // azul
    lazer:      "#43a047", // verde
    descanso:   "#757575", // cinza
    redes:      "#8e24aa", // roxo
    hobbie:     "#f9a825", // amarelo
    navegacao:  "#039be5", // azul claro
    familia:    "#fb8c00"  // laranja
  };
  return map[state] || "#9e9e9e";
}

// ------------------------------------------------------------
// BOTÃO: VOLTAR PARA O FOCUS (TOPO)
// ------------------------------------------------------------
function ensureBackButton(){
  if (document.getElementById("ui2-back-focus")) return;

  const hero = document.querySelector(".ui2-hero");
  if (!hero) return;

  const btn = document.createElement("button");
  btn.id = "ui2-back-focus";
  btn.textContent = "← Voltar para o Focus";

  btn.style.background = "none";
  btn.style.border = "none";
  btn.style.padding = "0";
  btn.style.marginBottom = "6px";
  btn.style.color = "inherit";
  btn.style.opacity = "0.6";
  btn.style.cursor = "pointer";
  btn.style.fontSize = "13px";

  btn.addEventListener("click", () => {
    window.location.href = "index.html";
  });

  hero.prepend(btn);
}

// ------------------------------------------------------------
// BOTÃO: AGRUPAR POR ESTADO (opcional)
// ------------------------------------------------------------
function ensureToggleButton(){
  if (document.getElementById("ui2-toggle-group")) return;

  const hero = document.querySelector(".ui2-hero");
  if (!hero) return;

  const btn = document.createElement("button");
  btn.id = "ui2-toggle-group";
  btn.textContent = "Agrupar por estado";

  btn.style.background = "none";
  btn.style.border = "none";
  btn.style.color = "inherit";
  btn.style.opacity = "0.6";
  btn.style.cursor = "pointer";
  btn.style.fontSize = "13px";
  btn.style.float = "right";
  btn.style.marginTop = "4px";

  btn.addEventListener("click", () => {
    groupByState = !groupByState;
    btn.textContent = groupByState
      ? "Ver cronológico"
      : "Agrupar por estado";
    renderHistory();
  });

  hero.appendChild(btn);
}

// ------------------------------------------------------------
// ITEM DE HISTÓRICO
// ------------------------------------------------------------
function renderRow(entry){
  const row = document.createElement("article");
  row.className = "ui2-entry";

  const color = colorForState(entry.state);

  row.innerHTML = `
    <div class="ui2-entry-date">
      ${formatDateTime(entry.start)}
    </div>

    <div class="ui2-entry-state">
      <span
        style="
          display:inline-block;
          width:8px;
          height:8px;
          border-radius:50%;
          background:${color};
          margin-right:8px;
          vertical-align:middle;
          opacity:0.9;
        ">
      </span>
      ${entry.state}
      ${entry.focusAvg !== undefined
        ? `<span style="opacity:.6;font-size:13px"> · ${entry.focusAvg}%</span>`
        : ""
      }
    </div>

    <div class="ui2-entry-duration">
      ${formatDuration(entry.durationMs || 0)}
    </div>
  `;

  return row;
}

// ------------------------------------------------------------
// RENDER
// ------------------------------------------------------------
function renderHistory(){
  const root = document.querySelector(".ui2-history");
  if (!root) return;

  ensureBackButton();
  ensureToggleButton();

  const data = loadHistory();
  root.innerHTML = "";

  if (data.length === 0){
    root.innerHTML = "<p>Nenhum histórico registrado.</p>";
    return;
  }

  const items = data.slice().reverse();

  if (!groupByState){
    items.forEach(entry => root.appendChild(renderRow(entry)));
    return;
  }

  const groups = {};
  items.forEach(entry => {
    if (!groups[entry.state]) groups[entry.state] = [];
    groups[entry.state].push(entry);
  });

  Object.keys(groups).sort().forEach(state => {
    const header = document.createElement("h3");
    header.textContent = state;
    header.style.opacity = "0.6";
    header.style.margin = "16px 0 6px";
    root.appendChild(header);

    groups[state].forEach(entry => root.appendChild(renderRow(entry)));
  });
}

document.addEventListener("DOMContentLoaded", renderHistory);

// ============================================================
// SNAPSHOT — LEITURA v1 (opcional, futura)
// ============================================================
function getSnapshots() {
  const raw = localStorage.getItem("kripta_focus_snapshots_v1");
  return raw ? JSON.parse(raw) : [];
}
