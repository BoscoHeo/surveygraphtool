/* ===== Interactive Graph Builder ===== */
const Builder = {
    values: [],
    currentType: 'bar',
    survey: null,
    colors: ['#6C5CE7','#00CEC9','#FD79A8','#FDCB6E','#00B894','#E17055','#74B9FF','#A29BFE'],

    init(survey, type) {
        if (this.cleanupPercent) {
            this.cleanupPercent();
            this.cleanupPercent = null;
        }
        this.survey = survey;
        this.currentType = type;
        this.values = new Array(survey.options.length).fill(0);
        this.isDragging = false;
        this.dragIdx = -1;
        if (!this.docListenerAdded) {
            document.addEventListener('mouseup', () => this.isDragging = false);
            document.addEventListener('touchend', () => this.isDragging = false);
            this.docListenerAdded = true;
        }
        // 이전 그래프 타입의 이벤트 리스너를 완전히 제거하기 위해
        // 컨테이너를 cloneNode로 교체 (자식 없는 복사본 → 이벤트 없음)
        const old = document.querySelector('#builder-container');
        const c = old.cloneNode(false);
        old.parentNode.replaceChild(c, old);

        // 데이터 요약 테이블의 백분율 상태 갱신
        if (typeof updateDataTableBlur === 'function') {
            updateDataTableBlur();
        }

        if (type === 'bar') this.buildBar(c);
        else if (type === 'pie' || type === 'band') this.buildPercent(c, type);
        else if (type === 'line') this.buildLine(c);
        else if (type === 'pictograph') this.buildPicto(c);

        // 정답 확인 버튼과 연동하기 위한 공통 제출 버튼 추가 (원/띠그래프 제외)
        if (type === 'bar' || type === 'line' || type === 'pictograph') {
            const btnHtml = `<div style="text-align:center; margin-top:30px; margin-bottom: 20px;" id="general-submit-container">
                <button class="btn btn-primary btn-lg" id="btn-submit-graph-general">✅ 내가 그린 그래프 제출하기</button>
            </div>`;
            c.insertAdjacentHTML('beforeend', btnHtml);
            
            c.querySelector('#btn-submit-graph-general').addEventListener('click', (e) => {
                this.isSubmitted = true;
                e.target.parentElement.innerHTML = `<button class="btn btn-secondary btn-lg" id="btn-retry-graph-general">🔄 다시 그려보기</button>`;
                
                c.querySelector('#btn-retry-graph-general').addEventListener('click', () => {
                    this.isSubmitted = false;
                    this.init(this.survey, this.currentType);
                });

                if (typeof updateDataTableBlur === 'function') {
                    updateDataTableBlur();
                }
                
                // 알림 띄우기 (toast)
                if (typeof toast === 'function') {
                    toast('제출되었습니다! 정답을 확인해보세요.', 'success');
                }
            });
        }
    },

    /* ===== BAR CHART BUILDER ===== */
    buildBar(c) {
        const s = this.survey;
        let h = '<div class="bb-hint">📌 막대를 클릭하거나 드래그해서 높이를 맞춰 보세요!</div>';
        
        // Settings for axis
        h += '<div class="bb-axis-settings">';
        h += '<label>가로축: <input type="text" class="bb-axis-inp" id="x-axis-name" placeholder="예: 항목" value="항목"></label>';
        h += '<label>세로축: <input type="text" class="bb-axis-inp" id="y-axis-name" placeholder="예: 학생 수" value="학생 수"></label>';
        h += '<label>단위: <input type="text" class="bb-axis-inp" id="y-axis-unit" placeholder="예: 명" value="명"></label>';
        h += '<label>눈금 1칸 = <select class="bb-axis-inp" id="y-axis-step">';
        [1,2,5,10].forEach(n => h += `<option value="${n}">${n}</option>`);
        h += '</select></label>';
        h += '</div>';

        h += '<div class="bb-graph-area" style="position:relative; margin-top:25px;">';
        h += '<div class="bb-y-label-area" style="position:absolute; top:-25px; left:-10px; font-size:12px; font-weight:600; color:var(--text-secondary);">';
        h += '<span id="disp-y-title">학생 수</span> (<span id="disp-y-unit">명</span>)';
        h += '</div>';

        h += '<div id="bar-grid-container"></div>'; // Grid Area
        
        h += '<div class="bb-x-label-area" style="text-align:right; font-size:12px; font-weight:600; color:var(--text-secondary); margin-top:5px; padding-right:10px;">';
        h += '<span id="disp-x-title">항목</span>';
        h += '</div>';
        
        h += '</div>'; // bb-graph-area 닫기
        c.innerHTML = h;

        const self = this;
        // event listeners for settings
        const updateAxisText = () => {
            const yUnit = c.querySelector('#y-axis-unit').value || '';
            c.querySelector('#disp-x-title').textContent = c.querySelector('#x-axis-name').value || '';
            c.querySelector('#disp-y-title').textContent = c.querySelector('#y-axis-name').value || '';
            c.querySelector('#disp-y-unit').textContent = yUnit;
            s.options.forEach((opt, i) => {
                const v = c.querySelector(`#bbv-${i}`);
                if (v) v.textContent = self.values[i] + yUnit;
            });
        };
        c.querySelector('#x-axis-name').addEventListener('input', updateAxisText);
        c.querySelector('#y-axis-name').addEventListener('input', updateAxisText);
        c.querySelector('#y-axis-unit').addEventListener('input', updateAxisText);
        c.querySelector('#y-axis-step').addEventListener('change', () => {
            self.values = new Array(s.options.length).fill(0);
            self.renderBarGrid(c);
        });

        this.renderBarGrid(c);
    },

    renderBarGrid(c) {
        const s = this.survey;
        const container = c.querySelector('#bar-grid-container');
        if (!container) return;

        const yStep = +(c.querySelector('#y-axis-step')?.value || 1);
        const rawMax = Math.max(...s.votes, 1);
        let maxYCells = Math.ceil(rawMax / yStep) + 2;
        if (maxYCells < 4) maxYCells = 4;
        if (maxYCells > 20) maxYCells = 20;

        let h = '<div class="bb-wrapper"><div class="bb-yaxis">';
        for (let y = maxYCells; y >= 0; y--) h += `<div class="bb-yl">${y * yStep}</div>`;
        h += '</div><div class="bb-cols">';
        s.options.forEach((opt, i) => {
            h += `<div class="bb-col" data-idx="${i}">`;
            for (let y = maxYCells; y >= 1; y--) {
                const val = y * yStep;
                h += `<div class="bb-cell" data-y="${val}" data-i="${i}" style="background:${this.colors[i%8]}22"></div>`;
            }
            h += `<div class="bb-val" id="bbv-${i}">0명</div></div>`;
        });
        h += '</div></div><div class="bb-labels">';
        s.options.forEach(o => h += `<div class="bb-lb">${o}</div>`);
        h += '</div>';

        container.innerHTML = h;

        const self = this;
        const setVal = (idx, y) => { self.values[idx] = y; self.updateBar(c, idx); };
        const grid = c.querySelector('.bb-cols');
        
        grid.addEventListener('mousedown', e => {
            const cell = e.target.closest('.bb-cell');
            if (cell) { self.isDragging = true; self.dragIdx = +cell.dataset.i; setVal(self.dragIdx, +cell.dataset.y); e.preventDefault(); }
        });
        grid.addEventListener('mousemove', e => {
            if (!self.isDragging) return;
            const cell = e.target.closest('.bb-cell');
            if (cell && +cell.dataset.i === self.dragIdx) setVal(self.dragIdx, +cell.dataset.y);
        });
        grid.addEventListener('touchstart', e => {
            const cell = e.target.closest('.bb-cell');
            if (cell) { self.isDragging = true; self.dragIdx = +cell.dataset.i; setVal(self.dragIdx, +cell.dataset.y); }
        }, {passive:true});
        grid.addEventListener('touchmove', e => {
            if (!self.isDragging) return;
            const t = e.touches[0];
            const el = document.elementFromPoint(t.clientX, t.clientY);
            const cell = el?.closest('.bb-cell');
            if (cell && +cell.dataset.i === self.dragIdx) setVal(self.dragIdx, +cell.dataset.y);
        }, {passive:true});

        // Initialize display
        s.options.forEach((opt, i) => self.updateBar(c, i));
    },

    updateBar(c, idx) {
        c.querySelectorAll(`.bb-cell[data-i="${idx}"]`).forEach(cell => {
            const y = +cell.dataset.y;
            const filled = y <= this.values[idx];
            cell.classList.toggle('filled', filled);
            if (filled) cell.style.background = this.colors[idx%8] + 'CC';
            else cell.style.background = this.colors[idx%8] + '22';
        });
        const v = c.querySelector(`#bbv-${idx}`);
        const unitInp = c.querySelector('#y-axis-unit');
        const unit = unitInp ? unitInp.value : '명';
        if (v) v.textContent = this.values[idx] + unit;
    },

    /* ===== PERCENT BUILDER (Pie & Band) ===== */
    buildPercent(c, type) {
        const s = this.survey;
        const total = s.votes.reduce((a,b)=>a+b,0);
        
        // 제출 상태 초기화
        this.isSubmitted = false;
        
        // 1. 실제 정답 비율 및 누적 정답 비율 계산
        const answers = s.options.map((_, i) => total > 0 ? (s.votes[i]/total*100) : 0);
        const cumAnswers = [];
        let accAns = 0;
        for (let i = 0; i < s.options.length - 1; i++) {
            accAns += answers[i];
            cumAnswers.push(accAns);
        }

        // 2. 학생의 드래그 누적 백분율 상태 초기화
        // 100%를 균등 분할하여 배치
        this.values = [];
        const count = s.options.length;
        for (let i = 0; i < count - 1; i++) {
            this.values.push(((i + 1) / count) * 100);
        }

        // 3. UI 뼈대 생성
        let h = `<div class="bb-hint" id="bp-hint">📌 구분선 핸들을 드래그하여 각 항목의 비율을 맞춰보세요!</div>`;
        
        if (type === 'band') {
            h += `<div class="bp-band-interactive" id="band-container">`;
            h += `<div class="bp-band-track" id="band-track">`;
            s.options.forEach((opt, i) => {
                h += `<div class="bp-seg" style="background:${this.colors[i%8]}" id="bp-seg-${i}"></div>`;
            });
            h += `</div>`;
            // N-1개의 핸들 추가
            for (let i = 0; i < count - 1; i++) {
                h += `<div class="band-handle" data-idx="${i}" style="left:${this.values[i]}%"></div>`;
            }
            h += `</div>`;
        } else {
            h += `<div class="bp-pie-interactive" id="pie-container">`;
            h += `<div class="bp-pie-track" id="pie-track"></div>`;
            // N-1개의 핸들 추가
            for (let i = 0; i < count - 1; i++) {
                h += `<div class="pie-handle" data-idx="${i}"></div>`;
            }
            h += `</div>`;
        }

        // 실시간 비교 체크리스트 & 제출/다시 그려보기 버튼 영역
        h += `<div class="bp-check-list" id="bp-check-list"></div>`;
        h += `<div class="bp-actions" id="bp-actions" style="margin-top: 20px; display: flex; justify-content: center; gap: 10px;"></div>`;
        c.innerHTML = h;

        const self = this;
        const container = type === 'band' ? c.querySelector('#band-container') : c.querySelector('#pie-container');
        
        // 각도 혹은 X 좌표를 백분율(0~100)로 변환하는 헬퍼 함수
        const getPctFromEvent = (e) => {
            const rect = container.getBoundingClientRect();
            if (type === 'band') {
                const clientX = e.touches ? e.touches[0].clientX : e.clientX;
                let pct = ((clientX - rect.left) / rect.width) * 100;
                return Math.max(0, Math.min(100, pct));
            } else {
                const clientX = e.touches ? e.touches[0].clientX : e.clientX;
                const clientY = e.touches ? e.touches[0].clientY : e.clientY;
                const cx = rect.left + rect.width / 2;
                const cy = rect.top + rect.height / 2;
                let angle = Math.atan2(clientY - cy, clientX - cx) * 180 / Math.PI;
                // 12시 방향이 0도가 되도록 보정
                let deg = (angle + 90 + 360) % 360;
                return (deg / 360) * 100;
            }
        };

        const updateUI = () => {
            const currentCumValues = [...self.values];
            // 각 항목별 비율 복원 (차이 계산)
            const currentSegments = [];
            let last = 0;
            currentCumValues.forEach(val => {
                currentSegments.push(val - last);
                last = val;
            });
            currentSegments.push(100 - last);

            // 1) 그래프 드로잉 업데이트
            if (type === 'band') {
                s.options.forEach((opt, i) => {
                    const seg = c.querySelector(`#bp-seg-${i}`);
                    if (seg) {
                        const pct = currentSegments[i];
                        seg.style.width = `${pct}%`;
                        seg.textContent = pct >= 8 ? `${pct.toFixed(1)}%` : '';
                        seg.title = `${opt}: ${pct.toFixed(1)}%`;
                    }
                });
                // 핸들 위치 세팅
                const handles = c.querySelectorAll('.band-handle');
                handles.forEach((hd, i) => {
                    hd.style.left = `${self.values[i]}%`;
                });
            } else {
                // 원그래프 conic-gradient 배경 생성
                let grad = '', acc = 0;
                s.options.forEach((opt, i) => {
                    const pct = currentSegments[i];
                    grad += `${self.colors[i%8]} ${acc}% ${acc+pct}%,`;
                    acc += pct;
                });
                const track = c.querySelector('#pie-track');
                if (track) {
                    track.style.background = `conic-gradient(${grad.slice(0,-1)})`;
                }
                // 핸들 회전 위치 세팅 (R=120px, 중심 120, 120)
                const handles = c.querySelectorAll('.pie-handle');
                handles.forEach((hd, i) => {
                    const val = self.values[i];
                    const angleDeg = (val / 100) * 360 - 90; // 12시 기준
                    const angleRad = angleDeg * Math.PI / 180;
                    const r = 120; // Radius
                    const x = 120 + r * Math.cos(angleRad);
                    const y = 120 + r * Math.sin(angleRad);
                    hd.style.left = `${x}px`;
                    hd.style.top = `${y}px`;
                });
            }

            // 2) 실시간 비교 리스트 갱신 및 자석 스냅 상태 체크
            const checklist = c.querySelector('#bp-check-list');
            if (checklist) {
                let checkHtml = '';
                let allCorrect = true;

                s.options.forEach((opt, i) => {
                    const studentPct = currentSegments[i];
                    const targetPct = answers[i];
                    // 오차 0.2% 이내면 정답으로 인정
                    const isOk = Math.abs(studentPct - targetPct) < 0.2;
                    if (!isOk) allCorrect = false;

                    if (!self.isSubmitted) {
                        // 제출 전에는 오직 현재 학생의 비율만 노출
                        checkHtml += `
                            <div class="bp-check-item">
                                <span>
                                    <span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:${self.colors[i%8]};margin-right:8px;vertical-align:middle;"></span>
                                    <strong>${opt}</strong>
                                </span>
                                <span class="bp-check-status yet">
                                    ✍️ ${studentPct.toFixed(1)}%
                                </span>
                            </div>
                        `;
                    } else {
                        // 제출 후에는 채점 결과와 목표(정답) 비율 공개
                        checkHtml += `
                            <div class="bp-check-item">
                                <span>
                                    <span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:${self.colors[i%8]};margin-right:8px;vertical-align:middle;"></span>
                                    <strong>${opt}</strong>
                                </span>
                                <span class="bp-check-status ${isOk ? 'ok' : 'wrong'}">
                                    ${isOk ? `✅ ${studentPct.toFixed(1)}% (정답!)` : `❌ ${studentPct.toFixed(1)}% (정답: ${targetPct.toFixed(1)}%)`}
                                </span>
                            </div>
                        `;
                    }
                });
                checklist.innerHTML = checkHtml;

                // 3) 핸들의 snapped 클래스 업데이트 (제출한 후에만 초록색 불이 켜지게 함)
                const handles = c.querySelectorAll(type === 'band' ? '.band-handle' : '.pie-handle');
                handles.forEach((hd, i) => {
                    const isSnapped = Math.abs(self.values[i] - cumAnswers[i]) < 0.05;
                    hd.classList.toggle('snapped', isSnapped && self.isSubmitted);
                });

                // 4) 전체 성공 피드백 연출 및 버튼 구성
                const hint = c.querySelector('#bp-hint');
                const actionsContainer = c.querySelector('#bp-actions');
                
                if (!self.isSubmitted) {
                    hint.innerHTML = `📌 구분선 핸들을 드래그하여 각 항목의 비율을 맞춰보세요!`;
                    hint.style.background = `rgba(108, 92, 231, 0.05)`;
                    hint.style.borderColor = `rgba(108, 92, 231, 0.15)`;
                    hint.style.color = `var(--text-primary)`;
                    
                    if (actionsContainer) {
                        actionsContainer.innerHTML = `<button class="btn btn-primary btn-lg" id="btn-submit-graph">📐 내가 그린 그래프 제출하기</button>`;
                    }
                } else {
                    if (allCorrect) {
                        hint.innerHTML = `🏆 <strong>축하합니다! 모든 비율을 완벽하게 맞췄습니다!</strong> 🏆`;
                        hint.style.background = `rgba(0, 184, 148, 0.1)`;
                        hint.style.borderColor = `#00B894`;
                        hint.style.color = `#00B894`;
                        
                        if (actionsContainer) {
                            // 다 맞은 경우 다시 그려볼 수 있도록 버튼 추가 제공 (선택 사항)
                            actionsContainer.innerHTML = `<button class="btn btn-secondary btn-lg" id="btn-retry-graph">🔄 다시 그려보기</button>`;
                        }
                    } else {
                        hint.innerHTML = `❌ <strong>틀린 부분이 있습니다. 비율을 계산해 보고 다시 수정해 보세요!</strong>`;
                        hint.style.background = `rgba(214, 48, 49, 0.1)`;
                        hint.style.borderColor = `#D63031`;
                        hint.style.color = `#D63031`;
                        
                        if (actionsContainer) {
                            actionsContainer.innerHTML = `<button class="btn btn-secondary btn-lg" id="btn-retry-graph">🔄 다시 그려보기</button>`;
                        }
                    }
                }

                // 5) 데이터 요약 테이블의 백분율 숨김 처리 (제출 전)
                if (typeof updateDataTableBlur === 'function') {
                    updateDataTableBlur();
                }
            }
        };

        // 드래그 제어 이벤트 바인딩
        let isDragging = false;
        let dragIdx = -1;

        const onStart = (e) => {
            if (self.isSubmitted) return; // 제출된 상태에서는 드래그 금지
            const handle = e.target.closest(type === 'band' ? '.band-handle' : '.pie-handle');
            if (handle) {
                isDragging = true;
                dragIdx = parseInt(handle.dataset.idx);
                handle.classList.add('active');
                e.preventDefault();
            }
        };

        const onMove = (e) => {
            if (self.isSubmitted) return; // 제출된 상태에서는 드래그 금지
            if (!isDragging || dragIdx === -1) return;
            let pct = getPctFromEvent(e);

            // 드래그 제약 조건: P_{k-1} + margin < pct < P_{k+1} - margin
            const prevVal = dragIdx > 0 ? self.values[dragIdx - 1] : 0;
            const nextVal = dragIdx < count - 2 ? self.values[dragIdx + 1] : 100;

            const margin = 3.0; // 각 세그먼트의 최소 너비를 3%로 보장
            if (pct < prevVal + margin) pct = prevVal + margin;
            if (pct > nextVal - margin) pct = nextVal - margin;

            // 자석 스냅(Snap) 효과 (내부적으로는 여전히 작동하여 조작을 편리하게 도움)
            const targetCumPct = cumAnswers[dragIdx];
            if (Math.abs(pct - targetCumPct) < 2.0) { // 오차 2% 이내로 접근 시 자석 효과
                if (targetCumPct >= prevVal + margin && targetCumPct <= nextVal - margin) {
                    pct = targetCumPct;
                }
            }

            self.values[dragIdx] = pct;
            updateUI();
        };

        const onEnd = () => {
            if (isDragging) {
                const activeHandle = c.querySelector(type === 'band' ? '.band-handle.active' : '.pie-handle.active');
                if (activeHandle) activeHandle.classList.remove('active');
                isDragging = false;
                dragIdx = -1;
            }
        };

        // 제출 및 다시시도 버튼 클릭 리스너 (위임)
        c.addEventListener('click', (e) => {
            if (e.target.id === 'btn-submit-graph') {
                self.isSubmitted = true;
                updateUI();
            } else if (e.target.id === 'btn-retry-graph') {
                self.isSubmitted = false;
                updateUI();
            }
        });

        container.addEventListener('mousedown', onStart);
        container.addEventListener('touchstart', onStart, {passive: false});

        document.addEventListener('mousemove', onMove);
        document.addEventListener('touchmove', onMove, {passive: false});

        document.addEventListener('mouseup', onEnd);
        document.addEventListener('touchend', onEnd);

        if (this.cleanupPercent) this.cleanupPercent();
        this.cleanupPercent = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('touchmove', onMove);
            document.removeEventListener('mouseup', onEnd);
            document.removeEventListener('touchend', onEnd);
        };

        // 초기 화면 업데이트
        updateUI();
    },

    /* ===== LINE CHART BUILDER ===== */
    buildLine(c) {
        const s = this.survey;
        let h = '<div class="bb-hint">📌 각 항목 위치에서 알맞은 높이를 클릭하여 점을 찍으세요!</div>';

        // Settings for axis
        h += '<div class="bb-axis-settings">';
        h += '<label>가로축: <input type="text" class="bb-axis-inp" id="x-axis-name" placeholder="예: 항목" value="항목"></label>';
        h += '<label>세로축: <input type="text" class="bb-axis-inp" id="y-axis-name" placeholder="예: 학생 수" value="학생 수"></label>';
        h += '<label>단위: <input type="text" class="bb-axis-inp" id="y-axis-unit" placeholder="예: 명" value="명"></label>';
        h += '<label>눈금 1칸 = <select class="bb-axis-inp" id="y-axis-step">';
        [1,2,5,10].forEach(n => h += `<option value="${n}">${n}</option>`);
        h += '</select></label>';
        h += '</div>';

        h += '<div class="bb-graph-area" style="position:relative; margin-top:25px;">';
        h += '<div class="bb-y-label-area" style="position:absolute; top:-25px; left:-10px; font-size:12px; font-weight:600; color:var(--text-secondary);">';
        h += '<span id="disp-y-title">학생 수</span> (<span id="disp-y-unit">명</span>)';
        h += '</div>';

        h += '<div id="line-grid-container"></div>';

        h += '<div class="bb-x-label-area" style="text-align:right; font-size:12px; font-weight:600; color:var(--text-secondary); margin-top:5px; padding-right:10px;">';
        h += '<span id="disp-x-title">항목</span>';
        h += '</div>';

        h += '</div>'; // bb-graph-area 닫기
        c.innerHTML = h;

        const self = this;
        // event listeners for settings
        const updateAxisText = () => {
            const yUnit = c.querySelector('#y-axis-unit').value || '';
            c.querySelector('#disp-x-title').textContent = c.querySelector('#x-axis-name').value || '';
            c.querySelector('#disp-y-title').textContent = c.querySelector('#y-axis-name').value || '';
            c.querySelector('#disp-y-unit').textContent = yUnit;
            s.options.forEach((opt, i) => {
                const v = c.querySelector(`#bbv-${i}`);
                if (v) v.textContent = self.values[i] > 0 ? self.values[i] + yUnit : '0' + yUnit;
            });
        };
        c.querySelector('#x-axis-name').addEventListener('input', updateAxisText);
        c.querySelector('#y-axis-name').addEventListener('input', updateAxisText);
        c.querySelector('#y-axis-unit').addEventListener('input', updateAxisText);
        c.querySelector('#y-axis-step').addEventListener('change', () => {
            self.values = new Array(s.options.length).fill(0);
            self.renderLineGrid(c);
        });

        this.renderLineGrid(c);
    },

    renderLineGrid(c) {
        const s = this.survey;
        const container = c.querySelector('#line-grid-container');
        if (!container) return;

        const yStep = +(c.querySelector('#y-axis-step')?.value || 1);
        const rawMax = Math.max(...s.votes, 1);
        let maxYCells = Math.ceil(rawMax / yStep) + 2;
        if (maxYCells < 4) maxYCells = 4;
        if (maxYCells > 20) maxYCells = 20;
        const CELL_H = 28;

        let h = '<div class="bb-wrapper">';
        h += `<div class="bb-yaxis lc-yaxis" style="--cell-h:${CELL_H}px">`;
        for (let y = maxYCells; y >= 1; y--) {
            h += `<div class="bb-yl lc-yl" style="height:${CELL_H}px">${y * yStep}</div>`;
        }
        h += '<div class="bb-yl lc-yl lc-zero" style="height:12px">0</div>';
        h += '</div>';

        h += '<div class="bb-cols line-mode">';
        s.options.forEach((opt, i) => {
            h += `<div class="bb-col lc-col" data-idx="${i}" style="--cell-h:${CELL_H}px">`;
            for (let y = maxYCells; y >= 1; y--) {
                const val = y * yStep;
                h += `<div class="bb-cell lc" data-y="${val}" data-i="${i}" style="height:${CELL_H}px;min-height:unset" title="${val}명"></div>`;
            }
            h += '</div>';
        });
        h += '</div></div>';

        h += '<div class="lc-vals" style="padding-left:38px">';
        s.options.forEach((opt, i) => {
            h += `<div class="bb-val lc-val-cell" id="bbv-${i}">0명</div>`;
        });
        h += '</div>';

        h += '<div class="bb-labels" style="padding-left:38px">';
        s.options.forEach(o => h += `<div class="bb-lb">${o}</div>`);
        h += '</div>';

        h += '<svg id="line-svg" class="line-svg"></svg>';
        container.innerHTML = h;

        const self = this;
        c.querySelectorAll('.bb-cell.lc').forEach(cell => {
            cell.addEventListener('mouseenter', () => {
                const y = +cell.dataset.y;
                const yUnit = c.querySelector('#y-axis-unit').value || '';
                cell.title = `${y}${yUnit} 클릭하여 선택`;
            });
            cell.addEventListener('click', () => {
                const i = +cell.dataset.i, y = +cell.dataset.y;
                self.values[i] = (self.values[i] === y) ? 0 : y;
                // update visual
                c.querySelectorAll(`.bb-cell.lc[data-i="${i}"]`).forEach(cl => cl.classList.remove('dot'));
                if (self.values[i] > 0) cell.classList.add('dot');
                const valEl = c.querySelector(`#bbv-${i}`);
                const yUnit = c.querySelector('#y-axis-unit').value || '';
                if (valEl) valEl.textContent = self.values[i] > 0 ? self.values[i] + yUnit : '0' + yUnit;
                self.drawLines(c);
            });
        });

        // Restore visual state
        s.options.forEach((opt, i) => {
            const v = self.values[i];
            const cell = c.querySelector(`.bb-cell.lc[data-i="${i}"][data-y="${v}"]`);
            if (cell) cell.classList.add('dot');
            const valEl = c.querySelector(`#bbv-${i}`);
            const yUnit = c.querySelector('#y-axis-unit').value || '';
            if (valEl) valEl.textContent = v > 0 ? v + yUnit : '0' + yUnit;
        });
        self.drawLines(c);
    },

    drawLines(c) {
        const svg = c.querySelector('#line-svg');
        if (!svg) return;
        const wrapper = c.querySelector('.bb-wrapper');
        if (!wrapper) return;

        // SVG를 bb-wrapper 기준으로 위치
        const wr = wrapper.getBoundingClientRect();
        const cr = c.getBoundingClientRect();
        svg.style.left   = (wr.left - cr.left) + 'px';
        svg.style.top    = (wr.top  - cr.top)  + 'px';
        svg.style.width  = wr.width  + 'px';
        svg.style.height = wr.height + 'px';

        const cols = c.querySelectorAll('.lc-col');
        const pts = [];
        cols.forEach((col) => {
            const dot = col.querySelector('.bb-cell.dot');
            if (dot) {
                const r  = dot.getBoundingClientRect();
                const sr = wrapper.getBoundingClientRect();
                pts.push({ x: r.left + r.width/2  - sr.left,
                           y: r.top  + r.height/2 - sr.top });
            } else {
                pts.push(null);
            }
        });

        const valid = pts.filter(p => p);
        if (valid.length > 1) {
            const pointStr = valid.map(p => `${p.x},${p.y}`).join(' ');
            svg.innerHTML =
                `<polyline points="${pointStr}" fill="none" stroke="#6C5CE7" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>` +
                valid.map(p => `<circle cx="${p.x}" cy="${p.y}" r="5" fill="#6C5CE7" stroke="white" stroke-width="2"/>`).join('');
        } else {
            svg.innerHTML = '';
        }
    },


    /* ===== PICTOGRAPH BUILDER ===== */
    // 아이콘 카테고리 (주제에 맞는 그림 선택용)
    iconList: [
        {cat: '⭐ 기본', icons: ['⭐','❤️','⚽','🌸','💎','🔥','🎵','✨','🌟','🎯']},
        {cat: '🍎 과일', icons: ['🍎','🍊','🍋','🍇','🍓','🍑','🍌','🍉','🥝','🍒']},
        {cat: '🐶 동물', icons: ['🐶','🐱','🐰','🐻','🐼','🦁','🐯','🐸','🐥','🐟']},
        {cat: '⚽ 운동', icons: ['⚽','🏀','⚾','🎾','🏐','🏓','🏸','🎳','⛳','🥊']},
        {cat: '🌤️ 날씨', icons: ['☀️','🌧️','❄️','🌈','⛅','🌊','🌙','⭐','🌸','🍂']},
        {cat: '🍔 음식', icons: ['🍔','🍕','🍜','🍣','🍩','🍦','🌮','🍰','🍿','🥤']},
        {cat: '📚 학교', icons: ['📚','✏️','🎒','📐','🖍️','📖','🔬','🎨','📏','🖊️']},
        {cat: '🎮 취미', icons: ['🎮','📺','📱','🎧','📷','🎤','🎬','📕','🧩','🎲']},
        {cat: '🚗 탈것', icons: ['🚗','🚌','🚲','✈️','🚂','🚀','🛴','🚁','⛵','🏍️']},
    ],
    pictoIcon: '⭐',  // 전체 설문에 하나의 아이콘
    pictoBig: 10,
    pictoSmall: 1,

    buildPicto(c) {
        const s = this.survey;
        const maxV = Math.max(...s.votes, 1);
        this.pictoBig = maxV >= 20 ? 10 : maxV >= 10 ? 5 : maxV >= 5 ? 2 : 1;
        this.pictoSmall = 1;
        this.pictoIcon = '⭐';
        this.values = s.options.map(() => ({big:0, small:0}));

        let h = '<div class="bb-hint">📌 큰 그림과 작은 그림의 개수를 조절하여 데이터를 표현해 보세요!</div>';
        // 설정 영역
        h += '<div class="bp-picto-settings">';
        h += `<label>그림 선택:</label>`;
        h += `<button class="picto-current-icon" id="picto-icon-toggle" title="그림 변경">${this.pictoIcon}</button>`;
        h += '<label>큰 그림 =</label><select id="picto-big-sel">';
        [2,5,10,20].forEach(n => h += `<option value="${n}" ${n===this.pictoBig?'selected':''}>${n}명</option>`);
        h += '</select>';
        h += '<label>작은 그림 =</label><select id="picto-small-sel">';
        [1,2,5].forEach(n => h += `<option value="${n}" ${n===this.pictoSmall?'selected':''}>${n}명</option>`);
        h += '</select></div>';
        // 아이콘 선택 패널 (숨김)
        h += '<div id="picto-icon-panel" class="bp-icon-picker" style="display:none"><div class="bp-icon-grid">';
        this.iconList.forEach(group => {
            h += `<div class="bp-icon-cat">${group.cat}</div>`;
            group.icons.forEach(ic => {
                h += `<button class="bp-icon-opt${ic===this.pictoIcon?' active':''}" data-icon="${ic}">${ic}</button>`;
            });
        });
        h += '</div></div>';
        // 범례 + 행들
        h += '<div id="picto-rows" class="bp-picto-rows"></div>';
        c.innerHTML = h;
        this.renderPictoRows(c);

        const self = this;
        // 아이콘 선택 토글
        c.querySelector('#picto-icon-toggle').addEventListener('click', () => {
            const panel = c.querySelector('#picto-icon-panel');
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        });
        // 아이콘 선택
        c.querySelectorAll('.bp-icon-opt').forEach(btn => {
            btn.addEventListener('click', () => {
                self.pictoIcon = btn.dataset.icon;
                c.querySelector('#picto-icon-toggle').textContent = self.pictoIcon;
                c.querySelector('#picto-icon-panel').style.display = 'none';
                c.querySelectorAll('.bp-icon-opt').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                self.renderPictoRows(c);
            });
        });
        // 큰/작은 그림 단위 변경
        c.querySelector('#picto-big-sel').addEventListener('change', e => {
            self.pictoBig = +e.target.value;
            self.values = s.options.map(() => ({big:0, small:0}));
            self.renderPictoRows(c);
        });
        c.querySelector('#picto-small-sel').addEventListener('change', e => {
            self.pictoSmall = +e.target.value;
            self.values = s.options.map(() => ({big:0, small:0}));
            self.renderPictoRows(c);
        });
    },

    renderPictoRows(c) {
        const s = this.survey;
        const rows = c.querySelector('#picto-rows');
        const icon = this.pictoIcon;
        // 범례: 하나의 아이콘으로 통일
        let h = `<div class="bp-picto-key"><span class="picto-big-icon">${icon}</span> = ${this.pictoBig}명 &nbsp;&nbsp; <span class="picto-sm-icon">${icon}</span> = ${this.pictoSmall}명</div>`;

        s.options.forEach((opt, i) => {
            const v = this.values[i];
            const total = v.big * this.pictoBig + v.small * this.pictoSmall;
            // 큰 아이콘 + 구분선 + 작은 아이콘
            let iconHtml = '';
            for (let j = 0; j < v.big; j++) iconHtml += `<span class="picto-big-icon">${icon}</span>`;
            if (v.big > 0 && v.small > 0) iconHtml += '<span class="picto-sep">│</span>';
            for (let j = 0; j < v.small; j++) iconHtml += `<span class="picto-sm-icon">${icon}</span>`;

            h += `<div class="bp-pr">
                <span class="bp-pr-label">${opt}</span>
                <div class="bp-pr-icons" id="picto-icons-${i}">${iconHtml || '<span class="picto-empty">—</span>'}</div>
                <div class="bp-pr-dual-btns">
                    <div class="bp-btn-group">
                        <span class="bp-btn-label">큰 그림</span>
                        <button class="btn-icon picto-big-minus" data-i="${i}">−</button>
                        <span class="bp-btn-val">${v.big}</span>
                        <button class="btn-icon picto-big-plus" data-i="${i}">+</button>
                    </div>
                    <div class="bp-btn-group">
                        <span class="bp-btn-label">작은 그림</span>
                        <button class="btn-icon picto-small-minus" data-i="${i}">−</button>
                        <span class="bp-btn-val">${v.small}</span>
                        <button class="btn-icon picto-small-plus" data-i="${i}">+</button>
                    </div>
                    <span class="bp-pr-count">${total}명</span>
                </div>
            </div>`;
        });
        rows.innerHTML = h;

        const self = this;
        rows.querySelectorAll('.picto-big-plus').forEach(btn => {
            btn.addEventListener('click', () => { self.values[+btn.dataset.i].big++; self.renderPictoRows(c); });
        });
        rows.querySelectorAll('.picto-big-minus').forEach(btn => {
            btn.addEventListener('click', () => { const i=+btn.dataset.i; if(self.values[i].big>0) self.values[i].big--; self.renderPictoRows(c); });
        });
        rows.querySelectorAll('.picto-small-plus').forEach(btn => {
            btn.addEventListener('click', () => { self.values[+btn.dataset.i].small++; self.renderPictoRows(c); });
        });
        rows.querySelectorAll('.picto-small-minus').forEach(btn => {
            btn.addEventListener('click', () => { const i=+btn.dataset.i; if(self.values[i].small>0) self.values[i].small--; self.renderPictoRows(c); });
        });
    },


};
