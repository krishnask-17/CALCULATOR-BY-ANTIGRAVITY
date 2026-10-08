/**
 * OmniCalc — Next-Gen Precision Calculator
 * Robust mathematical parsing, audio feedback, scientific mode, memory & history management.
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- DOM Elements ---
  const mainDisplay = document.getElementById('main-display');
  const expressionDisplay = document.getElementById('expression-display');
  const livePreview = document.getElementById('live-preview');
  const angleModeChip = document.getElementById('angle-mode-chip');
  const memoryActiveChip = document.getElementById('memory-active-chip');
  const copyBtn = document.getElementById('copy-btn');
  const appWrapper = document.querySelector('.app-wrapper');
  
  // Controls
  const btnModeStd = document.getElementById('btn-mode-std');
  const btnModeSci = document.getElementById('btn-mode-sci');
  const soundToggle = document.getElementById('sound-toggle');
  const iconSoundOn = soundToggle.querySelector('.icon-sound-on');
  const iconSoundOff = soundToggle.querySelector('.icon-sound-off');
  const themeBtn = document.getElementById('theme-btn');
  const themeMenu = document.getElementById('theme-menu');
  const historyToggle = document.getElementById('history-toggle');
  const historyDrawer = document.getElementById('history-drawer');
  const historyList = document.getElementById('history-list');
  const historyCount = document.getElementById('history-count');
  const btnClearHistory = document.getElementById('btn-clear-history');
  const btnCloseHistory = document.getElementById('btn-close-history');
  const shortcutsToggle = document.getElementById('shortcuts-toggle');
  const shortcutsModal = document.getElementById('shortcuts-modal');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const toastNotify = document.getElementById('toast-notify');
  const toastMsg = document.getElementById('toast-msg');
  const btnDegRad = document.getElementById('btn-deg-rad');

  // Keypad
  const keypad = document.getElementById('keypad');

  // --- State ---
  let expression = '';
  let lastResult = null;
  let isResultEvaluated = false;
  let isDegreeMode = true; // true: DEG, false: RAD
  let memoryValue = 0;
  let soundEnabled = localStorage.getItem('omnicalc_sound') !== 'false';
  let history = JSON.parse(localStorage.getItem('omnicalc_history') || '[]');
  let audioCtx = null;

  // --- Sound Synthesizer (Web Audio API) ---
  function playClickSound(freq = 600, duration = 0.04) {
    if (!soundEnabled) return;
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + duration);

      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch {
      // AudioContext could be blocked if no user interaction yet
    }
  }

  // --- Auto-fit Display Font Size ---
  function adjustDisplayFontSize() {
    const textLength = mainDisplay.innerText.length;
    if (textLength > 18) {
      mainDisplay.style.fontSize = '1.35rem';
    } else if (textLength > 12) {
      mainDisplay.style.fontSize = '1.75rem';
    } else if (textLength > 8) {
      mainDisplay.style.fontSize = '2.2rem';
    } else {
      mainDisplay.style.fontSize = '2.75rem';
    }
  }

  // --- Toast Notification ---
  let toastTimer = null;
  function showToast(message) {
    toastMsg.innerText = message;
    toastNotify.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastNotify.classList.add('hidden');
    }, 2200);
  }

  // --- Mathematical Helper Functions ---
  function factorial(n) {
    if (n < 0 || Math.floor(n) !== n) return NaN;
    if (n === 0 || n === 1) return 1;
    if (n > 170) return Infinity; // JS Number overflow limit
    let res = 1;
    for (let i = 2; i <= n; i++) res *= i;
    return res;
  }

  // Sanitized & Safe Math Parser
  function evaluateMathExpression(rawExpr) {
    if (!rawExpr || rawExpr.trim() === '') return 0;

    let expr = rawExpr
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/−/g, '-')
      .replace(/π/g, 'Math.PI')
      .replace(/\be\b/g, 'Math.E');

    // Handle implicit multiplication: e.g. 2(3) -> 2*(3), 2Math.PI -> 2*Math.PI
    expr = expr.replace(/(\d)(\()/g, '$1*$2');
    expr = expr.replace(/(\))(\d)/g, '$1*$2');
    expr = expr.replace(/(\))(\()/g, '$1*$2');
    expr = expr.replace(/(\d)(Math\.PI|Math\.E)/g, '$1*$2');

    // Factorial operator: replace n! with factorial(n)
    expr = expr.replace(/(\d+(?:\.\d+)?)!/g, 'factorial($1)');

    // Exponents: convert ^ to JS native **
    expr = expr.replace(/\^/g, '**');

    // Square root: √(x) -> Math.sqrt(x) and √x -> Math.sqrt(x)
    expr = expr.replace(/√(\d+(?:\.\d+)?)/g, 'Math.sqrt($1)');
    expr = expr.replace(/√\(/g, 'Math.sqrt(');

    // Trigonometry Degree/Radian handling
    if (isDegreeMode) {
      expr = expr.replace(/asin\(([^)]+)\)/g, '(Math.asin($1)*(180/Math.PI))');
      expr = expr.replace(/acos\(([^)]+)\)/g, '(Math.acos($1)*(180/Math.PI))');
      expr = expr.replace(/atan\(([^)]+)\)/g, '(Math.atan($1)*(180/Math.PI))');

      expr = expr.replace(/sin\(([^)]+)\)/g, 'Math.sin(($1)*(Math.PI/180))');
      expr = expr.replace(/cos\(([^)]+)\)/g, 'Math.cos(($1)*(Math.PI/180))');
      expr = expr.replace(/tan\(([^)]+)\)/g, 'Math.tan(($1)*(Math.PI/180))');
    } else {
      expr = expr.replace(/asin\(/g, 'Math.asin(');
      expr = expr.replace(/acos\(/g, 'Math.acos(');
      expr = expr.replace(/atan\(/g, 'Math.atan(');

      expr = expr.replace(/sin\(/g, 'Math.sin(');
      expr = expr.replace(/cos\(/g, 'Math.cos(');
      expr = expr.replace(/tan\(/g, 'Math.tan(');
    }

    // Logarithms
    expr = expr.replace(/log\(/g, 'Math.log10(');
    expr = expr.replace(/ln\(/g, 'Math.log(');

    // Percentage: number% e.g. 50% -> (50/100)
    expr = expr.replace(/(\d+(?:\.\d+)?)%/g, '($1/100)');

    // Sanitize string to prevent execution of unauthorized code
    const sanitized = expr
      .replace(/Math\.(PI|E|sqrt|sin|cos|tan|asin|acos|atan|log10|log)/g, '')
      .replace(/factorial/g, '');
    if (!/^[0-9+\-*/()., !*]+$/.test(sanitized)) {
      throw new Error('Invalid Expression');
    }

    // Safe Function evaluation
    const evaluator = new Function('factorial', `return (${expr});`);
    const val = evaluator(factorial);

    if (typeof val !== 'number' || isNaN(val)) {
      throw new Error('Calculation Error');
    }
    if (!isFinite(val)) {
      throw new Error('Cannot divide by zero');
    }

    // Clean float rounding errors (e.g. 0.1 + 0.2 = 0.3)
    return formatResult(val);
  }

  function formatResult(num) {
    if (Math.abs(num) > 1e14 || (Math.abs(num) < 1e-7 && num !== 0)) {
      return Number(num.toPrecision(10)).toExponential();
    }
    return Number(Math.round(num + 'e+10') + 'e-10').toString();
  }

  // --- Display Updates & Live Preview ---
  function updateDisplays() {
    mainDisplay.innerText = expression || '0';
    adjustDisplayFontSize();

    // Compute live preview if expression has operators
    if (expression && /[+\-×÷^!%]/.test(expression) && !expression.endsWith('(')) {
      try {
        // Auto-close open parentheses for live preview
        let testExpr = expression;
        const openParens = (testExpr.match(/\(/g) || []).length;
        const closeParens = (testExpr.match(/\)/g) || []).length;
        if (openParens > closeParens) {
          testExpr += ')'.repeat(openParens - closeParens);
        }

        const previewVal = evaluateMathExpression(testExpr);
        livePreview.innerText = `= ${previewVal}`;
      } catch {
        livePreview.innerText = '';
      }
    } else {
      livePreview.innerText = '';
    }
  }

  // --- Actions ---
  function inputCharacter(char) {
    playClickSound(580);
    if (isResultEvaluated) {
      // If user presses an operator right after evaluation, chain the result
      if (['+', '-', '×', '÷', '^', '%'].includes(char)) {
        expression = lastResult.toString() + char;
      } else {
        expression = char;
      }
      isResultEvaluated = false;
    } else {
      if (expression === '0' && !isNaN(char)) {
        expression = char;
      } else {
        expression += char;
      }
    }
    updateDisplays();
  }

  function inputOperator(op) {
    playClickSound(720);
    if (isResultEvaluated) {
      expression = (lastResult !== null ? lastResult.toString() : '0') + op;
      isResultEvaluated = false;
    } else {
      if (expression === '') {
        if (op === '-') expression = '-';
        return;
      }
      const lastChar = expression.slice(-1);
      if (['+', '-', '×', '÷'].includes(lastChar)) {
        expression = expression.slice(0, -1) + op;
      } else {
        expression += op;
      }
    }
    updateDisplays();
  }

  function inputFunction(func) {
    playClickSound(650);
    if (isResultEvaluated) {
      if (func === '^2') {
        expression = `${lastResult}^2`;
      } else if (func === '!') {
        expression = `${lastResult}!`;
      } else {
        expression = func;
      }
      isResultEvaluated = false;
    } else {
      expression += func;
    }
    updateDisplays();
  }

  function handleBackspace() {
    playClickSound(480);
    if (isResultEvaluated) {
      clearAll();
      return;
    }
    if (expression.length > 0) {
      // If backspacing a function word like "sin(" or "log("
      const funcTokens = ['asin(', 'acos(', 'atan(', 'sin(', 'cos(', 'tan(', 'log(', 'ln(', '√('];
      let removed = false;
      for (const token of funcTokens) {
        if (expression.endsWith(token)) {
          expression = expression.slice(0, -token.length);
          removed = true;
          break;
        }
      }
      if (!removed) {
        expression = expression.slice(0, -1);
      }
    }
    updateDisplays();
  }

  function clearAll() {
    playClickSound(400);
    expression = '';
    expressionDisplay.innerText = '';
    livePreview.innerText = '';
    mainDisplay.innerText = '0';
    isResultEvaluated = false;
    adjustDisplayFontSize();
  }

  function toggleNegate() {
    playClickSound(550);
    if (isResultEvaluated) {
      expression = (-Number(lastResult)).toString();
      isResultEvaluated = false;
      updateDisplays();
      return;
    }
    if (expression === '' || expression === '0') return;

    // Negate the last entered number
    const match = expression.match(/([0-9.]+)$/);
    if (match) {
      const numStr = match[1];
      const startIdx = match.index;
      if (startIdx > 0 && expression[startIdx - 1] === '-') {
        // Remove preceding minus
        expression = expression.slice(0, startIdx - 1) + numStr;
      } else {
        expression = expression.slice(0, startIdx) + '(-' + numStr + ')';
      }
      updateDisplays();
    }
  }

  function calculateResult() {
    playClickSound(850, 0.08);
    if (!expression) return;

    try {
      // Auto-close any unclosed parentheses
      const openParens = (expression.match(/\(/g) || []).length;
      const closeParens = (expression.match(/\)/g) || []).length;
      if (openParens > closeParens) {
        expression += ')'.repeat(openParens - closeParens);
      }

      const evaluated = evaluateMathExpression(expression);
      expressionDisplay.innerText = `${expression} =`;
      
      // Save to history
      saveHistory(expression, evaluated);

      lastResult = evaluated;
      expression = evaluated.toString();
      mainDisplay.innerText = evaluated;
      livePreview.innerText = '';
      isResultEvaluated = true;
      adjustDisplayFontSize();
    } catch (err) {
      mainDisplay.innerText = err.message || 'Error';
      livePreview.innerText = '';
      isResultEvaluated = true;
    }
  }

  // --- History Management ---
  function saveHistory(expr, res) {
    const item = {
      id: Date.now(),
      expression: expr,
      result: res,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    history.unshift(item);
    if (history.length > 50) history.pop();
    localStorage.setItem('omnicalc_history', JSON.stringify(history));
    renderHistory();
  }

  function renderHistory() {
    historyCount.innerText = history.length;
    if (history.length === 0) {
      historyList.innerHTML = `
        <div class="empty-history-state">
          <div class="empty-icon">📜</div>
          <p>No calculations yet</p>
          <span>Calculations will appear here as you solve them.</span>
        </div>
      `;
      return;
    }

    historyList.innerHTML = '';
    history.forEach(item => {
      const card = document.createElement('div');
      card.className = 'history-item';
      card.innerHTML = `
        <span class="history-expr">${item.expression} =</span>
        <span class="history-result">${item.result}</span>
      `;
      card.addEventListener('click', () => {
        playClickSound(620);
        expression = item.result.toString();
        expressionDisplay.innerText = `Recall: ${item.expression}`;
        isResultEvaluated = false;
        updateDisplays();
        showToast('Restored result to display');
        historyDrawer.classList.add('hidden');
      });
      historyList.appendChild(card);
    });
  }

  function clearHistoryData() {
    playClickSound(400);
    history = [];
    localStorage.removeItem('omnicalc_history');
    renderHistory();
    showToast('History cleared');
  }

  // --- Memory Operations ---
  function updateMemoryIndicator() {
    if (memoryValue !== 0) {
      memoryActiveChip.classList.remove('hidden');
    } else {
      memoryActiveChip.classList.add('hidden');
    }
  }

  function handleMemory(action) {
    playClickSound(680);
    const currentVal = Number(mainDisplay.innerText) || 0;

    switch (action) {
      case 'mc':
        memoryValue = 0;
        showToast('Memory Cleared (0)');
        break;
      case 'mr':
        expression = memoryValue.toString();
        isResultEvaluated = false;
        updateDisplays();
        showToast(`Memory Recalled: ${memoryValue}`);
        break;
      case 'm+':
        memoryValue += currentVal;
        showToast(`Added to Memory: ${memoryValue}`);
        break;
      case 'm-':
        memoryValue -= currentVal;
        showToast(`Subtracted from Memory: ${memoryValue}`);
        break;
      case 'ms':
        memoryValue = currentVal;
        showToast(`Stored to Memory: ${memoryValue}`);
        break;
    }
    updateMemoryIndicator();
  }

  // --- Keypad Click Handling ---
  keypad.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;

    // Visual button feedback
    btn.classList.add('btn-pressed');
    setTimeout(() => btn.classList.remove('btn-pressed'), 120);

    const action = btn.dataset.action;
    const val = btn.dataset.val;

    switch (action) {
      case 'num':
      case 'dot':
        inputCharacter(val);
        break;
      case 'operator':
        inputOperator(val);
        break;
      case 'paren':
        inputCharacter(val);
        break;
      case 'func':
        inputFunction(val);
        break;
      case 'equals':
        calculateResult();
        break;
      case 'clear-all':
        clearAll();
        break;
      case 'backspace':
        handleBackspace();
        break;
      case 'negate':
        toggleNegate();
        break;
      case 'angle-toggle':
        isDegreeMode = !isDegreeMode;
        btnDegRad.innerText = isDegreeMode ? 'RAD' : 'DEG';
        angleModeChip.innerText = isDegreeMode ? 'DEG' : 'RAD';
        showToast(`Trig angle mode: ${isDegreeMode ? 'DEG' : 'RAD'}`);
        playClickSound(700);
        break;
    }
  });

  // Memory Bar Clicks
  document.querySelectorAll('.mem-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      handleMemory(btn.dataset.action);
    });
  });

  // --- Mode Toggle (Standard / Scientific) ---
  function setCalculatorMode(mode) {
    playClickSound(650);
    if (mode === 'sci') {
      appWrapper.classList.add('scientific-active');
      btnModeSci.classList.add('active');
      btnModeStd.classList.remove('active');
    } else {
      appWrapper.classList.remove('scientific-active');
      btnModeStd.classList.add('active');
      btnModeSci.classList.remove('active');
    }
  }

  btnModeStd.addEventListener('click', () => setCalculatorMode('std'));
  btnModeSci.addEventListener('click', () => setCalculatorMode('sci'));

  // --- Sound Toggle ---
  soundToggle.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    localStorage.setItem('omnicalc_sound', soundEnabled);
    if (soundEnabled) {
      iconSoundOn.classList.remove('hidden');
      iconSoundOff.classList.add('hidden');
      playClickSound(800);
      showToast('Sound Effects Enabled');
    } else {
      iconSoundOn.classList.add('hidden');
      iconSoundOff.classList.remove('hidden');
      showToast('Sound Effects Muted');
    }
  });

  if (!soundEnabled) {
    iconSoundOn.classList.add('hidden');
    iconSoundOff.classList.remove('hidden');
  }

  // --- Themes ---
  function applyTheme(themeName) {
    document.body.setAttribute('data-theme', themeName);
    localStorage.setItem('omnicalc_theme', themeName);
    document.querySelectorAll('.theme-opt').forEach(opt => {
      opt.classList.toggle('active', opt.dataset.themeVal === themeName);
    });
  }

  themeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    themeMenu.classList.toggle('hidden');
    playClickSound(600);
  });

  document.querySelectorAll('.theme-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      applyTheme(opt.dataset.themeVal);
      themeMenu.classList.add('hidden');
      playClickSound(750);
    });
  });

  document.addEventListener('click', (e) => {
    if (!themeBtn.contains(e.target) && !themeMenu.contains(e.target)) {
      themeMenu.classList.add('hidden');
    }
  });

  const savedTheme = localStorage.getItem('omnicalc_theme') || 'aurora';
  applyTheme(savedTheme);

  // --- History Drawer Toggle ---
  historyToggle.addEventListener('click', () => {
    historyDrawer.classList.toggle('hidden');
    playClickSound(550);
  });
  btnCloseHistory.addEventListener('click', () => {
    historyDrawer.classList.add('hidden');
  });
  btnClearHistory.addEventListener('click', clearHistoryData);

  // --- Shortcuts Modal ---
  shortcutsToggle.addEventListener('click', () => {
    shortcutsModal.classList.remove('hidden');
    playClickSound(550);
  });
  btnCloseModal.addEventListener('click', () => {
    shortcutsModal.classList.add('hidden');
  });
  shortcutsModal.addEventListener('click', (e) => {
    if (e.target === shortcutsModal) shortcutsModal.classList.add('hidden');
  });

  // --- Copy to Clipboard ---
  copyBtn.addEventListener('click', async () => {
    playClickSound(800);
    const textToCopy = mainDisplay.innerText;
    try {
      await navigator.clipboard.writeText(textToCopy);
      showToast(`Copied ${textToCopy} to clipboard`);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = textToCopy;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast(`Copied ${textToCopy} to clipboard`);
    }
  });

  // --- Keyboard Support ---
  window.addEventListener('keydown', (e) => {
    // Ignore keystrokes if typing inside inputs (not present here, but good practice)
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

    const key = e.key;

    // Helper to highlight matching button
    const highlightBtn = (selector) => {
      const btn = document.querySelector(selector);
      if (btn) {
        btn.classList.add('btn-pressed');
        setTimeout(() => btn.classList.remove('btn-pressed'), 120);
      }
    };

    if (/^[0-9]$/.test(key)) {
      e.preventDefault();
      highlightBtn(`[data-val="${key}"]`);
      inputCharacter(key);
    } else if (key === '.') {
      e.preventDefault();
      highlightBtn('#btn-dot');
      inputCharacter('.');
    } else if (key === '+') {
      e.preventDefault();
      highlightBtn('#btn-add');
      inputOperator('+');
    } else if (key === '-') {
      e.preventDefault();
      highlightBtn('#btn-sub');
      inputOperator('-');
    } else if (key === '*') {
      e.preventDefault();
      highlightBtn('#btn-mul');
      inputOperator('×');
    } else if (key === '/') {
      e.preventDefault();
      highlightBtn('#btn-div');
      inputOperator('÷');
    } else if (key === '%') {
      e.preventDefault();
      inputFunction('%');
    } else if (key === '^') {
      e.preventDefault();
      highlightBtn('#btn-pow');
      inputFunction('^');
    } else if (key === '(' || key === ')') {
      e.preventDefault();
      highlightBtn(`[data-val="${key}"]`);
      inputCharacter(key);
    } else if (key === 'Enter' || key === '=') {
      e.preventDefault();
      highlightBtn('#btn-equals');
      calculateResult();
    } else if (key === 'Backspace') {
      e.preventDefault();
      highlightBtn('#btn-del');
      handleBackspace();
    } else if (key === 'Escape' || key.toLowerCase() === 'c') {
      e.preventDefault();
      highlightBtn('#btn-clear');
      clearAll();
    } else if (key.toLowerCase() === 'h') {
      e.preventDefault();
      historyDrawer.classList.toggle('hidden');
    } else if (key.toLowerCase() === 's') {
      e.preventDefault();
      const isSci = appWrapper.classList.contains('scientific-active');
      setCalculatorMode(isSci ? 'std' : 'sci');
    }
  });

  // Initial setup
  renderHistory();
  updateDisplays();
});
