/* ================================================
   HAM SSAM 도형심리 분석소 - 완전 업그레이드 버전
   HAM SSAM (Geometry Psychology Assessment) 기반
================================================ */

// ── 상태 관리 ──────────────────────────────────
let currentMode = 'photo';
let selectedFile = null;
let selectedOrder = [];
let analysisResult = null;

// ── 날짜 기본값 ──────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('userDate').value = today;
  
  
});




// ══════════════════════════════════════════════
// 모드 전환
// ══════════════════════════════════════════════
function switchMode(mode) {
  currentMode = mode;
  document.getElementById('tabPhoto').classList.toggle('active', mode === 'photo');
  document.getElementById('tabManual').classList.toggle('active', mode === 'manual');
  document.getElementById('photoMode').classList.toggle('hidden', mode !== 'photo');
  document.getElementById('manualMode').classList.toggle('hidden', mode !== 'manual');
}

// ══════════════════════════════════════════════
// 파일 업로드
// ══════════════════════════════════════════════
function handleDragOver(e) {
  e.preventDefault();
  document.getElementById('dropZone').classList.add('over');
}
function handleDragLeave(e) {
  document.getElementById('dropZone').classList.remove('over');
}
function handleDrop(e) {
  e.preventDefault();
  document.getElementById('dropZone').classList.remove('over');
  const file = e.dataTransfer.files[0];
  if (file) processFile(file);
}
function handleFileSelect(e) {
  const file = e.target.files[0];
  if (file) processFile(file);
}
function processFile(file) {
  if (!file.type.startsWith('image/')) { alert('이미지 파일만 가능해요!'); return; }
  if (file.size > 15 * 1024 * 1024) { alert('15MB 이하 파일만 가능해요!'); return; }
  selectedFile = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById('previewImg').src = e.target.result;
    document.getElementById('dropZone').style.display = 'none';
    document.getElementById('previewBox').classList.remove('hidden');
    
  };
  reader.readAsDataURL(file);
}
function removeImage() {
  selectedFile = null;
  document.getElementById('previewImg').src = '';
  document.getElementById('previewBox').classList.add('hidden');
  document.getElementById('dropZone').style.display = '';
    document.getElementById('fileInput').value = '';
}

// ══════════════════════════════════════════════
// 직접 선택 모드
// ══════════════════════════════════════════════
const SHAPE_NAMES = { ci: '원(○)', tr: '삼각형(△)', sq: '사각형(□)', sg: 'S형(S)' };
function selectShape(shape) {
  if (selectedOrder.includes(shape)) return;
  if (selectedOrder.length >= 4) return;
  selectedOrder.push(shape);
  const rank = selectedOrder.length;
  const card = document.getElementById('sc-' + shape);
  card.classList.add('selected');
  const rankEl = card.querySelector('.shape-rank');
  rankEl.textContent = rank;
  rankEl.classList.remove('hidden');
  document.getElementById('rank' + rank).textContent = rank + '위: ' + SHAPE_NAMES[shape];
}
function resetShapes() {
  selectedOrder = [];
  ['ci','tr','sq','sg'].forEach(s => {
    const card = document.getElementById('sc-' + s);
    card.classList.remove('selected');
    card.querySelector('.shape-rank').classList.add('hidden');
  });
  for (let i = 1; i <= 4; i++) {
    document.getElementById('rank' + i).textContent = i + '위: ?';
  }
}

// ══════════════════════════════════════════════
// 분석 시작
// ══════════════════════════════════════════════
async function startAnalysis() {
  if (currentMode === 'photo') {
    if (!selectedFile) { alert('워크지 사진을 업로드해주세요!'); return; }
    await runHamSsamAiAnalysis();
  } else {
    if (selectedOrder.length < 4) { alert('4가지 도형을 모두 순서대로 선택해주세요!'); return; }
    runManualHamSsamAnalysis(selectedOrder);
  }
}

// ══════════════════════════════════════════════
// HAM SSAM AI 분석 (Gemini Vision API)
// ══════════════════════════════════════════════
async function runHamSsamAiAnalysis() {
  showStep('stepLoading');
  setLoadingMsg('워크지 이미지 분석 중...');
  setLoadingProgress(20);

  try {
    const formData = new FormData();
    formData.append('image', selectedFile);

    const apiUrl = window.location.protocol === 'file:' ? 'http://localhost:4000/api/analyze' : '/api/analyze';
    const resp = await fetch(apiUrl, {
      method: 'POST',
      body: formData
    });

    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({}));
      throw new Error(errData.error || `서버 오류 (${resp.status})`);
    }

    setLoadingProgress(70);
    setLoadingMsg('상세 보고서 생성 중...');

    const result = await resp.json();

    setLoadingProgress(100);
    setTimeout(() => buildHamSsamReport(result), 400);

  } catch (err) {
    console.error('AI 분석 실패:', err);
    
    alert('🚨 HAM SSAM AI 분석 실패\n\n' + 
          '• 상세 에러: ' + err.message + '\n\n' +
          '💡 참고: 에러 메시지를 확인해주세요.');
    showStep('stepUpload');
    switchMode('manual');
  }
}

// ══════════════════════════════════════════════
// 직접 선택 모드 분석
// ══════════════════════════════════════════════
function runManualHamSsamAnalysis(order) {
  showStep('stepLoading');
  let progress = 0;
  const interval = setInterval(() => {
    progress += 33;
    setLoadingProgress(Math.min(progress, 99));
    if (progress <= 33) setLoadingMsg('도형 순위 분석 중...');
    else if (progress <= 66) setLoadingMsg('심리 유형 파악 중...');
    else { setLoadingMsg('보고서 생성 중...'); }
    if (progress >= 99) {
      clearInterval(interval);
      setLoadingProgress(100);
      const result = buildManualResult(order);
      setTimeout(() => buildHamSsamReport(result), 500);
    }
  }, 800);
}

// ══════════════════════════════════════════════
// HAM SSAM 지식 데이터베이스
// ══════════════════════════════════════════════
const HAM_SSAM_DATA = {
  ci: {
    name: '원(○)', icon: '○', color: '#10b981',
    meaning: '사람 · 관계 · 물질',
    traits: ['포용력', '사교적', '활발함', '공감능력', '친화력'],
    timelineFuture: '미래의 관계와 인연에 대한 기대',
    typeName: '원형 공감자',
    stability: 65, leadership: 40, empathy: 95, creativity: 60,
    strengths: ['뛰어난 공감 능력', '원활한 소통', '유연한 사고', '강한 팀워크', '관계 유지 능력'],
    strengthText: '당신은 사람의 마음을 이해하는 탁월한 능력이 있어요. 누구와도 쉽게 어울리며, 갈등을 부드럽게 해결하는 데 탁월합니다. 당신이 있는 곳에는 항상 따뜻한 분위기가 만들어지죠. 원(○)이 상징하는 포용력과 사교적 에너지가 충만한 분이에요.',
    weaknesses: ['거절 어려움', '자기 희생 경향', '우유부단'],
    weaknessText: '다른 사람을 배려하느라 자신의 필요를 뒤로 미루는 경향이 있어요. "아니요"라고 말하기 어렵고, 결단을 내리는 것이 힘들 때가 있습니다.',
    complements: ['건강한 경계선 설정 연습 — "아니요"라고 말하는 용기 기르기', '나 자신을 돌보는 시간을 의도적으로 확보하기', '중요한 결정을 내릴 때 감정과 논리를 함께 사용하기', '자신의 의견을 솔직하게 표현하는 연습하기'],
    advice: '당신의 따뜻한 마음은 세상을 밝히는 빛이에요. 하지만 남을 사랑하려면 먼저 나를 사랑해야 한다는 것을 기억하세요. 자신을 잘 돌볼 때, 더 많은 사람을 도울 수 있답니다.',
    careers: ['상담사', '사회복지사', '교사', '의료인', '인사담당자', '고객서비스', '심리치료사', '코치'],
    dominantEmotion: '외로움·그리움 (관계에 대한 욕구)',
    relationStyle: '관계 중심형 — 사람과의 연결을 중요시하며, 따뜻하고 포용적인 관계를 맺어요',
    communicationStyle: '감정 중심형 — 상대방의 감정에 공감하며 소통하는 스타일이에요'
  },
  tr: {
    name: '삼각형(△)', icon: '△', color: '#f43f5e',
    meaning: '일 · 목표 · 승진',
    traits: ['리더십', '주도적', '진취적', '추진력', '결단력'],
    timelineFuture: '미래의 목표와 성취에 대한 강한 의지',
    typeName: '삼각형 리더',
    stability: 60, leadership: 95, empathy: 45, creativity: 55,
    strengths: ['강한 리더십', '목표 달성 집중력', '신속한 의사결정', '설득력과 카리스마', '결단력'],
    strengthText: '당신은 타고난 리더의 기질을 가지고 있어요. 목표를 향해 흔들림 없이 나아가는 추진력과 사람들을 이끄는 능력이 탁월합니다. 삼각형(△)은 자신감·목표·계획·승진을 상징하며, 당신의 성취 지향적 에너지가 강하게 나타납니다.',
    weaknesses: ['타인의 감정 간과', '독단적 경향', '완급 조절 어려움'],
    weaknessText: '목표에 집중하느라 주변 사람들의 감정을 놓칠 수 있어요. 빠른 결정이 때로는 독단으로 보일 수 있습니다.',
    complements: ['결정 전 팀원의 의견을 충분히 경청하기', '과정 자체를 즐기는 연습하기', '경쟁보다 협력이 더 큰 성과를 낸다는 것 기억하기', '휴식을 전략의 일부로 인정하기'],
    advice: '당신의 열정과 추진력은 세상을 바꿀 수 있는 힘이에요. 가장 위대한 리더는 팀원의 마음을 얻는 리더라는 것을 기억하세요. 때로는 천천히, 함께 가는 것이 더 멀리 갈 수 있는 길이랍니다.',
    careers: ['CEO', '기업가', '영업 전문가', '변호사', '스포츠 코치', '정치가', '프로젝트 리더', '군 장교'],
    dominantEmotion: '분노·적개심·억울함 (억눌린 성취욕)',
    relationStyle: '사고 중심형 — 목표와 성과를 중심으로 관계를 맺으며, 신뢰 기반의 관계를 선호해요',
    communicationStyle: '직접형 — 명확하고 간결하게 핵심을 전달하는 스타일이에요'
  },
  sq: {
    name: '사각형(□)', icon: '□', color: '#6366f1',
    meaning: '공동체 · 지식 · 현재',
    traits: ['규범', '원칙', '신뢰감', '책임감', '실행력'],
    timelineFuture: '현재에 충실한 체계적 계획',
    typeName: '사각형 분석가',
    stability: 95, leadership: 55, empathy: 50, creativity: 40,
    strengths: ['꼼꼼한 계획력', '논리적 사고', '신뢰할 수 있는 일관성', '체계적인 업무 처리', '책임감'],
    strengthText: '당신은 탁월한 조직력과 분석력을 가진 사람이에요. 사각형(□)은 규범·원칙·신뢰감·책임감·실행을 상징합니다. 체계적으로 접근하며 신뢰할 수 있는 결과를 만들어냅니다.',
    weaknesses: ['변화 저항', '완벽주의로 인한 지연', '감정 표현 어려움'],
    weaknessText: '때로는 변화를 받아들이기 어렵고, 완벽함을 추구하다 지칠 수 있어요. 감정을 표현하는 데 소극적이어서 오해를 받을 수도 있습니다.',
    complements: ['주 1회 계획 없이 흘러가는 시간 허락하기', '80% 완성 후 시작하는 연습하기', '가까운 사람에게 감사 표현하는 습관 만들기', '새로운 방식을 실험해보는 용기 기르기'],
    advice: '당신의 꼼꼼함과 성실함은 정말 큰 자산이에요. 가끔은 계획 없이 흘러가는 시간도 허락해 보세요. 완벽한 계획보다 지금 이 순간을 즐기는 것도 삶의 중요한 부분이랍니다.',
    careers: ['데이터 분석가', '회계사', '프로젝트 매니저', '엔지니어', '의사', '행정가', '품질관리 전문가', '연구원'],
    dominantEmotion: '두려움·부담감·열등감 (완벽주의적 불안)',
    relationStyle: '원칙 중심형 — 신뢰와 원칙을 바탕으로 관계를 맺으며, 일관성 있는 태도를 유지해요',
    communicationStyle: '논리형 — 데이터와 근거를 바탕으로 체계적으로 전달하는 스타일이에요'
  },
  sg: {
    name: 'S형(S)', icon: 'S', color: '#f59e0b',
    meaning: '영성 · 예술 · 건강',
    traits: ['융통성', '유연함', '창조성', '감수성', '직관력'],
    timelineFuture: '영적 성장과 창의적 자아실현',
    typeName: 'S형 창의자',
    stability: 30, leadership: 55, empathy: 60, creativity: 95,
    strengths: ['뛰어난 창의력', '직관적 통찰', '혁신적 아이디어', '변화 적응력', '예술적 감수성'],
    strengthText: '당신은 남들이 보지 못하는 것을 보는 창의적인 사람이에요. S형은 융통성·유연함·창조성·감수성을 상징합니다. 틀에 얽매이지 않고 새로운 방식으로 문제를 해결하며, 변화하는 환경에서 빛을 발합니다.',
    weaknesses: ['규칙적 생활 어려움', '집중력 분산', '마감 관리 어려움'],
    weaknessText: '자유로운 성격으로 인해 일정한 루틴을 유지하기 어려울 수 있어요. 동시에 여러 아이디어를 추구하다 완성하지 못하는 경우도 있습니다.',
    complements: ['하루 루틴 중 한 가지만 규칙적으로 유지하기', '프로젝트를 작은 단위로 나눠 완성의 성취감 맛보기', '아이디어 노트를 활용해 우선순위 정하기', '실행력이 강한 파트너와 협업하기'],
    advice: '당신의 창의성은 세상이 필요로 하는 보물이에요. 그 재능을 세상에 보여주기 위해서는 아이디어를 실행으로 옮기는 작은 용기가 필요해요. 완벽하지 않아도 괜찮아요, 시작이 반이랍니다!',
    careers: ['디자이너', '예술가', '작가', '마케터', '스타트업 창업가', '광고 기획자', '힐러', '음악가'],
    dominantEmotion: '질투심·공포심·무기력 (창의적 억압)',
    relationStyle: '자유 중심형 — 형식 없이 자연스럽게 관계를 맺으며, 다양한 사람들과 교류해요',
    communicationStyle: '직관형 — 감각적이고 창의적인 방식으로 메시지를 전달하는 스타일이에요'
  }
};

// 🕒 과거·현재·미래 정밀 타임라인 심리 상태 텍스트 데이터베이스
const TIMELINE_TEXTS = {
  past: {
    ci: "과거에 사람들과의 따뜻하고 포근한 관계 속에서 자랐거나, 반대로 관계에서의 상실감이나 깊은 갈등을 겪으면서 관계의 소중함을 정서의 뿌리에 일찍이 깊게 심어 온 흔적이 보입니다. 늘 주변 사람들의 마음의 진폭을 남달리 민감하게 공감하고 챙겨주려 부단히 애썼던 정서 발달 역사를 지니고 있으며, 아팠던 과거 경험이 현재 타인을 껴안아주는 거대한 관계 포용력의 단단한 주춧돌로 작용하고 있습니다.",
    tr: "과거에 언제나 뚜렷한 목표를 향해 활기차고 성실하게 달려왔거나, 뛰어난 성취와 성공을 강하게 요망하는 활발하고 정열적인 환경에서 살아왔을 가능성이 대단히 높습니다. 최고가 되기 위해 끝없이 자기개발 경쟁을 펼치며 타인의 기대에 부응하려 스스로를 많이 몰아붙여 왔던 흔적이 보이며, 그 속에서 가꾸어낸 불굴의 강인함과 잔여 스트레스 긴장감이 무의식 한구석에 심리적 흔적으로 남아있습니다.",
    sq: "과거에 완벽주의에 가까운 정갈한 도덕 규칙, 예의범절, 혹은 모범생다운 흐트러짐 없는 완벽을 요하는 양육 환경 속에서 자라온 경험이 진하게 녹아있습니다. 실수를 용납하기 힘든 통제 아래 자라면서 일찍이 높은 책임감과 강인한 인내심을 스스로 터득하고 다졌으나, 언제나 올발라야 한다는 엄격한 내면 검열과 심리적 긴장감이 여전히 과거의 무의식적 짐으로 조용히 영향을 끼치고 있을 수 있습니다.",
    sg: "과거에 예술, 창작, 혹은 독특하고 남다른 내면의 깊은 예술 감수성을 자연스레 표현할 수 있는 환경에 있었거나, 반대로 그러한 고유한 자유 개성과 통찰들이 일찍이 억압받는 경직된 환경을 지혜롭게 헤쳐 나오며 자신만의 깊이 있는 고독한 감정적 해방구를 견고히 다져냈습니다. 남다른 변화를 온몸으로 다스리며 내면에 깊고 맑은 영성적 통찰을 키워온 발달사를 고이 간직하고 있습니다."
  },
  present: {
    ci: "현재 선생님의 마음은 주변인들과 따스한 조화를 이루고 온기를 가만히 주고받는 깊은 정서적 공감 교감 영역에 모든 에너지가 모여 있습니다. 타인의 슬픔이나 결핍을 자기 일처럼 안쓰러워하며 보살피는 포용력의 왕성함이 일품인 상태이나, 혹여나 자신의 내적 피로감이나 말 못할 상처는 속으로 애써 삭인 채 타인만을 과도하게 배려하다 정서의 번아웃을 겪을 수 있으니 이제 나 자신을 1순위로 돌보는 자기 공감이 매우 필요한 때입니다.",
    tr: "현재 선생님의 심리적 역동은 뚜렷하게 설정한 큰 비전을 향해 질주하는 뜨거운 열정과 목표 지향적인 과감한 실행력으로 활기차게 채워져 있습니다. 높은 책임감과 타고난 리더십 주도성을 최대치로 활성화시켜 어떠한 어려움도 척척 돌파해 나가고 있지만, 한편으로는 일과 성과에 극도로 긴장·몰입하고 있어 스스로를 쉬어가지 못하게 한계까지 밀어붙이는 마음의 탈진을 단호하게 다스려줄 진정한 휴식이 절실합니다.",
    sq: "현재 선생님은 흐트러짐 없는 탄탄한 규칙과 빈틈없는 철저한 계획성을 기둥 삼아, 삶의 안정성과 질서를 대단히 아름답고 훌륭하게 구축하고 통제해 나가는 상태에 계십니다. 듬직한 규범과 신의를 지키며 언제나 남들에게 큰 심리적 안정성과 기댈 곳을 내어주지만, 갑작스러운 일상 계획의 균열이나 감정적 돌발 변수와 조우할 때 내면에 통제력을 잃을 것 같은 불안과 마음의 경직을 겪을 우려가 큽니다.",
    sg: "현재 선생님의 마음의 문은 풍요로운 비상과 세밀한 창의성, 혹은 신체와 감정의 균형 있는 치유와 웰빙(안식)에 초감각적으로 활짝 열려 있습니다. 남들이 흉내 낼 수 없는 기발한 지혜와 영감을 분출하며 정적인 일상의 답답함을 멋지게 타파하려 하지만, 한편으로는 정서적 흔들림(감정 기복)의 파동이 크게 나타나고 마음이 쉽게 요동치며 조그만 일에도 복잡하게 고뇌에 잠기기 쉬운 예민한 감정선 위에 있습니다."
  },
  future: {
    ci: "앞으로 다가올 소중한 미래에는 주변 소중한 이들과 따스하고 평화로운 인간관계의 대정원을 아름답게 가꾸어가고 자아를 실현하고 싶어 합니다. 다만, 생애 최고의 성장 과제를 멋지게 매조짓기 위해서는 때론 미안해하지 않고 건강하게 거절할 줄 아는 '자신만의 심리적 울타리(경계선)'를 탄탄히 하고, 남 중심에서 나 중심으로 정서적 완전 자립을 쟁취하는 성장이 필수적인 열쇠입니다.",
    tr: "앞으로 맞이할 가치 있는 미래에는 본인이 진두지휘하는 조직의 위상을 우뚝 세우거나 오랫동안 꿈꿔왔던 자신만의 거대한 성공과 명예를 눈부시게 이룩하기를 강력하게 소망하고 있습니다. 이를 안전하게 실현하기 위해서는 모든 일의 통제력을 가끔은 가볍게 내릴 줄 아는 유연함을 갖추고, 주변인들에게 신의를 바탕으로 전적인 권한을 분담하며 장기적인 삶의 휴식적 평화를 함께 직조해가야 합니다.",
    sq: "앞으로 설계해 갈 튼튼한 미래에는 어떠한 폭풍우에도 쉽게 흔들리거나 허물어지지 않는 굳건하고 탄탄한 삶의 주춧돌을 세우고, 본인만의 위대한 인생 가치관을 현실 세계에 고스란히 정립하기를 꿈꾸고 있습니다. 성장의 완전함에 다다르기 위해서는 삶이 주는 때묻은 불완전함조차 자애롭게 끌어안아주고, 예기치 않은 모험과 의외성을 부드러운 평온함으로 포용해주는 유연한 마음근육이 필요합니다.",
    sg: "앞으로 이룩할 신비로운 미래에는 본인 고유의 번뜩이는 세련된 감성, 독창적이고 자유로운 비전, 혹은 상처 입은 내면을 보듬는 정화의 에너지를 아름답게 전파하며 완전한 자아실현의 꽃을 피우길 갈망합니다. 멋진 비상을 온전히 현실로 정착시키기 위해서는, 가상의 예술적 이상향이나 아이디어에만 머무르지 않고 이를 차분하게 뿌리내려 매조지어낼 줄 아는 튼튼한 인내와 성실한 실행력을 결합시켜야 합니다."
  }
};

function buildManualResult(order) {
  const primary = order[0];
  const d = HAM_SSAM_DATA[primary];
  const scores = calcScores(order);

  // 1순위+2순위 도형을 아름답게 조화시킨 심도 깊은 현재 심리상태
  const secShape = order[1];
  const secName = HAM_SSAM_DATA[secShape]?.name || secShape;
  const presentCombined = TIMELINE_TEXTS.present[primary] + 
    ` 이에 더해 두 번째로 가깝게 배치된 2순위 도형인 '${secName}'의 보조 에너지가 마음 한편에서 유기적으로 조화를 이루며 작동하고 있습니다. 이는 주된 무의식 성격 뒤에 숨은 실질적인 행동 스타일의 강점을 풍부하게 보완해 주어, 내면의 역동이 한층 더 유연하고 다채로운 성격적 유연성으로 훌륭하게 가꿔져 있음을 대변합니다.`;

  return {
    primaryShape: primary,
    shapeOrder: order,
    typeName: d.typeName,
    pastText: TIMELINE_TEXTS.past[order[2]] || '과거 정밀 진단 데이터를 조합하는 중입니다.',
    presentText: presentCombined,
    futureText: TIMELINE_TEXTS.future[order[3]] || '미래 정밀 진단 데이터를 조합하는 중입니다.',
    strengths: d.strengths,
    strengthText: d.strengthText,
    weaknesses: d.weaknesses,
    weaknessText: d.weaknessText,
    complements: d.complements,
    advice: d.advice,
    careers: d.careers,
    stability: scores.stability,
    leadership: scores.leadership,
    empathy: scores.empathy,
    creativity: scores.creativity,
    relationStyle: d.relationStyle,
    communicationStyle: d.communicationStyle
  };
}

function getDefaultResult(primary) {
  const d = HAM_SSAM_DATA[primary] || HAM_SSAM_DATA.ci;
  return buildManualResult([primary, 'tr', 'sq', 'sg'].filter((v,i,a)=>a.indexOf(v)===i));
}

// ══════════════════════════════════════════════
// 점수 계산
// ══════════════════════════════════════════════
function calcScores(order) {
  const weights = [0.45, 0.28, 0.17, 0.10];
  const result = { stability: 0, leadership: 0, empathy: 0, creativity: 0 };
  order.forEach((shape, i) => {
    const d = HAM_SSAM_DATA[shape];
    if (!d) return;
    result.stability += d.stability * weights[i];
    result.leadership += d.leadership * weights[i];
    result.empathy += d.empathy * weights[i];
    result.creativity += d.creativity * weights[i];
  });
  Object.keys(result).forEach(k => result[k] = Math.round(Math.min(result[k], 100)));
  return result;
}

// ══════════════════════════════════════════════
// 보고서 빌드
// ══════════════════════════════════════════════
function buildHamSsamReport(result) {
  const name = document.getElementById('userName').value.trim() || '익명';
  const dateStr = document.getElementById('userDate').value;
  const dateObj = dateStr ? new Date(dateStr) : new Date();
  const dateFormatted = dateObj.toLocaleDateString('ko-KR', { year:'numeric', month:'long', day:'numeric' });

  document.getElementById('coverName').textContent = name + ' 님';
  document.getElementById('coverDate').textContent = dateFormatted;
  document.getElementById('coverType').textContent = result.typeName || '분석 완료';

  // 패턴 타입 뱃지
  document.getElementById('patternTypeBadge').textContent = '📐 ' + (result.patternType || '단순형');

  // 도형 순위 카드
  const order = result.shapeOrder || ['ci','tr','sq','sg'];
  const ranksEl = document.getElementById('shapeRanks');
  ranksEl.innerHTML = '';
  order.forEach((shape, i) => {
    const sd = HAM_SSAM_DATA[shape] || { name: shape, icon: shape, color: '#888', keyword: '' };
    const pct = [100, 70, 45, 22][i];
    ranksEl.innerHTML += `
      <div class="rank-row">
        <div class="rank-num r${i+1}">${i+1}</div>
        <div class="rank-icon" style="color:${sd.color}">${sd.icon}</div>
        <div class="rank-info">
          <div class="rank-name">${sd.name}</div>
          <div class="rank-keyword">${sd.meaning || sd.traits?.join(' · ') || ''}</div>
        </div>
        <div class="rank-bar-wrap">
          <div class="rank-bar" style="background:${sd.color};width:${pct}%"></div>
        </div>
      </div>
    `;
  });

  // ⏳ 과거·현재·미래 타임라인 정밀 분석 연동!
  document.getElementById('pastText').textContent = result.pastText || '';
  document.getElementById('presentText').textContent = result.presentText || '';
  document.getElementById('futureText').textContent = result.futureText || '';

  // 강점
  document.getElementById('strengthTags').innerHTML =
    (result.strengths || []).map(s => `<span class="tag">${s}</span>`).join('');
  document.getElementById('strengthText').textContent = result.strengthText || '';

  // 약점
  document.getElementById('weaknessTags').innerHTML =
    (result.weaknesses || []).map(s => `<span class="tag">${s}</span>`).join('');
  document.getElementById('weaknessText').textContent = result.weaknessText || '';

  // 보완점
  document.getElementById('complementList').innerHTML =
    (result.complements || []).map(c => `<li>${c}</li>`).join('');

  // 조언
  document.getElementById('adviceCard').textContent = result.advice || '';

  // 관계/소통
  document.getElementById('relationText').textContent = result.relationStyle || '';
  document.getElementById('communicationText').textContent = result.communicationStyle || '';

  // 직업
  document.getElementById('careerGrid').innerHTML =
    (result.careers || []).map(c => `<span class="career-chip">${c}</span>`).join('');

  // 레이더 차트
  const scores = {
    stability: result.stability || 70,
    leadership: result.leadership || 60,
    empathy: result.empathy || 75,
    creativity: result.creativity || 65
  };
  drawRadarChart(scores);

  showStep('stepReport');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ══════════════════════════════════════════════
// 로딩 헬퍼
// ══════════════════════════════════════════════
function setLoadingMsg(msg) {
  document.getElementById('loadingText').textContent = msg;
}
function setLoadingProgress(pct) {
  document.getElementById('loadingBar').style.width = pct + '%';
}

// ══════════════════════════════════════════════
// 레이더 차트
// ══════════════════════════════════════════════
function drawRadarChart(scores) {
  const canvas = document.getElementById('radarChart');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const cx = W / 2, cy = H / 2;
  const r = Math.min(W, H) * 0.36;
  ctx.clearRect(0, 0, W, H);

  const labels = ['안정성', '리더십', '공감력', '창의성'];
  const vals = [scores.stability, scores.leadership, scores.empathy, scores.creativity];
  const N = 4;
  const angles = labels.map((_, i) => (i * 2 * Math.PI / N) - Math.PI / 2);

  for (let g = 1; g <= 5; g++) {
    ctx.beginPath();
    angles.forEach((a, i) => {
      const px = cx + (r * g / 5) * Math.cos(a);
      const py = cy + (r * g / 5) * Math.sin(a);
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.strokeStyle = 'rgba(139,92,246,0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = g % 2 === 0 ? 'rgba(237,233,254,0.3)' : 'transparent';
    ctx.fill();
  }
  angles.forEach(a => {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
    ctx.strokeStyle = 'rgba(139,92,246,0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();
  });
  ctx.beginPath();
  angles.forEach((a, i) => {
    const px = cx + (r * vals[i] / 100) * Math.cos(a);
    const py = cy + (r * vals[i] / 100) * Math.sin(a);
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  });
  ctx.closePath();
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  grad.addColorStop(0, 'rgba(139,92,246,0.5)');
  grad.addColorStop(1, 'rgba(236,72,153,0.3)');
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = '#8b5cf6';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  angles.forEach((a, i) => {
    const px = cx + (r * vals[i] / 100) * Math.cos(a);
    const py = cy + (r * vals[i] / 100) * Math.sin(a);
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#8b5cf6';
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.stroke();
  });
  ctx.font = '600 13px Noto Sans KR, sans-serif';
  ctx.fillStyle = '#2d1b69';
  ctx.textAlign = 'center';
  const lo = 28;
  angles.forEach((a, i) => {
    const px = cx + (r + lo) * Math.cos(a);
    const py = cy + (r + lo) * Math.sin(a) + 4;
    ctx.fillText(labels[i], px, py);
    ctx.font = '500 11px Noto Sans KR, sans-serif';
    ctx.fillStyle = '#8b5cf6';
    ctx.fillText(vals[i] + '%', px, py + 15);
    ctx.font = '600 13px Noto Sans KR, sans-serif';
    ctx.fillStyle = '#2d1b69';
  });
}

// ══════════════════════════════════════════════
// 화면 전환
// ══════════════════════════════════════════════
function showStep(stepId) {
  document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
  document.getElementById(stepId).classList.add('active');
}
function goBack() {
  showStep('stepUpload');
  resetShapes();
  removeImage();
  setLoadingProgress(0);
}

// ══════════════════════════════════════════════
// 인쇄 & PDF
// ══════════════════════════════════════════════
function printReport() { window.print(); }

async function downloadPDF() {
  window.print();
}


