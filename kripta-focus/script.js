// ===============================================================
// KRIPTA-FOCUS — SCRIPT COMPLETO (Rota A + B + C + D + Rota F + MODO HD)
// RESTAURADO — SEM REGRESSÕES — PATCH CIRÚRGICO APLICADO
// ===============================================================

// ---------------------------------------------------------------
// STORAGE
// ---------------------------------------------------------------
const Storage = {
    save(data) {
        localStorage.setItem("kripta_focus_data", JSON.stringify(data));

        localStorage.setItem("kripta_focus_analytics", JSON.stringify({
            session: Analytics.computeSessionAggregates(),
            state: Analytics.computeStateAggregates(),
            projection: Analytics.computeProjection(),
            igdf: Analytics.computeIGDF(),
            insights: InsightCore.exportState()
        }));

        SessionMemory.persist();
        NeuralCore.persist();
    },

    load() {
        const raw = localStorage.getItem("kripta_focus_data");
        return raw ? JSON.parse(raw) : null;
    },

    clear() {
        localStorage.removeItem("kripta_focus_data");
        localStorage.removeItem("kripta_focus_analytics");

        localStorage.removeItem("ms_daily");
        localStorage.removeItem("ms_weekly");
        localStorage.removeItem("ms_monthly");
        localStorage.removeItem("neural_state");
    }
};

// ---------------------------------------------------------------
// FOCUS STATE
// ---------------------------------------------------------------
const FocusApp = {
    focus: 50,
    state: "trabalho",
    sessionStart: Date.now(),
    lastStateChange: Date.now(),
    stateTimes: {},
    hourHistory: [],
    miniLines: {},
    dayStart: new Date().setHours(0,0,0,0),

    initStateTimes() {
        [
            "trabalho","estudo","lazer","descanso",
            "redes","hobbie","navegacao","familia"
        ].forEach(k=>{
            if(!(k in this.stateTimes)) this.stateTimes[k] = 0;
            if(!(k in this.miniLines)) this.miniLines[k] = [];
        });
    }
};

// ---------------------------------------------------------------
// LOGIC
// ---------------------------------------------------------------
const Logic = {
    increaseFocus() {
        FocusApp.focus = Math.min(100, FocusApp.focus + 5);
        UI.updateFocusUI();
        DNA.updateFeedValue(FocusApp.focus);
        MiniLines.update(FocusApp.state, FocusApp.focus);
    },

    decreaseFocus() {
        FocusApp.focus = Math.max(0, FocusApp.focus - 5);
        UI.updateFocusUI();
        DNA.updateFeedValue(FocusApp.focus);
        MiniLines.update(FocusApp.state, FocusApp.focus);
    },

    changeState(newState) {
        const now = Date.now();
        const diff = now - FocusApp.lastStateChange;
        FocusApp.stateTimes[FocusApp.state] += diff;
        FocusApp.lastStateChange = now;
        FocusApp.state = newState;

        UI.updateStateUI();
        MiniLines.update(newState, FocusApp.focus);
    }
};

// ---------------------------------------------------------------
// DNA ENGINE (com MODO HD + Glow + Spline Suave)
// ---------------------------------------------------------------
const DNA = {
    history: [],
    lastFeed: 50,

    updateFeedValue(focusReal) {
        const noise = (Math.random()*2 - 1) * 0.8;
        this.lastFeed = Math.max(0, Math.min(100, focusReal * 0.9 + (focusReal+noise)*0.1));
    },

    tick() {
        this.history.push(this.lastFeed);
        if (this.history.length > 120) this.history.shift();
    }
};

// ---------------------------------------------------------------
// MINI-LINES
// ---------------------------------------------------------------
const MiniLines = {
    update(state, focus) {
        FocusApp.miniLines[state].push(focus);
        if (FocusApp.miniLines[state].length > 50)
            FocusApp.miniLines[state].shift();
        UI.drawMiniLines();
    }
};

// ======================================================================
// ANALYTICS (Rota B)
// ======================================================================
const Analytics = {
    computeStateAggregates() {
        const result = {};

        Object.entries(FocusApp.miniLines).forEach(([state, arr]) => {
            if (arr.length === 0) {
                result[state] = {
                    media: 0, pico: 0, variacao: 0, estabilidade: 0
                };
                return;
            }

            const media = arr.reduce((a,b)=>a+b,0)/arr.length;
            const pico = Math.max(...arr);

            const variacoes = arr.slice(1).map((v,i)=>Math.abs(v - arr[i]));
            const variacao = variacoes.length
                ? variacoes.reduce((a,b)=>a+b,0)/variacoes.length
                : 0;

            const estabilidade = 100 - Math.min(100, variacao);

            result[state] = { media, pico, variacao, estabilidade };
        });

        return result;
    },

    computeSessionAggregates() {
        const hist = DNA.history;
        if (hist.length === 0)
            return { mediaGeral: 0, consistencia: 0, volatilidade: 0 };

        const mediaGeral = hist.reduce((a,b)=>a+b,0)/hist.length;

        const diffs = hist.slice(1).map((v,i)=>Math.abs(v - hist[i]));
        const volatilidade = diffs.length
            ? diffs.reduce((a,b)=>a+b,0)/diffs.length
            : 0;

        const consistencia = 100 - Math.min(100, volatilidade);

        return { mediaGeral, consistencia, volatilidade };
    },

    computeProjection() {
        const hist = DNA.history;
        if (hist.length < 6) return { curto: 0, medio: 0 };

        const last = hist.slice(-6);
        const diffs = last.slice(1).map((v,i)=>v - last[i]);
        const slope = diffs.reduce((a,b)=>a+b,0)/diffs.length;

        const curto = Math.max(0, Math.min(100, last[last.length-1] + slope*3));
        const medio = Math.max(0, Math.min(100, last[last.length-1] + slope*10));

        return { curto, medio };
    },

    computeIGDF() {
        const sess = this.computeSessionAggregates();
        const estados = this.computeStateAggregates();
        const st = estados[FocusApp.state];

        const igdf =
            sess.mediaGeral * 0.4 +
            sess.consistencia * 0.4 +
            st.estabilidade * 0.2;

        return Math.max(0, Math.min(100, igdf));
    }
};

// ======================================================================
// INSIGHT ENGINE (Rota C)
// ======================================================================
const InsightCore = {
    state: { lastTrend: null, lastPattern: null, lastAlert: null },

    analyze() {
        const sess = Analytics.computeSessionAggregates();
        const proj = Analytics.computeProjection();
        const estados = Analytics.computeStateAggregates();
        const st = estados[FocusApp.state];

        const trend = this.detectTrend(sess, proj);
        const pattern = this.detectPattern(FocusApp.miniLines[FocusApp.state]);
        const alert = this.detectAlert(sess, proj, st);

        this.state.lastTrend = trend;
        this.state.lastPattern = pattern;
        this.state.lastAlert = alert;

        UI.updateInsights({ trend, pattern, alert, proj, sess, st });
    },

    detectTrend(sess, proj) {
        if (proj.curto > sess.mediaGeral + 10) return "Tendência positiva clara";
        if (proj.curto < sess.mediaGeral - 10) return "Tendência de queda";
        return "Estabilidade moderada";
    },

    detectPattern(arr) {
        if (!arr || arr.length < 6) return "Padrão insuficiente";

        const last = arr.slice(-6);

        if (last.every(v => v > 70)) return "Hiperfoco sustentado";
        if (last.every(v => v < 30)) return "Queda prolongada";

        if (Math.max(...last) - Math.min(...last) < 10)
            return "Ciclo estável";

        if (Math.max(...last) - Math.min(...last) > 40)
            return "Oscilação forte";

        return "Padrão misto";
    },

    detectAlert(sess, proj, st) {
        if (proj.curto < 20 && sess.consistencia < 40) return "⚠️ Queda crítica";
        if (proj.medio > 85 && st.estabilidade > 70) return "🔥 Hiperfoco";
        if (st.variacao > 40) return "⚠️ Inconsistência elevada";
        if (proj.curto > 90) return "⚡ Sobrecarga iminente";
        return "OK";
    },

    exportState() { return this.state; }
};

// ======================================================================
// META-SESSÕES E NÚCLEO NEURAL (Rota D)
// ======================================================================

const SessionMemory = {
    daily: JSON.parse(localStorage.getItem("ms_daily") || "[]"),
    weekly: JSON.parse(localStorage.getItem("ms_weekly") || "[]"),
    monthly: JSON.parse(localStorage.getItem("ms_monthly") || "[]"),

    record() {
        const snap = {
            ts: Date.now(),
            session: Analytics.computeSessionAggregates(),
            igdf: Analytics.computeIGDF()
        };

        this.daily.push(snap);
        if (this.daily.length > 1440) this.daily.shift();
    },

    aggregateWeekly() {
        if (this.daily.length === 0) return;

        const avgIGDF = this.daily.reduce((a,b)=>a + b.igdf, 0) / this.daily.length;

        this.weekly.push({ ts: Date.now(), avgIGDF });
        if (this.weekly.length > 52) this.weekly.shift();
    },

    aggregateMonthly() {
        if (this.weekly.length === 0) return;

        const avg =
            this.weekly.reduce((a,b)=>a + b.avgIGDF, 0) / this.weekly.length;

        this.monthly.push({ ts: Date.now(), avgIGDF: avg });

        if (this.monthly.length > 12) this.monthly.shift();
    },

    persist() {
        localStorage.setItem("ms_daily", JSON.stringify(this.daily));
        localStorage.setItem("ms_weekly", JSON.stringify(this.weekly));
        localStorage.setItem("ms_monthly", JSON.stringify(this.monthly));
    }
};

const MetaIGDF = {
    computeLongTerm() {
        if (SessionMemory.monthly.length < 2) return 50;

        const xs = SessionMemory.monthly.map(m => m.avgIGDF);
        const slope = xs[xs.length-1] - xs[0];

        return Math.max(0, Math.min(100, xs[xs.length-1] + slope * 0.4));
    }
};

const NeuralCore = {
    state: JSON.parse(localStorage.getItem("neural_state") || `{
        "trendLong": null,
        "sazonalidade": null,
        "metaInsights": []
    }`),

    analyze() {
        const longIGDF = MetaIGDF.computeLongTerm();

        let trend = "neutro";
        if (longIGDF > 60) trend = "ascendente";
        if (longIGDF < 40) trend = "descendente";

        let saz = "estável";
        if (SessionMemory.monthly.length >= 3) {
            const last3 = SessionMemory.monthly.slice(-3).map(m => m.avgIGDF);
            const max = Math.max(...last3);
            const min = Math.min(...last3);

            if (max - min > 20) saz = "alta variação";
            else if (max - min < 8) saz = "regularidade";
        }

        const insight = { ts: Date.now(), trend, saz, longIGDF };

        this.state.trendLong = trend;
        this.state.sazonalidade = saz;
        this.state.metaInsights.push(insight);

        if (this.state.metaInsights.length > 300)
            this.state.metaInsights.shift();
    },

    persist() {
        localStorage.setItem("neural_state", JSON.stringify(this.state));
    }
};

const NREC = {
    computeRecommendation() {
        const st = NeuralCore.state;

        if (st.trendLong === "ascendente")
            return "Mantenha o ritmo atual — evolução consistente detectada.";

        if (st.trendLong === "descendente")
            return "Reduza interferências e estabeleça janelas curtas de foco.";

        if (st.sazonalidade === "alta variação")
            return "Ajuste rotinas: picos e quedas fortes nas últimas semanas.";

        return "Continue monitorando — padrão estável.";
    }
};

// ---------------------------------------------------------------
// UI
// ---------------------------------------------------------------
const UI = {
    els: {},

    init() {
        this.els.focusBar = document.getElementById("focus-level-bar-fill");
        this.els.focusPercent = document.getElementById("focus-level-percent");

        this.els.inlinePercent = document.getElementById("focus-inline-percent");

        this.els.statePill = document.getElementById("focus-state-pill");
        this.els.stateText = document.getElementById("focus-status-text");
        this.els.sessionClock = document.getElementById("session-clock");
        this.els.stateClock = document.getElementById("state-clock");
        this.els.hourBar = document.getElementById("hour-thermometer-bar");
        this.els.dayBar = document.getElementById("day-thermometer-bar");
        this.els.miniLines = document.getElementById("mini-lines");

        this.els.insightsMain = document.getElementById("insight-core-block");
        this.els.insightFocus = document.getElementById("insight-focus-block");
        this.els.insightPatterns = document.getElementById("insight-patterns-block");
        this.els.insightAlerts = document.getElementById("insight-alerts-block");

        this.updateFocusUI();
        this.updateStateUI();
    },

    updateFocusUI() {
        this.els.focusBar.style.width = FocusApp.focus + "%";
        this.els.focusPercent.textContent = FocusApp.focus + "%";

        if (this.els.inlinePercent)
            this.els.inlinePercent.textContent = FocusApp.focus + "%";
    },

    updateStateUI() {
        this.els.statePill.textContent = FocusApp.state;
        this.els.stateText.textContent = "Estado atual: " + FocusApp.state;
    },

    updateAnalyticsUI() {
        const sessao = Analytics.computeSessionAggregates();
        const proj = Analytics.computeProjection();
        const igdf = Analytics.computeIGDF();
        const estados = Analytics.computeStateAggregates();
        const st = estados[FocusApp.state];

        const block = `
            <div style="margin-top:12px; font-size:14px; opacity:0.85;">
                <b>Média sessão:</b> ${sessao.mediaGeral.toFixed(1)} |
                <b>Consistência:</b> ${sessao.consistencia.toFixed(1)} |
                <b>Volatilidade:</b> ${sessao.volatilidade.toFixed(1)}<br>

                <b>Proj. curto:</b> ${proj.curto.toFixed(1)} |
                <b>Proj. médio:</b> ${proj.medio.toFixed(1)}<br>

                <b>${FocusApp.state.toUpperCase()} —</b>
                Média ${st.media.toFixed(1)} |
                Pico ${st.pico} |
                Estab. ${st.estabilidade.toFixed(1)}<br>

                <b>IGDF:</b> ${igdf.toFixed(1)}
            </div>
        `;

        document.getElementById("focus-start-info").innerHTML = block;
    },

    drawMiniLines() {
        this.els.miniLines.innerHTML = "";
        Object.entries(FocusApp.miniLines).forEach(([state, arr]) => {
            const wrap = document.createElement("div");
            wrap.style.marginBottom = "6px";

            const label = document.createElement("div");
            label.textContent = state.toUpperCase();
            label.style.fontSize = "14px";
            label.style.opacity = "0.7";

            const bar = document.createElement("div");
            bar.style.height = "6px";
            bar.style.background = "#0A1A2A";
            bar.style.borderRadius = "4px";
            bar.style.overflow = "hidden";
            bar.style.marginTop = "2px";

            const fill = document.createElement("div");
            fill.style.height = "100%";
            fill.style.background = StateColorMap[state] || "#00e3ff";
            fill.style.width = (arr[arr.length - 1] || 0) + "%";

            bar.appendChild(fill);
            wrap.appendChild(label);
            wrap.appendChild(bar);
            this.els.miniLines.appendChild(wrap);
        });
    },

    updateInsights(payload) {
        const { trend, pattern, alert, proj, sess, st } = payload;

        this.els.insightsMain.innerHTML = `
            <div style="margin-top:15px; font-size:14px; line-height:1.6;">
                <b>Tendência:</b> ${trend}<br>
                <b>Padrão Atual:</b> ${pattern}<br>
                <b>Alerta:</b> ${alert}
            </div>
        `;

        this.els.insightFocus.innerHTML = `
            <div style="margin-top:10px; font-size:14px; opacity:0.9;">
                <b>Interpretação de foco:</b><br>
                Sessão indica ${sess.consistencia.toFixed(1)}% de consistência.
                Projeção sugere foco ${proj.curto > sess.mediaGeral ? "ascendente" : "descendente"} no curto prazo.
            </div>
        `;

        this.els.insightPatterns.innerHTML = `
            <div style="margin-top:10px; font-size:14px; opacity:0.9;">
                <b>Mapa de Padrões (${FocusApp.state}):</b> ${pattern}
            </div>
        `;

        this.els.insightAlerts.innerHTML = `
            <div style="margin-top:10px; font-size:14px; opacity:0.95; color:#ff6161;">
                ${alert === "OK" ? "Sem alertas" : alert}
            </div>
        `;
    },

    updateHourThermometer() {
        const avg = FocusApp.hourHistory.reduce((a,b)=>a+b,0) /
                    (FocusApp.hourHistory.length || 1);
        this.els.hourBar.style.width = avg + "%";
    },

    updateDayThermometer() {
        const now = Date.now();
        const progress = (now - FocusApp.dayStart) / (24 * 3600 * 1000);
        this.els.dayBar.style.transform = `scaleX(${progress})`;
        this.els.dayBar.style.transformOrigin = "left";
    }
};

// ---------------------------------------------------------------
// CANVAS (MODO HD + Glow)
// ---------------------------------------------------------------
const canvas = document.getElementById("dna3-chart");
canvas.width = 960;
canvas.height = 540;
const ctx = canvas.getContext("2d");

function drawGridHD() {
    const cols = 8; // padrão xadrez
    const cellSize = canvas.width / cols;
    const alpha = 0.30; // 30% visível

    ctx.lineWidth = 1.2;
    ctx.strokeStyle = `rgba(0, 255, 140, ${alpha})`;

    // linhas verticais (xadrez)
    for (let i = 0; i <= cols; i++) {
        const x = i * cellSize;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }

    // linhas horizontais proporcionais
    const rows = Math.round(canvas.height / cellSize);
    for (let j = 0; j <= rows; j++) {
        const y = j * cellSize;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}

function drawSmoothLineHD(points) {
    if (points.length < 2) return;

    ctx.beginPath();

    ctx.lineWidth = 2.6;
    ctx.strokeStyle = "#00e3ff";

    ctx.shadowBlur = 14;
    ctx.shadowColor = "#00e3ff66";

    // parâmetros de oscilação máxima
    const waveAmplitude = 22;   // altura da onda (quanto maior, mais agressivo)
    const waveFrequency = 0.18; // frequência lateral (menor = ondas mais longas)
    const phase = performance.now() * 0.006; // animação contínua L → R

    for (let i = 0; i < points.length; i++) {
        const p = points[i];

        // deslocamento ondulatório horizontal
        const waveOffset =
            Math.sin(i * waveFrequency + phase) * waveAmplitude;

        const x = p.x + waveOffset;
        const y = p.y;

        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }

    ctx.stroke();
}


function drawDNAGraph() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawGridHD();

    const midY = canvas.height / 2;

    // parâmetros visuais base
    const amplitude = canvas.height * 0.12;
    const wavelength = canvas.width * 0.35;

    // foco atual (0–100)
    const focus =
        DNA.history.length
            ? DNA.history[DNA.history.length - 1]
            : 50;

    // mapeamento de foco → velocidade
    // foco 0   → muito lento
    // foco 100 → mais rápido
    const minSpeed = 0.0008;
    const maxSpeed = 0.0032;

    const speed =
        minSpeed +
        (focus / 100) * (maxSpeed - minSpeed);

    const t = performance.now();

    ctx.beginPath();
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = "#00e3ff";
    ctx.shadowBlur = 14;
    ctx.shadowColor = "#00e3ff66";

    for (let x = 0; x <= canvas.width; x += 2) {
        const phase =
            (x / wavelength) * Math.PI * 2 -
            t * speed * Math.PI * 2;

        const y =
            midY +
            Math.sin(phase) * amplitude;

        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }

    ctx.stroke();
}


// ---------------------------------------------------------------
// MAIN LOOP
// ---------------------------------------------------------------
function mainLoop() {
    const now = Date.now();

    UI.els.sessionClock.textContent =
        "Sessão: " + formatTime(now - FocusApp.sessionStart);

    UI.els.stateClock.textContent =
        "Estado: " + formatTime(now - FocusApp.lastStateChange);

    FocusApp.hourHistory.push(FocusApp.focus);
    if (FocusApp.hourHistory.length > 60) FocusApp.hourHistory.shift();
    UI.updateHourThermometer();

    UI.updateDayThermometer();

    DNA.tick();
    drawDNAGraph();

    UI.updateAnalyticsUI();
    InsightCore.analyze();

    SessionMemory.record();

    if (Math.random() < 0.02) {
        SessionMemory.aggregateWeekly();
        SessionMemory.aggregateMonthly();
        NeuralCore.analyze();
    }

    Storage.save(FocusApp);

    requestAnimationFrame(mainLoop);
}

// ---------------------------------------------------------------
// RESTORE
// ---------------------------------------------------------------
function restore() {
    const saved = Storage.load();
    if (!saved) return;

    Object.assign(FocusApp, saved);
    FocusApp.initStateTimes();
    UI.updateFocusUI();
    UI.updateStateUI();
    UI.drawMiniLines();
}

// ---------------------------------------------------------------
// UTIL
// ---------------------------------------------------------------
function formatTime(ms) {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    return `${h}h ${m%60}m ${s%60}s`;
}

// ---------------------------------------------------------------
// EVENTOS
// ---------------------------------------------------------------
window.addEventListener("DOMContentLoaded", () => {
    FocusApp.initStateTimes();
    UI.init();
    restore();

    document.getElementById("btn-focus-plus")
        .addEventListener("click", Logic.increaseFocus);

    document.getElementById("btn-focus-minus")
        .addEventListener("click", Logic.decreaseFocus);

    document.querySelectorAll(".kf-state-btn")
        .forEach(btn => btn.addEventListener("click", () =>
            Logic.changeState(btn.dataset.stateKey)
        ));

    document.getElementById("btn-reset-day")
        .addEventListener("click", ()=>Storage.clear());

    requestAnimationFrame(mainLoop);
});

// ======================================================================
// PATCH — CORES INDIVIDUAIS POR METADADO (ESPECTRO + BRANCO)
// ======================================================================
const StateColorMap = {
    trabalho:   "#ff0000",
    estudo:     "#ff7f00",
    lazer:      "#ffff00",
    descanso:   "#00ff00",
    redes:      "#00ffff",
    hobbie:     "#0000ff",
    navegacao:  "#8b00ff",
    familia:    "#ffffff"
};

// ======================================================================
// PROTOCOLO UNIVERSAL DE ESTABILIZAÇÃO
// ======================================================================

// CEV — Estabilização Visual
(function CEV_Stabilization() {
    window.addEventListener("kripta:layout-ready", () => {
        document.body.classList.add("kripta-layout-stable");

        const atlasBox = document.body.getBoundingClientRect();

        window.KRIPTA_STABLE_VIEW = {
            width: atlasBox.width,
            height: atlasBox.height,
            ts: Date.now()
        };

        window.dispatchEvent(new CustomEvent("kripta:visual-stable", {
            detail: { box: window.KRIPTA_STABLE_VIEW }
        }));
    });
})();

// CET — Camada Temporal
(function CET_TemporalLayer() {
    let last = performance.now();

    function heartbeat() {
        const now = performance.now();
        const dt = now - last;
        last = now;

        window.dispatchEvent(new CustomEvent("kripta:heartbeat", {
            detail: { dt, now }
        }));

        requestAnimationFrame(heartbeat);
    }

    requestAnimationFrame(heartbeat);
})();

// CAU — Ancoragem Universal
window.addEventListener("DOMContentLoaded", () => {
    const anchor = document.getElementById("kripta-cau-anchor");
    if (!anchor) return;

    window.KA = {
        mount(node) {
            try { anchor.appendChild(node); }
            catch (e) { console.warn("CAU mount falhou:", e); }
        },
        clear() {
            try { anchor.innerHTML = ""; }
            catch (e) { console.warn("CAU clear falhou:", e); }
        }
    };

    window.dispatchEvent(new CustomEvent("kripta:anchor-ready"));
});

// CEP — Estado Público
(function CEP_PublicState() {
    window.KRIPTA_FOCUS_PUBLIC = new Proxy({}, {
        get(_, key) {
            if (key === "focus") return FocusApp.focus;
            if (key === "state") return FocusApp.state;
            if (key === "lastChange") return FocusApp.lastStateChange;
            if (key === "sessionStart") return FocusApp.sessionStart;
            return undefined;
        }
    });

    window.dispatchEvent(new CustomEvent("kripta:public-state-ready"));
})();

// CSE — Sincronização Estrutural
(function CSE_Synchronization() {

    let visualReady = false;
    let anchorReady = false;

    window.addEventListener("kripta:visual-stable", () => {
        visualReady = true;
        checkReady();
    });

    window.addEventListener("kripta:anchor-ready", () => {
        anchorReady = true;
        checkReady();
    });

    function checkReady() {
        if (visualReady && anchorReady) {
            window.dispatchEvent(new CustomEvent("kripta:expansion-ready", {
                detail: {
                    stableView: window.KRIPTA_STABLE_VIEW,
                    focusPublic: window.KRIPTA_FOCUS_PUBLIC
                }
            }));
        }
    }
})();

// ======================================================================
// EIXO LÓGICO — Cenográfico
// ======================================================================

const HybridAxis = {
    cursor: 0,
    segments: [],
    activeState: null,
    activePercent: 0,
};

HybridAxis.setCursor = function (minuteIndex) {
    this.cursor = Math.max(0, Math.min(1439, minuteIndex));
    HybridAxisUI.redraw();
};

HybridAxis.advance = function (steps) {
    this.setCursor(this.cursor + steps);
};

HybridAxis.retrocede = function (steps) {
    this.setCursor(this.cursor - steps);
};

HybridAxis.setState = function (stateKey) {
    this.activeState = stateKey;
    HybridAxisUI.redraw();
};

HybridAxis.setPercent = function (value) {
    this.activePercent = value;
    HybridAxisUI.redraw();
};

HybridAxis.applySegment = function () {
    this.segments.push({
        from: this.cursor,
        to: this.cursor,
        state: this.activeState,
        percent: this.activePercent
    });
    HybridAxisUI.redraw();
};

let hybridCanvas = null;
let hybridCtx = null;

function initHybridAxis() {
    hybridCanvas = document.getElementById("hybrid-axis-canvas");
    if (!hybridCanvas) return;
    hybridCtx = hybridCanvas.getContext("2d");
    HybridAxisUI.redraw();
}

const HybridAxisUI = {
    redraw() {
        if (!hybridCtx) return;

        hybridCtx.clearRect(0, 0, hybridCanvas.width, hybridCanvas.height);

        hybridCtx.strokeStyle = "rgba(255,255,255,0.40)";
        for (let x = 0; x < hybridCanvas.width; x += 40) {
            hybridCtx.beginPath();
            hybridCtx.moveTo(x, 0);
            hybridCtx.lineTo(x, hybridCanvas.height);
            hybridCtx.stroke();
        }

        HybridAxis.segments.forEach(seg => {
            const x = (seg.from / 1440) * hybridCanvas.width;
            hybridCtx.fillStyle = StateColorMap[seg.state] || "#00e3ff";
            hybridCtx.fillRect(x, 10, 6, hybridCanvas.height - 20);
        });

        const cx = (HybridAxis.cursor / 1440) * hybridCanvas.width;
        hybridCtx.fillStyle = "#ffffff";
        hybridCtx.fillRect(cx - 1, 0, 2, hybridCanvas.height);
    }
};

window.addEventListener("DOMContentLoaded", initHybridAxis);

// ======================================================================
// RÉGUA CENOGRÁFICA
// ======================================================================

let rulerCanvas = null;
let rulerCtx = null;

function initRulerCanvas() {
    rulerCanvas = document.getElementById("hybrid-axis-ruler");
    if (!rulerCanvas) return;

    rulerCtx = rulerCanvas.getContext("2d");
    drawRuler();
}

function drawRuler() {
    if (!rulerCtx) return;

    const w = rulerCanvas.width;
    const h = rulerCanvas.height;

    rulerCtx.clearRect(0, 0, w, h);

    rulerCtx.strokeStyle = "rgba(255,255,255,0.10)";
    rulerCtx.beginPath();
    rulerCtx.moveTo(0, h-12);
    rulerCtx.lineTo(w, h-12);
    rulerCtx.stroke();

    const padding = 14;

    for (let hmark = 0; hmark <= 24; hmark++) {
        let x = (hmark / 24) * w;

        if (hmark === 0) x = padding;
        else if (hmark === 24) x = w - padding;

        rulerCtx.strokeStyle = "rgba(255,255,255,0.25)";
        rulerCtx.beginPath();
        rulerCtx.moveTo(x, h-18);
        rulerCtx.lineTo(x, h-6);
        rulerCtx.stroke();

        rulerCtx.fillStyle = "rgba(255,255,255,0.35)";
        rulerCtx.font = "9px Segoe UI";
        rulerCtx.textAlign = "center";
        rulerCtx.textBaseline = "top";
        rulerCtx.fillText(hmark + "h", x, 6);
    }

    for (let i = 0; i <= 144; i++) {
        const x = (i / 144) * w;

        rulerCtx.strokeStyle = "rgba(255,255,255,0.08)";
        rulerCtx.beginPath();
        rulerCtx.moveTo(x, h-14);
        rulerCtx.lineTo(x, h-10);
        rulerCtx.stroke();
    }
}

window.addEventListener("DOMContentLoaded", initRulerCanvas);

// ============================================================
// RÉGUA — Integração com Eixo
// ============================================================

function updateRulerCursor() {
    const e = document.getElementById("ruler-cursor-read");
    if (!e || !rulerCanvas) return;

    e.textContent = HybridAxis.cursor;

    const old = document.querySelector(".ruler-cursor-line");
    if (old) old.remove();

    const line = document.createElement("div");
    line.className = "ruler-cursor-line";

    const px = (HybridAxis.cursor / 1440) * rulerCanvas.clientWidth;
    line.style.left = px + "px";

    rulerCanvas.parentElement.appendChild(line);
}

function updateRulerSegments() {
    document.querySelectorAll(".ruler-segment-mark").forEach(n => n.remove());

    if (!HybridAxis.segments || !rulerCanvas) return;

    HybridAxis.segments.forEach(seg => {
        const mark = document.createElement("div");
        mark.className = "ruler-segment-mark";
        mark.style.color = StateColorMap[seg.state] || "#00e3ff";

        const x = (seg.from / 1440) * rulerCanvas.clientWidth;
        mark.style.left = x + "px";

        rulerCanvas.parentElement.appendChild(mark);
    });
}

function rulerSync() {
    updateRulerCursor();
    updateRulerSegments();
}

const _oldSetCursor = HybridAxis.setCursor;
HybridAxis.setCursor = function(minuteIndex) {
    _oldSetCursor.call(HybridAxis, minuteIndex);
    rulerSync();
};

const _oldApplySegment = HybridAxis.applySegment;
HybridAxis.applySegment = function() {
    _oldApplySegment.call(HybridAxis);
    rulerSync();
};

window.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
        rulerSync();
    }, 80);
});

// ======================================================================
// 🔵 COMANDO BLINDADO — BLOCO C (ADICIONADO AO FINAL DO ARQUIVO)
// ======================================================================

document.addEventListener("DOMContentLoaded", () => {
    const gMinus = document.getElementById("graph-focus-minus");
    const gPlus  = document.getElementById("graph-focus-plus");
    const gPercent = document.getElementById("graph-inline-percent");

    if (gMinus) gMinus.addEventListener("click", () => {
        Logic.decreaseFocus();
        if (gPercent) gPercent.textContent = FocusApp.focus + "%";
    });

    if (gPlus) gPlus.addEventListener("click", () => {
        Logic.increaseFocus();
        if (gPercent) gPercent.textContent = FocusApp.focus + "%";
    });

    if (gPercent) gPercent.textContent = FocusApp.focus + "%";
});

// ======================================================================
// FIM DO SCRIPT — 100% aditivo, sem tocar em nada existente.
// ======================================================================

// ======================================================================
// PATCH — CARTÃO "ÚLTIMA HORA" COMO HISTÓRICO REAL (100% ADITIVO)
// Não altera motor, DNA, Analytics, Eixo Lógico ou UI existente
// ======================================================================

(function LastHourHistoryPatch() {

    const MAX_WINDOW_MS = 60 * 60 * 1000; // 1 hora
    const history = [];

    function recordEvent(type) {
        history.push({
            ts: Date.now(),
            focus: FocusApp.focus,
            state: FocusApp.state,
            type
        });
        cleanup();
    }

    function cleanup() {
        const limit = Date.now() - MAX_WINDOW_MS;
        while (history.length && history[0].ts < limit) {
            history.shift();
        }
    }

    function render() {
        const wrapper = document.getElementById("hour-thermometer-wrapper");
        if (!wrapper) return;

        // Remove render antigo (se existir)
        const old = wrapper.querySelector(".hour-history-track");
        if (old) old.remove();

        const track = document.createElement("div");
        track.className = "hour-history-track";
        track.style.display = "flex";
        track.style.height = "100%";
        track.style.width = "100%";
        track.style.overflow = "hidden";
        track.style.borderRadius = "14px";

        const now = Date.now();

        if (history.length === 0) {
            track.style.background = "#0A1A2A";
            wrapper.appendChild(track);
            return;
        }

        for (let i = 0; i < history.length; i++) {
            const curr = history[i];
            const next = history[i + 1] || { ts: now };

            const duration = next.ts - curr.ts;
            const widthPct = (duration / MAX_WINDOW_MS) * 100;

            const seg = document.createElement("div");
            seg.style.width = widthPct + "%";
            seg.style.height = "100%";
            seg.style.background =
                StateColorMap[curr.state] || "#00e3ff";

            track.appendChild(seg);
        }

        wrapper.appendChild(track);
    }

    // ------------------------------
    // ANCORAGEM NOS EVENTOS EXISTENTES
    // ------------------------------

    const _inc = Logic.increaseFocus;
    Logic.increaseFocus = function () {
        _inc.apply(this, arguments);
        recordEvent("focus+");
    };

    const _dec = Logic.decreaseFocus;
    Logic.decreaseFocus = function () {
        _dec.apply(this, arguments);
        recordEvent("focus-");
    };

    const _chg = Logic.changeState;
    Logic.changeState = function (st) {
        _chg.apply(this, arguments);
        recordEvent("state");
    };

    // ------------------------------
    // LOOP LEVE DE ATUALIZAÇÃO VISUAL
    // ------------------------------
    function loop() {
        cleanup();
        render();
        requestAnimationFrame(loop);
    }

    window.addEventListener("DOMContentLoaded", () => {
        recordEvent("init");
        requestAnimationFrame(loop);
    });

})();

// ======================================================================
// PATCH — SUPRESSÃO SEMÂNTICA DE "SEM ALERTAS" NO CARTÃO ÚLTIMA HORA
// 100% aditivo | Não interfere no Insight Engine
// ======================================================================

(function SuppressHourAlertsText() {

    function sanitize() {
        const el = document.getElementById("insight-alerts-block");
        if (!el) return;

        const txt = el.textContent || "";
        if (txt.trim().toLowerCase() === "sem alertas") {
            el.style.display = "none";
        } else {
            el.style.display = "block";
        }
    }

    // roda continuamente sem custo relevante
    function loop() {
        sanitize();
        requestAnimationFrame(loop);
    }

    window.addEventListener("DOMContentLoaded", () => {
        requestAnimationFrame(loop);
    });

})();

// ======================================================================
// PATCH — HOLOGRAMAS REATIVOS AOS ÚLTIMOS ESTADOS DE FOCO (H1 / H2 / H3)
// 100% ADITIVO | FRONT-END PURO | SEM INTERFERIR EM MOTORES
// ======================================================================

(function ReactiveHologramsPatch() {

    const MAX = 3;
    const history = [];

    function pushState(stateKey) {
        if (!stateKey) return;

        // evita duplicar estado consecutivo
        if (history[0] === stateKey) return;

        history.unshift(stateKey);
        if (history.length > MAX) history.length = MAX;

        render();
    }

    function render() {
        const cards = document.querySelectorAll(".kf-holo-card");
        if (!cards || cards.length < 3) return;

        for (let i = 0; i < 3; i++) {
            const card = cards[i];
            const core = card.querySelector(".kf-holograma-mini-core");
            const title = card.querySelector("h2");

            const state = history[i];

            if (!state) {
                // estado neutro
                core.classList.add("holo-neutral");
                core.style.background = "";
                core.style.filter = "";
                if (title) title.textContent = `Holograma ${i + 1}`;
                continue;
            }

            const color = StateColorMap[state] || "#777777";

            core.classList.remove("holo-neutral");
            core.style.background = color;
            core.style.filter = `drop-shadow(0 0 14px ${color})`;

            if (title) {
                title.textContent =
                    `Holograma ${i + 1} — ${state.charAt(0).toUpperCase() + state.slice(1)}`;
            }
        }
    }

function updateHologramTitles(state) {
  document.querySelectorAll(".kf-holograma-title").forEach(el => {
    el.textContent = state ? state : "—";
  });
}

    // -------------------------------------------------------------
    // ANCORAGEM NO EVENTO EXISTENTE DE TROCA DE ESTADO
    // -------------------------------------------------------------
    const _changeState = Logic.changeState;
    Logic.changeState = function (newState) {
        _changeState.apply(this, arguments);
        pushState(newState);
    };

    // -------------------------------------------------------------
    // ESTADO INICIAL — TODOS NEUTROS
    // -------------------------------------------------------------
    window.addEventListener("DOMContentLoaded", () => {
        render();
    });

})();

// ======================================================================
// PATCH — EIXO LÓGICO INTEGRADO AO ESTADO ATIVO DO USUÁRIO
// Ao aplicar segmento, usa automaticamente:
// - estado atual (FocusApp.state)
// - foco atual (FocusApp.focus)
// ======================================================================

(function HybridAxisLiveBinding() {

    if (!window.HybridAxis || !window.FocusApp) return;

    const _apply = HybridAxis.applySegment;

    HybridAxis.applySegment = function () {

        // injeta dados vivos antes de registrar
        this.activeState = FocusApp.state;
        this.activePercent = FocusApp.focus;

        // mantém comportamento original
        _apply.call(this);
    };

})();

// ======================================================================
// PATCH — GARANTIA DE COR DO SEGMENTO NO EIXO LÓGICO
// Força a associação do estado ativo no momento da criação
// ======================================================================

(function HybridAxisSegmentColorFix() {

    if (!window.HybridAxis) return;

    const _apply = HybridAxis.applySegment;

    HybridAxis.applySegment = function () {

        // força estado e foco no momento exato do registro
        const state = FocusApp.state;
        const percent = FocusApp.focus;

        this.segments.push({
            from: this.cursor,
            to: this.cursor,
            state: state,
            percent: percent
        });

        HybridAxisUI.redraw();
    };

})();

// ======================================================================
// PATCH — PONTE MÍNIMA ENTRE CAMPO OPERACIONAL E CENOGRÁFICO
// Eixo Lógico usa APENAS a cor do estado ativo no momento do draw.
// Nenhum controle, apenas leitura.
// ======================================================================

(function HybridAxisMinimalBridge() {

    if (!window.HybridAxis || !window.HybridAxisUI || !window.StateColorMap) return;

    const _redraw = HybridAxisUI.redraw;

    HybridAxisUI.redraw = function () {

        const ctx = this.ctx || hybridCtx;
        const canvas = this.canvas || hybridCanvas;

        if (!ctx || !canvas) return _redraw.call(this);

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // desenha régua e base original
        if (typeof this.drawBase === "function") {
            this.drawBase();
        }

        // desenha segmentos com ponte mínima de cor
        HybridAxis.segments.forEach(seg => {

            const x = (seg.from / 1440) * canvas.width;

            const color =
                (seg.state && StateColorMap[seg.state]) ||
                "#00e3ff"; // fallback cenográfico

            ctx.fillStyle = color;
            ctx.fillRect(x, 10, 6, canvas.height - 20);
        });

    };

})();

// ======================================================================
// PATCH — NEUTRALIZA RÓTULO "HIPERFOCO" NO CARTÃO ÚLTIMA HORA
// Mantém threshold (>=80%) e lógica interna intactos
// Remove apenas texto/ícone decorativo
// ======================================================================

(function RemoveLastHourHyperfocusLabel() {

    if (!window.FocusApp) return;

    const _update = FocusApp.updateLastHour;

    FocusApp.updateLastHour = function () {

        // executa lógica original
        _update.apply(this, arguments);

        // remove rótulos visuais de hiperfoco, se existirem
        const lastHour = document.querySelector(".kf-last-hour");
        if (!lastHour) return;

        lastHour.querySelectorAll(
            ".state-label, .state-icon, .alert, .badge, span, svg, img"
        ).forEach(el => {
            if (el.textContent?.toLowerCase().includes("hiper")) {
                el.remove();
            }
        });
    };

})();

// ======================================================================
// PATCH DEFINITIVO — BLOQUEIO DA CRIAÇÃO DO RÓTULO "HIPERFOCO" NO JS
// ================================================================

(function BlockHyperfocusLabel() {

    if (!window.FocusApp) return;

    // Intercepta a função que cria o rótulo
    const _createLabel = FocusApp.createHyperfocusLabel;

    FocusApp.createHyperfocusLabel = function () {

        // Impede a criação do rótulo "Hiperfoco"
        return null; // Não retorna nada
    };

})();

// ======================================================================
// PATCH — RESET REAL DO DIA (MEMÓRIA + UI + STORAGE)
// ======================================================================
(function ResetDayFix() {

  function resetRuntimeState() {
    // foco e estado base
    FocusApp.focus = 50;
    FocusApp.state = "trabalho";

    // tempos
    FocusApp.sessionStart = Date.now();
    FocusApp.lastStateChange = Date.now();
    FocusApp.dayStart = new Date().setHours(0,0,0,0);

    // históricos
    FocusApp.stateTimes = {};
    FocusApp.hourHistory = [];
    FocusApp.miniLines = {};
    FocusApp.initStateTimes();

    DNA.history = [];
    DNA.lastFeed = 50;

    // UI
    UI.updateFocusUI();
    UI.updateStateUI();
    UI.drawMiniLines();

    const hourWrap = document.getElementById("hour-thermometer-wrapper");
    if (hourWrap) {
      const old = hourWrap.querySelector(".hour-history-track");
      if (old) old.remove();
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("btn-reset-day");
    if (!btn) return;

    btn.addEventListener("click", () => {
      Storage.clear();      // limpa persistência
      resetRuntimeState();  // limpa estado vivo
    });
  });

})();

// ============================================================
// KERNEL v2 — HISTÓRICO REAL (CAPTURA PASSIVA)
// ============================================================

(function HistoryV2Kernel(){

  const STORAGE_KEY = "kripta_focus_history_v2";

  let current = null;

  function openSegment(){
    if (current) return;
    current = {
      start: Date.now(),
      state: FocusApp.state,
      samples: []
    };
  }

  function sample(){
    if (!current) return;
    current.samples.push(FocusApp.focus);
  }

  function closeSegment(){
    if (!current) return;

    const end = Date.now();
    const avg =
      current.samples.reduce((a,b)=>a+b,0) /
      (current.samples.length || 1);

    const record = {
      start: current.start,
      end,
      state: current.state,
      focusAvg: Math.round(avg),
      durationMs: end - current.start
    };

    const raw = localStorage.getItem(STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    arr.push(record);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));

    current = null;
  }

  // -----------------------------
  // ANCORAGENS (SEM TOCAR NA UI-1)
  // -----------------------------

  const _changeState = Logic.changeState;
  Logic.changeState = function(newState){
    closeSegment();
    _changeState.apply(this, arguments);
    openSegment();
  };

  window.addEventListener("beforeunload", closeSegment);

  document.addEventListener("DOMContentLoaded", () => {
    openSegment();
    setInterval(sample, 60000); // 1 amostra por minuto
  });

})();

// ============================================================
// SNAPSHOT — PERSISTÊNCIA v1 (GRAVAÇÃO)
// ============================================================

const SNAPSHOT_KEY = "kripta_focus_snapshots_v1";

function loadSnapshots() {
  const raw = localStorage.getItem(SNAPSHOT_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveSnapshots(list) {
  localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(list));
}

function captureFocusSnapshot() {
  if (!window.KRIPTA) return;

  const now = new Date().toISOString();

  const snapshot = {
    id: crypto.randomUUID(),
    capturedAt: now,

    session: {
      sessionStart: new Date(KRIPTA.sessionStart).toISOString(),
      dayResetAt: window.KRIPTA_FOCUS_PUBLIC?.dayResetAt || null
    },

    focusThermometer: {
      activeState: KRIPTA.state.current,
      focusPercent: KRIPTA.focus.level,
      stateElapsedMs: KRIPTA.state.elapsedMs,

      dayDistribution: { ...KRIPTA.state.dayDistribution },

      rate: {
        deltaFocus: KRIPTA.focus.delta || 0,
        deltaTimeMs: KRIPTA.focus.deltaTimeMs || 0
      }
    }
  };

  const list = loadSnapshots();
  list.push(snapshot);
  saveSnapshots(list);
}

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("btn-history-snapshot");
  if (!btn) return;

  btn.addEventListener("click", () => {
    captureFocusSnapshot();
  });
});
// ============================================================
// SNAPSHOT — TERMÔMETRO DE FOCO → HISTÓRICO v2
// ============================================================

(function () {

  const SNAPSHOT_KEY = "kripta_focus_snapshots_v1";
  const HISTORY_KEY  = "kripta_focus_history_v2";

  const btn = document.getElementById("btn-history-snapshot");
  if (!btn) return;

  function load(key) {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  }

  function save(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  btn.addEventListener("click", () => {

    // 🔹 Fonte soberana: estado público atual
    const focus = window.KRIPTA_FOCUS_PUBLIC;
    if (!focus) return;

    const now = Date.now();

    const snapshot = {
      kind: "snapshot",
      source: "focus-thermometer",
      ts: now,

      state: focus.state,
      focusPercent: focus.focus,
      durationMs: now - focus.sessionStart
    };

    // 1️⃣ Salva snapshot imutável
    const snapshots = load(SNAPSHOT_KEY);
    snapshots.push(snapshot);
    save(SNAPSHOT_KEY, snapshots);

    // 2️⃣ Espelha no histórico v2 (compatível com UI-2)
    const history = load(HISTORY_KEY);
    history.push({
      start: now - snapshot.durationMs,
      durationMs: snapshot.durationMs,
      state: snapshot.state
    });
    save(HISTORY_KEY, history);

    // 3️⃣ Navega para UI-2
    window.location.href = "ui-2.html";
  });

})();

function interpretFocusMeta(context) {
  const {
    level,        // % atual
    trend,        // -1, 0, +1 (ou equivalente já usado)
    volatility,   // número ou delta médio
    durationMin   // minutos de foco contínuo
  } = context;

  const meta = {};

  /* ===== TENDÊNCIA ===== */
  if (trend > 0) meta.trend = "ascendente";
  else if (trend < 0) meta.trend = "descendente";
  else meta.trend = "estável";

  /* ===== VOLATILIDADE ===== */
  if (volatility < 8) meta.volatility = "baixa";
  else if (volatility < 20) meta.volatility = "média";
  else meta.volatility = "alta";

  /* ===== SUSTENTAÇÃO ===== */
  if (durationMin < 20) meta.sustainability = "curta";
  else if (durationMin < 60) meta.sustainability = "média";
  else meta.sustainability = "longa";

  /* ===== ESTADO INTERPRETADO ===== */
  if (level >= 70 && meta.volatility === "baixa")
    meta.state = "foco equilibrado";
  else if (level >= 80 && meta.sustainability === "longa")
    meta.state = "foco excessivo";
  else if (level < 40)
    meta.state = "foco disperso";
  else
    meta.state = "foco funcional";

  /* ===== ALERTA QUALIFICADO ===== */
  if (meta.state === "foco excessivo")
    meta.alert = "⚠️ Pico prolongado pode gerar fadiga";
  else if (meta.volatility === "alta")
    meta.alert = "⚠️ Oscilação elevada detectada";
  else
    meta.alert = "ℹ️ Estado dentro do esperado";

  return meta;
}

// ======================================================================
// PATCH FINAL — TÍTULOS DOS HOLOGRAMAS = ESTADO DO USUÁRIO (SEM NÚMERO)
// ======================================================================

(function FixHologramTitlesContract() {

  function renderTitles() {
    const titles = document.querySelectorAll(".kf-holograma-title");
    if (!titles.length) return;

    titles.forEach((el, idx) => {
      const state = FocusApp.state;
      el.textContent = state ? state : "—";
    });
  }

  // aplica no load
  window.addEventListener("DOMContentLoaded", renderTitles);

  // aplica a cada troca de estado
  const _change = Logic.changeState;
  Logic.changeState = function (newState) {
    _change.apply(this, arguments);
    renderTitles();
  };

})();

// ======================================================================
// PATCH FINAL — HOLOGRAMAS COMO FILA TEMPORAL DE ESTADOS (3 SLOTS)
// ======================================================================

(function HologramStateQueue() {

  const queue = ["—", "—", "—"]; // [atual, anterior, mais antigo]

  function render() {
    const titles = document.querySelectorAll(".kf-holograma-title");
    if (titles.length < 3) return;

    titles.forEach((el, i) => {
      el.textContent = queue[i] || "—";
    });
  }

  // captura mudança de estado
  const _change = Logic.changeState;
  Logic.changeState = function (newState) {

    // empurra estados
    queue.unshift(newState);
    queue.length = 3;

    _change.apply(this, arguments);
    render();
  };

  // render inicial
  window.addEventListener("DOMContentLoaded", render);

})();

// ======================================================================
// PATCH FINAL — HOLOGRAMAS COMO INDICADOR ÚNICO DE ESTADO ATUAL
// (Holograma morre após a 1ª interação)
// ======================================================================

(function HologramSingleState() {

  let hasActivated = false;
  let activeIndex = 0;

  function renderInitial() {
    document.querySelectorAll(".kf-holograma-title")
      .forEach(el => el.textContent = "Holograma");
  }

  function renderState(state) {
    const titles = document.querySelectorAll(".kf-holograma-title");
    if (!titles.length) return;

    // após a 1ª ativação, nunca mais volta "Holograma"
    titles.forEach(el => el.textContent = "—");

    titles[activeIndex].textContent = state;
    activeIndex = (activeIndex + 1) % titles.length;
  }

  // estado inicial
  window.addEventListener("DOMContentLoaded", renderInitial);

  // intercepta troca de estado
  const _change = Logic.changeState;
  Logic.changeState = function (newState) {
    _change.apply(this, arguments);

    hasActivated = true;
    renderState(newState);
  };

})();

// ======================================================================
// PATCH FINAL — HOLOGRAMAS COMO HISTÓRICO CURTO DE ESTADOS (SHIFT)
// ======================================================================

(function HologramShiftStates() {

  const slots = ["Holograma", "Holograma", "Holograma"];

  function render() {
    const titles = document.querySelectorAll(".kf-holograma-title");
    if (titles.length < 3) return;

    titles.forEach((el, i) => {
      el.textContent = slots[i];
    });
  }

  // render inicial
  window.addEventListener("DOMContentLoaded", render);

  // intercepta troca de estado
  const _change = Logic.changeState;
  Logic.changeState = function (newState) {

    // shift: novo entra, último sai
    slots.unshift(newState);
    slots.length = 3;

    _change.apply(this, arguments);
    render();
  };

})();

