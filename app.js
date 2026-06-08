/* ===== App State ===== */
const APP = {
    surveys: JSON.parse(localStorage.getItem('surveys') || '[]'),
    current: null,
    chart: null,
    presentChart: null,
    presentIdx: 0,
    mode: 'build', // 'build' or 'auto'
    currentGraphType: 'bar',
    graphTypes: ['bar','pie','band','line','pictograph'],
    graphNames: ['막대그래프','원그래프','띠그래프','꺾은선그래프','그림그래프'],
    colors: ['#6C5CE7','#00CEC9','#FD79A8','#FDCB6E','#00B894','#E17055','#74B9FF','#A29BFE'],
    icons: ['🍎','⭐','💎','🌸','🔥','💧','🎵','🌙']
};

/* ===== Utilities ===== */
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const toast = (msg, type='') => {
    const t = document.createElement('div');
    t.className = 'toast ' + type;
    t.textContent = msg;
    $('#toast-container').appendChild(t);
    setTimeout(() => t.remove(), 3000);
};
const saveSurveys = () => localStorage.setItem('surveys', JSON.stringify(APP.surveys));

/* ===== Navigation ===== */
function goPage(name) {
    $$('.page').forEach(p => p.classList.remove('active'));
    $$('.nav-btn').forEach(b => b.classList.remove('active'));
    const page = $(`#page-${name}`);
    if (page) { page.classList.add('active'); }
    const nav = $(`[data-page="${name}"]`);
    if (nav) nav.classList.add('active');
    if (name === 'mysurveys') renderSurveyList();
    window.scrollTo(0, 0);
}

/* ===== Event Bindings ===== */
document.addEventListener('DOMContentLoaded', () => {
    // Navigation
    $$('.nav-btn').forEach(b => b.addEventListener('click', () => goPage(b.dataset.page)));
    $('#logo-btn').addEventListener('click', () => goPage('home'));
    $('#btn-start-create').addEventListener('click', () => goPage('create'));
    $('#btn-empty-create').addEventListener('click', () => goPage('create'));

    // Create form
    $('#survey-title').addEventListener('input', e => {
        $('#title-count').textContent = e.target.value.length;
    });
    $('#btn-add-option').addEventListener('click', addOption);
    $('#btn-create-survey').addEventListener('click', createSurvey);

    // Vote page
    $('#tab-click-vote').addEventListener('click', () => switchVoteMode('click'));
    $('#tab-manual-input').addEventListener('click', () => switchVoteMode('manual'));
    $('#btn-reset-votes').addEventListener('click', resetVotes);
    $('#btn-apply-manual').addEventListener('click', applyManual);
    $('#btn-go-graphs').addEventListener('click', () => { if (APP.current) { goPage('graphs'); renderGraphs(); }});
    $('#btn-save-survey').addEventListener('click', saveCurrent);

    // Graph page
    $$('.graph-tab').forEach(t => t.addEventListener('click', () => switchGraph(t.dataset.graph)));
    $('#btn-present').addEventListener('click', startPresentation);
    $('#btn-back-vote').addEventListener('click', () => { if (APP.current) openSurvey(APP.current.id); });
    $('#btn-download').addEventListener('click', downloadImage);
    $('#btn-save-file').addEventListener('click', saveToFile);

    // Mode toggle (build vs auto)
    $('#mode-build').addEventListener('click', () => switchMode('build'));
    $('#mode-auto').addEventListener('click', () => switchMode('auto'));


    // File load
    $('#btn-load-file').addEventListener('click', () => $('#file-input').click());
    $('#file-input').addEventListener('change', loadFromFile);

    // Presentation
    $('#present-prev').addEventListener('click', () => presentNav(-1));
    $('#present-next').addEventListener('click', () => presentNav(1));
    $('#present-exit').addEventListener('click', exitPresentation);
    document.addEventListener('keydown', e => {
        if (!$('#page-present').classList.contains('active')) return;
        if (e.key === 'ArrowLeft') presentNav(-1);
        if (e.key === 'ArrowRight') presentNav(1);
        if (e.key === 'Escape') exitPresentation();
    });

    goPage('home');
});

/* ===== Create Survey ===== */
function addOption() {
    const container = $('#options-container');
    const count = container.children.length;
    if (count >= 8) { toast('선택지는 최대 8개까지!', 'error'); return; }
    const row = document.createElement('div');
    row.className = 'option-row';
    row.innerHTML = `<span class="option-num">${count+1}</span>
        <input type="text" class="option-input" placeholder="선택지 ${count+1}" maxlength="20">
        <button class="btn-icon btn-remove-option" title="삭제">✕</button>`;
    row.querySelector('.btn-remove-option').addEventListener('click', () => removeOption(row));
    container.appendChild(row);
    updateRemoveButtons();
}

function removeOption(row) {
    row.remove();
    const rows = $$('.option-row');
    rows.forEach((r, i) => { r.querySelector('.option-num').textContent = i+1; });
    updateRemoveButtons();
}

function updateRemoveButtons() {
    const rows = $$('.option-row');
    rows.forEach(r => {
        r.querySelector('.btn-remove-option').disabled = rows.length <= 2;
    });
}

function createSurvey() {
    const title = $('#survey-title').value.trim();
    const author = $('#survey-author').value.trim();
    const inputs = $$('.option-input');
    const options = [];
    inputs.forEach(inp => { const v = inp.value.trim(); if (v) options.push(v); });

    if (!title) { toast('설문 제목을 입력하세요!', 'error'); return; }
    if (!author) { toast('조사자 이름을 입력하세요!', 'error'); return; }
    if (options.length < 2) { toast('선택지를 2개 이상 입력하세요!', 'error'); return; }

    const survey = {
        id: Date.now().toString(),
        title, author, options,
        votes: new Array(options.length).fill(0),
        created: new Date().toLocaleDateString('ko-KR')
    };
    APP.surveys.push(survey);
    saveSurveys();
    toast('설문이 만들어졌어요! 🎉', 'success');
    // Reset form
    $('#survey-title').value = '';
    $('#survey-author').value = '';
    $('#title-count').textContent = '0';
    resetCreateOptions();
    openSurvey(survey.id);
}

function resetCreateOptions() {
    const c = $('#options-container');
    c.innerHTML = '';
    for (let i = 0; i < 2; i++) {
        const row = document.createElement('div');
        row.className = 'option-row';
        row.innerHTML = `<span class="option-num">${i+1}</span>
            <input type="text" class="option-input" placeholder="선택지 ${i+1}" maxlength="20">
            <button class="btn-icon btn-remove-option" title="삭제" disabled>✕</button>`;
        c.appendChild(row);
    }
}

/* ===== Survey List ===== */
function renderSurveyList() {
    const list = $('#surveys-list');
    const empty = $('#empty-state');
    list.innerHTML = '';
    if (APP.surveys.length === 0) { list.style.display='none'; empty.style.display='block'; return; }
    empty.style.display = 'none'; list.style.display = 'flex';

    APP.surveys.slice().reverse().forEach(s => {
        const total = s.votes.reduce((a,b)=>a+b,0);
        const card = document.createElement('div');
        card.className = 'survey-card';
        card.innerHTML = `<div class="survey-card-info">
            <h4>${esc(s.title)}</h4>
            <p>👤 ${esc(s.author)} · 📅 ${s.created} · 🗳️ ${total}명 응답</p>
        </div>
        <div class="survey-card-actions">
            <button class="btn btn-sm btn-primary open-btn">열기</button>
            <button class="btn btn-sm btn-danger del-btn">삭제</button>
        </div>`;
        card.querySelector('.open-btn').addEventListener('click', e => { e.stopPropagation(); openSurvey(s.id); });
        card.querySelector('.del-btn').addEventListener('click', e => { e.stopPropagation(); deleteSurvey(s.id); });
        card.addEventListener('click', () => openSurvey(s.id));
        list.appendChild(card);
    });
}

function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

function deleteSurvey(id) {
    if (!confirm('정말 삭제할까요?')) return;
    APP.surveys = APP.surveys.filter(s => s.id !== id);
    saveSurveys();
    renderSurveyList();
    toast('삭제되었습니다', 'success');
}

/* ===== Open Survey / Vote ===== */
function openSurvey(id) {
    const s = APP.surveys.find(x => x.id === id);
    if (!s) return;
    APP.current = s;
    goPage('vote');
    $('#vote-title').textContent = s.title;
    $('#vote-author').textContent = s.author;
    renderVoteButtons();
    renderManualInputs();
    updateVoteLiveBar();
    switchVoteMode('click');
}

function renderVoteButtons() {
    const s = APP.current;
    const container = $('#vote-buttons');
    container.innerHTML = '';
    s.options.forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.className = 'vote-btn';
        btn.style.borderColor = APP.colors[i % APP.colors.length] + '40';
        btn.innerHTML = `<span class="vote-btn-count">${s.votes[i]}</span>
            <span class="vote-btn-label">${esc(opt)}</span>`;
        btn.addEventListener('click', e => {
            s.votes[i]++;
            saveSurveys();
            btn.querySelector('.vote-btn-count').textContent = s.votes[i];
            updateVoteCount();
            updateVoteLiveBar();
            // Ripple
            const rect = btn.getBoundingClientRect();
            const rip = document.createElement('div');
            rip.className = 'vote-btn-ripple';
            rip.style.cssText = `left:${e.clientX-rect.left-20}px;top:${e.clientY-rect.top-20}px;width:40px;height:40px;`;
            btn.appendChild(rip);
            setTimeout(() => rip.remove(), 600);
        });
        container.appendChild(btn);
    });
    updateVoteCount();
}

function renderManualInputs() {
    const s = APP.current;
    const c = $('#manual-inputs');
    c.innerHTML = '';
    s.options.forEach((opt, i) => {
        const row = document.createElement('div');
        row.className = 'manual-row';
        row.innerHTML = `<label>${esc(opt)}</label>
            <input type="number" min="0" max="999" value="${s.votes[i]}" data-idx="${i}">`;
        c.appendChild(row);
    });
}

function updateVoteCount() {
    const total = APP.current.votes.reduce((a,b)=>a+b,0);
    $('#vote-count').textContent = total;
}

function updateVoteLiveBar() {
    const s = APP.current;
    const total = s.votes.reduce((a,b)=>a+b,0);
    const c = $('#vote-live-bar');
    c.innerHTML = '';
    s.options.forEach((opt, i) => {
        const pct = total > 0 ? (s.votes[i]/total*100) : 0;
        const row = document.createElement('div');
        row.className = 'live-bar-row';
        row.innerHTML = `<span class="live-bar-label">${esc(opt)}</span>
            <div class="live-bar-track"><div class="live-bar-fill" style="width:${pct}%;background:${APP.colors[i%APP.colors.length]}"></div></div>
            <span class="live-bar-value">${s.votes[i]}</span>`;
        c.appendChild(row);
    });
}

function switchVoteMode(mode) {
    $$('.vote-mode').forEach(m => m.classList.remove('active'));
    $$('.tab-btn').forEach(t => t.classList.remove('active'));
    if (mode === 'click') {
        $('#vote-click-mode').classList.add('active');
        $('#tab-click-vote').classList.add('active');
    } else {
        $('#vote-manual-mode').classList.add('active');
        $('#tab-manual-input').classList.add('active');
    }
}

function resetVotes() {
    if (!confirm('투표를 초기화할까요?')) return;
    APP.current.votes = new Array(APP.current.options.length).fill(0);
    saveSurveys();
    renderVoteButtons();
    updateVoteLiveBar();
    renderManualInputs();
    toast('초기화되었습니다', 'success');
}

function applyManual() {
    const inputs = $$('#manual-inputs input');
    inputs.forEach(inp => {
        const idx = parseInt(inp.dataset.idx);
        APP.current.votes[idx] = Math.max(0, parseInt(inp.value) || 0);
    });
    saveSurveys();
    renderVoteButtons();
    updateVoteLiveBar();
    toast('입력값이 적용되었습니다!', 'success');
    switchVoteMode('click');
}

function saveCurrent() {
    saveSurveys();
    toast('저장되었습니다! 💾', 'success');
}

/* ===== Mode Switching ===== */
function switchMode(mode) {
    APP.mode = mode;
    $$('.mode-btn').forEach(b => b.classList.remove('active'));
    $(`[data-mode="${mode}"]`).classList.add('active');
    if (mode === 'build') {
        $('#builder-display').style.display = 'block';
        $('#auto-display').style.display = 'none';
        Builder.init(APP.current, APP.currentGraphType);
    } else {
        $('#builder-display').style.display = 'none';
        $('#auto-display').style.display = 'block';
        switchGraphAuto(APP.currentGraphType);
    }
    if (typeof updateDataTableBlur === 'function') updateDataTableBlur();
}

/* ===== Graphs ===== */
function renderGraphs() {
    const s = APP.current;
    if (!s) return;
    $('#graph-title').textContent = `📊 ${s.title}`;
    $('#graph-subtitle').textContent = `조사자: ${s.author} · 총 ${s.votes.reduce((a,b)=>a+b,0)}명 응답`;
    renderDataTable();
    APP.currentGraphType = 'bar';
    APP.mode = 'build';
    $$('.mode-btn').forEach(b => b.classList.remove('active'));
    $('#mode-build').classList.add('active');
    switchGraph('bar');
}

function renderDataTable(tbodyId='data-table-body', totalId='data-total') {
    const s = APP.current;
    const total = s.votes.reduce((a,b)=>a+b,0);
    const tbody = $(`#${tbodyId}`);
    tbody.innerHTML = '';
    s.options.forEach((opt, i) => {
        const pct = total > 0 ? (s.votes[i]/total*100).toFixed(1) : '0.0';
        const tr = document.createElement('tr');
        tr.innerHTML = `<td><span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:${APP.colors[i%APP.colors.length]};margin-right:8px;vertical-align:middle;"></span>${esc(opt)}</td>
            <td>${s.votes[i]}</td><td>${pct}%</td>`;
        tbody.appendChild(tr);
    });
    if (totalId) {
        const el = $(`#${totalId}`);
        if (el) el.innerHTML = `<strong>${total}</strong>`;
    }
    updateDataTableBlur();
}

function updateDataTableBlur() {
    const isBuild = APP.mode === 'build';
    const isSubmitted = typeof Builder !== 'undefined' ? !!Builder.isSubmitted : false;
    
    document.querySelectorAll('#data-table-body tr td:nth-child(3)').forEach(td => {
        if (isBuild && !isSubmitted) {
            td.style.filter = 'blur(5px)';
            td.style.userSelect = 'none';
            td.title = '제출 후 공개됩니다';
        } else {
            td.style.filter = 'none';
            td.style.userSelect = 'auto';
            td.title = '';
        }
    });

    // 정답 확인 버튼 숨김 처리
    const modeAutoBtn = document.getElementById('mode-auto');
    if (modeAutoBtn) {
        if (isBuild && !isSubmitted) {
            modeAutoBtn.style.display = 'none';
        } else {
            modeAutoBtn.style.display = 'inline-block';
        }
    }
}

function switchGraph(type) {
    APP.currentGraphType = type;
    $$('.graph-tab').forEach(t => t.classList.remove('active'));
    $(`.graph-tab[data-graph="${type}"]`).classList.add('active');
    if (APP.mode === 'build') {
        $('#builder-display').style.display = 'block';
        $('#auto-display').style.display = 'none';
        Builder.init(APP.current, type);
    } else {
        $('#builder-display').style.display = 'none';
        $('#auto-display').style.display = 'block';
        switchGraphAuto(type);
    }
}

function switchGraphAuto(type) {
    $('#chart-container').style.display = 'none';
    $('#band-chart-container').style.display = 'none';
    $('#pictograph-container').style.display = 'none';
    if (type === 'band') { $('#band-chart-container').style.display = 'flex'; renderBandChart('band-chart'); }
    else if (type === 'pictograph') { $('#pictograph-container').style.display = 'flex'; renderPictograph('pictograph-chart'); }
    else { $('#chart-container').style.display = 'flex'; renderChartJS('main-chart', type); }
}

function renderChartJS(canvasId, type, isPresent=false) {
    const s = APP.current;
    const canvas = $(`#${canvasId}`);
    const ctx = canvas.getContext('2d');

    if (isPresent && APP.presentChart) { APP.presentChart.destroy(); APP.presentChart = null; }
    else if (!isPresent && APP.chart) { APP.chart.destroy(); APP.chart = null; }

    const bgColors = s.options.map((_, i) => APP.colors[i % APP.colors.length]);
    const config = { plugins: [ChartDataLabels] };

    if (type === 'bar') {
        config.type = 'bar';
        config.data = { labels: s.options, datasets: [{ label: '응답 수 (명)', data: s.votes, backgroundColor: bgColors.map(c => c+'CC'), borderColor: bgColors, borderWidth: 2, borderRadius: 8, borderSkipped: false }] };
        config.options = chartOpts('응답 수 (명)', false, true);
    } else if (type === 'pie') {
        config.type = 'pie';
        config.data = { labels: s.options, datasets: [{ data: s.votes, backgroundColor: bgColors.map(c => c+'CC'), borderColor: '#1A1930', borderWidth: 3, hoverOffset: 16 }] };
        config.options = chartOpts('', true, false);
    } else if (type === 'line') {
        config.type = 'line';
        config.data = { labels: s.options, datasets: [{ label: '응답 수 (명)', data: s.votes, borderColor: APP.colors[0], backgroundColor: APP.colors[0]+'33', fill: true, tension: 0.3, pointRadius: 6, pointHoverRadius: 10, pointBackgroundColor: bgColors, pointBorderColor: '#fff', pointBorderWidth: 2, borderWidth: 3 }] };
        config.options = chartOpts('응답 수 (명)', false, true);
    }

    const chart = new Chart(ctx, config);
    if (isPresent) APP.presentChart = chart; else APP.chart = chart;
}

function chartOpts(yTitle, isPie, showScale) {
    const base = {
        responsive: true, maintainAspectRatio: true,
        animation: { duration: 800, easing: 'easeOutQuart' },
        plugins: {
            legend: { display: isPie, position: 'bottom', labels: { color: '#A7A9BE', font: { family: "'Noto Sans KR'", size: 13 }, padding: 16, usePointStyle: true } },
            datalabels: {
                color: '#fff', font: { family: "'Noto Sans KR'", weight: 'bold', size: 13 },
                formatter: (v, ctx) => {
                    if (isPie) { const t = ctx.dataset.data.reduce((a,b)=>a+b,0); return t > 0 ? (v/t*100).toFixed(1)+'%' : ''; }
                    return v > 0 ? v+'명' : '';
                }
            }
        }
    };
    if (showScale) {
        base.scales = {
            x: { ticks: { color: '#A7A9BE', font: { family: "'Noto Sans KR'", size: 12 } }, grid: { color: 'rgba(108,92,231,0.08)' } },
            y: { beginAtZero: true, title: { display: !!yTitle, text: yTitle, color: '#A7A9BE', font: { family: "'Noto Sans KR'" } }, ticks: { color: '#A7A9BE', stepSize: 1 }, grid: { color: 'rgba(108,92,231,0.08)' } }
        };
    }
    return base;
}

function renderBandChart(containerId) {
    const s = APP.current;
    const total = s.votes.reduce((a,b)=>a+b,0);
    const c = $(`#${containerId}`);
    c.innerHTML = '';
    if (total === 0) { c.innerHTML = '<p style="text-align:center;color:#72738C;">아직 응답이 없습니다</p>'; return; }

    let html = `<div class="band-title">${esc(s.title)} - 띠그래프</div><div class="band-bar-wrapper"><div class="band-bar-outer">`;
    s.options.forEach((opt, i) => {
        const pct = (s.votes[i]/total*100);
        if (pct > 0) html += `<div class="band-segment" style="width:${pct}%;background:${APP.colors[i%APP.colors.length]}">${pct >= 8 ? pct.toFixed(1)+'%' : ''}</div>`;
    });
    html += '</div></div><div class="band-legend">';
    s.options.forEach((opt, i) => {
        const pct = (s.votes[i]/total*100).toFixed(1);
        html += `<div class="band-legend-item"><div class="band-legend-color" style="background:${APP.colors[i%APP.colors.length]}"></div>${esc(opt)} (${pct}%)</div>`;
    });
    html += '</div>';
    c.innerHTML = html;
}

function renderPictograph(containerId) {
    const s = APP.current;
    const max = Math.max(...s.votes);
    const c = $(`#${containerId}`);
    c.innerHTML = '';
    const bigUnit = max >= 20 ? 10 : max >= 10 ? 5 : max >= 5 ? 2 : 1;
    const smallUnit = 1;
    const icon = APP.icons[Math.floor(Math.random()*APP.icons.length)];

    let html = `<div class="pictograph-title">${esc(s.title)} - 그림그래프</div>`;
    html += `<div class="pictograph-key"><span class="picto-big-icon">${icon}</span> = ${bigUnit}명 &nbsp;&nbsp; <span class="picto-sm-icon">${icon}</span> = ${smallUnit}명</div>`;
    s.options.forEach((opt, i) => {
        const bigCount = Math.floor(s.votes[i] / bigUnit);
        const remainder = s.votes[i] % bigUnit;
        const smallCount = Math.floor(remainder / smallUnit);
        html += `<div class="pictograph-row"><span class="pictograph-label">${esc(opt)}</span><span class="pictograph-icons">`;
        for (let j = 0; j < bigCount; j++) html += `<span class="picto-big-icon">${icon}</span>`;
        if (bigCount > 0 && smallCount > 0) html += '<span class="picto-sep">│</span>';
        for (let j = 0; j < smallCount; j++) html += `<span class="picto-sm-icon">${icon}</span>`;
        html += `</span><span class="pictograph-count">${s.votes[i]}명</span></div>`;
    });
    c.innerHTML = html;
}

/* ===== Presentation ===== */
function startPresentation() {
    if (!APP.current) return;
    APP.presentIdx = 0;
    goPage('present');
    $('#page-present').classList.add('active');
    $('#present-title').textContent = APP.current.title;
    $('#present-author').textContent = `조사자: ${APP.current.author}`;
    renderDataTable('present-data-table-body', null);
    renderPresentSlide();
}

function renderPresentSlide() {
    const type = APP.graphTypes[APP.presentIdx];
    $('#present-indicator').textContent = `${APP.graphNames[APP.presentIdx]} (${APP.presentIdx+1}/${APP.graphTypes.length})`;

    const canvas = $('#present-chart');
    const band = $('#present-band-chart');
    const picto = $('#present-pictograph-chart');
    canvas.style.display = 'none'; band.style.display = 'none'; picto.style.display = 'none';

    if (type === 'band') { band.style.display = 'block'; renderBandChart('present-band-chart'); }
    else if (type === 'pictograph') { picto.style.display = 'block'; renderPictograph('present-pictograph-chart'); }
    else { canvas.style.display = 'block'; renderChartJS('present-chart', type, true); }
}

function presentNav(dir) {
    APP.presentIdx = (APP.presentIdx + dir + APP.graphTypes.length) % APP.graphTypes.length;
    renderPresentSlide();
}

function exitPresentation() {
    if (APP.presentChart) { APP.presentChart.destroy(); APP.presentChart = null; }
    $('#page-present').classList.remove('active');
    goPage('graphs');
    renderGraphs();
}

/* ===== File Save/Load ===== */
function saveToFile() {
    if (!APP.current) return;
    const blob = new Blob([JSON.stringify(APP.current, null, 2)], {type: 'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `설문_${APP.current.title}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast('파일이 저장되었습니다! 📁', 'success');
}

function loadFromFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
        try {
            const data = JSON.parse(ev.target.result);
            if (!data.title || !data.options || !data.votes) throw new Error();
            data.id = Date.now().toString();
            if (!data.created) data.created = new Date().toLocaleDateString('ko-KR');
            APP.surveys.push(data);
            saveSurveys();
            toast('설문을 불러왔습니다! 📂', 'success');
            openSurvey(data.id);
        } catch { toast('올바른 설문 파일이 아닙니다', 'error'); }
    };
    reader.readAsText(file);
    e.target.value = '';
}

function downloadImage() {
    const activeTab = $('.graph-tab.active');
    const type = activeTab ? activeTab.dataset.graph : 'bar';
    let canvas;
    if (type === 'band' || type === 'pictograph') {
        // html2canvas fallback - just save chart canvas
        toast('막대/원/꺾은선 그래프에서 이미지 저장이 가능합니다', 'error');
        return;
    }
    canvas = $('#main-chart');
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `그래프_${APP.current.title}_${APP.graphNames[APP.graphTypes.indexOf(type)]}.png`;
    a.click();
    toast('이미지가 저장되었습니다! 🖼️', 'success');
}
