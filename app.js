// اردو محاورے سیکھیں - بچوں کا تعلیمی گیم
// گیم لاجک اور انجن (app.js)

// Game State variables
let gameState = {
  apiKey: "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", // Pre-loaded user API key
  stage: "easy",
  questions: [],
  currentIndex: 0,
  score: 0,
  timerValue: 10,
  timerInterval: null,
  canAnswer: true,
  answersHistory: [],
  audioCtx: null
};

// Colors representing stages
const stageColors = {
  easy: {
    primary: "#10b981",
    gradient: "linear-gradient(135deg, #059669, #10b981)"
  },
  medium: {
    primary: "#f59e0b",
    gradient: "linear-gradient(135deg, #d97706, #f59e0b)"
  },
  hard: {
    primary: "#8b5cf6",
    gradient: "linear-gradient(135deg, #7c3aed, #a78bfa)"
  }
};

// Shuffling helper
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// -------------------------------------------------------------
// Audio Synthesis (Web Audio API)
// -------------------------------------------------------------
function initAudio() {
  if (!gameState.audioCtx) {
    gameState.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (gameState.audioCtx.state === 'suspended') {
    gameState.audioCtx.resume();
  }
}

function playTone(freq, type, duration, volume, delay = 0) {
  try {
    initAudio();
    const osc = gameState.audioCtx.createOscillator();
    const gain = gameState.audioCtx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, gameState.audioCtx.currentTime + delay);
    
    gain.gain.setValueAtTime(volume, gameState.audioCtx.currentTime + delay);
    // Smooth decay
    gain.gain.exponentialRampToValueAtTime(0.00001, gameState.audioCtx.currentTime + delay + duration);
    
    osc.connect(gain);
    gain.connect(gameState.audioCtx.destination);
    
    osc.start(gameState.audioCtx.currentTime + delay);
    osc.stop(gameState.audioCtx.currentTime + delay + duration);
  } catch (e) {
    console.warn("Audio play failed:", e);
  }
}

function playClickSound() {
  playTone(800, 'sine', 0.1, 0.1);
}

function playTickSound() {
  playTone(1200, 'triangle', 0.05, 0.05);
}

function playCorrectSound() {
  // Dual tone chime
  playTone(523.25, 'sine', 0.15, 0.15); // C5
  playTone(659.25, 'sine', 0.3, 0.15, 0.08); // E5
}

function playWrongSound() {
  // Low buzz sliding down
  try {
    initAudio();
    const osc = gameState.audioCtx.createOscillator();
    const gain = gameState.audioCtx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, gameState.audioCtx.currentTime);
    osc.frequency.linearRampToValueAtTime(80, gameState.audioCtx.currentTime + 0.4);
    
    gain.gain.setValueAtTime(0.2, gameState.audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.0001, gameState.audioCtx.currentTime + 0.4);
    
    osc.connect(gain);
    gain.connect(gameState.audioCtx.destination);
    
    osc.start();
    osc.stop(gameState.audioCtx.currentTime + 0.4);
  } catch (e) {
    console.warn(e);
  }
}

function playVictorySound() {
  // Celebratory arpeggio
  const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C4, E4, G4, C5, E5, G5, C6
  notes.forEach((freq, index) => {
    playTone(freq, 'sine', 0.25, 0.12, index * 0.1);
  });
}

// -------------------------------------------------------------
// Confetti Effect (HTML5 Canvas Particles)
// -------------------------------------------------------------
const confettiCanvas = document.getElementById('confetti-canvas');
const ctx = confettiCanvas.getContext('2d');
let confettiParticles = [];
let confettiAnimationId = null;

function resizeConfettiCanvas() {
  const container = document.getElementById('app-container');
  confettiCanvas.width = container.clientWidth;
  confettiCanvas.height = container.clientHeight;
}

class ConfettiParticle {
  constructor(x, y, isBig = false) {
    this.x = x;
    this.y = y;
    this.size = Math.random() * (isBig ? 10 : 6) + 4;
    this.color = `hsl(${Math.random() * 360}, 90%, 60%)`;
    this.vx = (Math.random() - 0.5) * (isBig ? 15 : 6);
    this.vy = (Math.random() * -10) - (isBig ? 5 : 2);
    this.gravity = 0.3;
    this.rotation = Math.random() * 360;
    this.rotationSpeed = (Math.random() - 0.5) * 10;
    this.opacity = 1;
  }
  
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += this.gravity;
    this.rotation += this.rotationSpeed;
    this.opacity -= 0.015;
  }
  
  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate((this.rotation * Math.PI) / 180);
    ctx.fillStyle = this.color;
    ctx.globalAlpha = this.opacity;
    ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
    ctx.restore();
  }
}

function triggerConfettiBurst(isWinner = false) {
  resizeConfettiCanvas();
  const x = confettiCanvas.width / 2;
  const y = isWinner ? confettiCanvas.height / 2 : confettiCanvas.height - 50;
  
  const count = isWinner ? 120 : 40;
  for (let i = 0; i < count; i++) {
    confettiParticles.push(new ConfettiParticle(x, y, isWinner));
  }
  
  if (!confettiAnimationId) {
    animateConfetti();
  }
}

function animateConfetti() {
  ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  
  confettiParticles = confettiParticles.filter(p => p.opacity > 0);
  
  confettiParticles.forEach(p => {
    p.update();
    p.draw();
  });
  
  if (confettiParticles.length > 0) {
    confettiAnimationId = requestAnimationFrame(animateConfetti);
  } else {
    confettiAnimationId = null;
    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  }
}

// -------------------------------------------------------------
// Groq AI Urdu Teacher API Connection
// -------------------------------------------------------------
async function fetchAITeacherExplanation(idiom, meaning) {
  const url = "https://api.groq.com/openai/v1/chat/completions";
  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${gameState.apiKey}`
  };
  
  const systemPrompt = "آپ بچوں کے ایک پیارے، دوستانہ اور شفیق اردو استاد (اردو ماسٹر) ہیں۔ آپ کا کام بچوں کو اردو محاورات کے معنی، ان کے پیچھے چھپی دلچسپ کہانیاں، یا روزمرہ زندگی کی مثالیں نہایت آسان اور پیاری اردو زبان میں سمجھانا ہے۔ بچوں کو پیار سے مخاطب کریں (جیسے 'پیارے بچو!' یا 'میرے ننھے دوستو!')۔ اپنی گفتگو کو زیادہ سے زیادہ 3 سے 4 جملوں تک محدود رکھیں تاکہ بچے بور نہ ہوں۔";
  
  const userPrompt = `محاورہ: "${idiom}"۔ اس کا سادہ مطلب ہے: "${meaning}"۔ بچوں کے لیے ایک نہایت دلچسپ، مختصر اور سبق آموز تشریح لکھیں جس میں ایک چھوٹی سی مثال یا کہانی شامل ہو۔`;

  const payload = {
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    temperature: 0.7,
    max_tokens: 400
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(`API returned status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error("Error fetching AI Teacher explanation:", error);
    // Offline / Fail fallback in Urdu
    return `ارے پیارے بچوں! لگتا ہے انٹرنیٹ یا استاد جی کی کتابوں میں کچھ گڑبڑ ہو گئی ہے۔ لیکن پریشان نہ ہوں! اس پیارے محاورے کا مطلب ہے: "${meaning}"۔ یعنی جب ہم کسی بات یا واقعے کو اس کے اصل الفاظ کی بجائے خوبصورت انداز میں پیش کرنا چاہیں تو محاورے کا استعمال کرتے ہیں۔ اگلی بار میں آپ کو اس کی لمبی کہانی سناؤں گا!`;
  }
}

// -------------------------------------------------------------
// Core Game Logic Controllers
// -------------------------------------------------------------
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');
  playClickSound();
}

function loadSettings() {
  const savedKey = localStorage.getItem("groq_idiom_api_key");
  if (savedKey) {
    gameState.apiKey = savedKey;
    document.getElementById("api-key-input").value = savedKey;
  } else {
    document.getElementById("api-key-input").value = gameState.apiKey;
  }
}

function saveSettings() {
  const newKey = document.getElementById("api-key-input").value.trim();
  if (newKey) {
    gameState.apiKey = newKey;
    localStorage.setItem("groq_idiom_api_key", newKey);
  }
  document.getElementById("settings-panel").classList.remove("active");
  playClickSound();
}

function startGame(stage) {
  initAudio();
  gameState.stage = stage;
  gameState.score = 0;
  gameState.currentIndex = 0;
  gameState.answersHistory = [];
  
  // Dynamic color configuration based on stage
  const theme = stageColors[stage];
  document.getElementById("progress-bar-fill").style.background = theme.gradient;
  
  // Set stage labels
  let stageLabelText = "آسان";
  if (stage === "medium") stageLabelText = "میڈیم";
  if (stage === "hard") stageLabelText = "ہارڈ";
  document.getElementById("current-stage-lbl").innerText = stageLabelText;
  document.getElementById("current-stage-lbl").style.color = theme.primary;
  
  // Load and shuffle questions
  // We have 22 questions per stage, we shuffle and play 20 questions!
  const rawQuestions = IDIOM_BANK[stage];
  const shuffled = shuffleArray([...rawQuestions]);
  gameState.questions = shuffled.slice(0, 20); // Pick 20 questions
  
  showScreen("game-screen");
  loadQuestion();
}

function loadQuestion() {
  if (gameState.autoNextTimeout) {
    clearTimeout(gameState.autoNextTimeout);
    gameState.autoNextTimeout = null;
  }

  if (gameState.currentIndex >= gameState.questions.length) {
    endGame();
    return;
  }
  
  gameState.canAnswer = true;
  gameState.timerValue = 10;
  
  // Reset Timer circle visual representation
  const timerCircle = document.getElementById("timer-circle");
  const theme = stageColors[gameState.stage];
  timerCircle.style.stroke = theme.primary;
  timerCircle.style.strokeDashoffset = 0;
  document.getElementById("timer-sec").innerText = "10";
  
  // Update score and progress labels
  document.getElementById("score-val").innerText = gameState.score;
  document.getElementById("q-number").innerText = (gameState.currentIndex + 1);
  
  const progressPercent = ((gameState.currentIndex) / gameState.questions.length) * 100;
  document.getElementById("progress-bar-fill").style.width = `${progressPercent}%`;
  
  const currentQ = gameState.questions[gameState.currentIndex];
  document.getElementById("idiom-text").innerText = currentQ.idiom;
  
  // Render options (A, B, C / الف، ب، ج)
  const optionLetters = ["الف", "ب", "ج"];
  const optionsBox = document.getElementById("options-box");
  optionsBox.innerHTML = "";
  
  currentQ.options.forEach((opt, idx) => {
    const btn = document.createElement("button");
    btn.className = "option-btn";
    btn.innerHTML = `
      <span>${opt}</span>
      <span class="option-badge">${optionLetters[idx]}</span>
    `;
    btn.addEventListener("click", () => handleAnswer(idx));
    optionsBox.appendChild(btn);
  });
  
  // Hide feedback container
  document.getElementById("feedback-container").style.display = "none";
  
  // Start countdown
  startTimer();
}

function startTimer() {
  if (gameState.timerInterval) clearInterval(gameState.timerInterval);
  
  gameState.timerInterval = setInterval(() => {
    gameState.timerValue--;
    document.getElementById("timer-sec").innerText = gameState.timerValue;
    
    // Animate circular progress
    const timerCircle = document.getElementById("timer-circle");
    const dashOffset = 157 - (157 * gameState.timerValue) / 10;
    timerCircle.style.strokeDashoffset = dashOffset;
    
    if (gameState.timerValue <= 3) {
      timerCircle.style.stroke = "#ef4444"; // turns red when time is low
    }
    
    if (gameState.timerValue > 0) {
      playTickSound();
    } else {
      clearInterval(gameState.timerInterval);
      handleTimeout();
    }
  }, 1000);
}

function handleAnswer(selectedIndex) {
  if (!gameState.canAnswer) return;
  gameState.canAnswer = false;
  clearInterval(gameState.timerInterval);
  
  const currentQ = gameState.questions[gameState.currentIndex];
  const isCorrect = (selectedIndex === currentQ.answer);
  const optionButtons = document.querySelectorAll(".option-btn");
  
  optionButtons.forEach(btn => btn.disabled = true);
  
  if (isCorrect) {
    gameState.score++;
    document.getElementById("score-val").innerText = gameState.score;
    optionButtons[selectedIndex].classList.add("correct");
    playCorrectSound();
    triggerConfettiBurst(false);
  } else {
    optionButtons[selectedIndex].classList.add("wrong");
    optionButtons[currentQ.answer].classList.add("correct"); // Show the correct one
    playWrongSound();
  }
  
  // Save to history for final review screen
  gameState.answersHistory.push({
    idiom: currentQ.idiom,
    selectedAnswer: currentQ.options[selectedIndex],
    correctAnswer: currentQ.options[currentQ.answer],
    isCorrect: isCorrect,
    meaning: currentQ.meaning
  });
  
  showFeedback(isCorrect, currentQ.meaning);

  // Schedule automatic transition to the next question after 3 seconds
  gameState.autoNextTimeout = setTimeout(() => {
    const teacherModal = document.getElementById("teacher-modal");
    if (!teacherModal.classList.contains("active")) {
      nextQuestion();
    }
  }, 3000);
}

function handleTimeout() {
  if (!gameState.canAnswer) return;
  gameState.canAnswer = false;
  
  const currentQ = gameState.questions[gameState.currentIndex];
  const optionButtons = document.querySelectorAll(".option-btn");
  optionButtons.forEach(btn => btn.disabled = true);
  
  // Highlight the correct one
  optionButtons[currentQ.answer].classList.add("correct");
  playWrongSound();
  
  gameState.answersHistory.push({
    idiom: currentQ.idiom,
    selectedAnswer: "وقت ختم ہو گیا",
    correctAnswer: currentQ.options[currentQ.answer],
    isCorrect: false,
    meaning: currentQ.meaning
  });
  
  showFeedback(false, `وقت ختم ہو گیا! اس کا درست جواب تھا: "${currentQ.options[currentQ.answer]}"۔`);

  // Schedule automatic transition to the next question after 3 seconds
  gameState.autoNextTimeout = setTimeout(() => {
    const teacherModal = document.getElementById("teacher-modal");
    if (!teacherModal.classList.contains("active")) {
      nextQuestion();
    }
  }, 3000);
}

function showFeedback(isCorrect, meaning) {
  const panel = document.getElementById("feedback-container");
  const statusLbl = document.getElementById("feedback-status");
  const meaningLbl = document.getElementById("feedback-meaning");
  
  if (isCorrect) {
    statusLbl.innerText = "شاباش! بالکل درست جواب۔ 🎉";
    statusLbl.className = "feedback-status is-correct";
  } else {
    statusLbl.innerText = "اوہو! یہ جواب درست نہیں تھا۔ 🥺";
    statusLbl.className = "feedback-status is-wrong";
  }
  
  meaningLbl.innerHTML = `<strong>مطلب:</strong> ${meaning}`;
  panel.style.display = "block";
}

function nextQuestion() {
  gameState.currentIndex++;
  loadQuestion();
}

function endGame() {
  clearInterval(gameState.timerInterval);
  
  // Update progress bar to full at the end of the round
  document.getElementById("progress-bar-fill").style.width = "100%";
  
  // Render results
  document.getElementById("final-score-val").innerText = gameState.score;
  document.getElementById("total-q-val").innerText = gameState.questions.length;
  
  // Custom badges and titles based on performance
  const percentage = (gameState.score / gameState.questions.length) * 100;
  let trophy = "🏆";
  let performanceBadge = "محاوروں کے بادشاہ! 👑";
  let message = "آپ کا دماغ تو واقعی کمال کا ہے!";
  
  if (percentage >= 90) {
    trophy = "🏆";
    performanceBadge = "محاوروں کے بادشاہ! 👑";
    message = "زبردست! آپ نے تو تمام محاورے درست بتائے۔";
  } else if (percentage >= 70) {
    trophy = "🌟";
    performanceBadge = "محاورہ ماسٹر! 🎓";
    message = "بہت اچھا کھیلے! آپ اردو زبان میں بہت ماہر ہیں۔";
  } else if (percentage >= 50) {
    trophy = "🥈";
    performanceBadge = "شاندار کوشش! 👏";
    message = "شاباش! کچھ اور مشق کر کے آپ چیمپئن بن سکتے ہیں۔";
  } else {
    trophy = "📚";
    performanceBadge = "سیکھنے والا راہی! 🌱";
    message = "کوئی بات نہیں! ہار جیت تو ہوتی رہتی ہے، دوبارہ کوشش کریں!";
  }
  
  document.getElementById("trophy").innerText = trophy;
  document.getElementById("results-badge").innerText = performanceBadge;
  document.getElementById("results-msg").innerText = message;
  
  // Sound fanfare
  if (percentage >= 70) {
    playVictorySound();
    triggerConfettiBurst(true);
  } else {
    playTone(330, 'sine', 0.2, 0.15); // Simple chime
  }
  
  // Render detailed review list
  const reviewList = document.getElementById("review-list");
  reviewList.innerHTML = "";
  
  gameState.answersHistory.forEach(item => {
    const div = document.createElement("div");
    div.className = `review-item ${item.isCorrect ? 'is-correct' : 'is-wrong'}`;
    
    // Safely escape quotes for JS function call in HTML string
    const escapedIdiom = item.idiom.replace(/'/g, "\\'");
    const escapedMeaning = item.meaning.replace(/'/g, "\\'");
    
    div.innerHTML = `
      <div class="review-info" style="flex-grow: 1;">
        <span class="review-idiom">${item.idiom}</span>
        <span class="review-meaning">معنی: ${item.meaning}</span>
      </div>
      <div style="display: flex; align-items: center; gap: 8px; direction: ltr;">
        <span class="review-badge">${item.isCorrect ? '✅' : '❌'}</span>
        <button class="review-explain-btn" onclick="explainFromReview('${escapedIdiom}', '${escapedMeaning}')" title="استاد کی تشریح">👨‍🏫</button>
      </div>
    `;
    reviewList.appendChild(div);
  });
  
  showScreen("result-screen");
}

// -------------------------------------------------------------
// Interactive AI Teacher Drawer
// -------------------------------------------------------------
function openTeacherExplanation() {
  if (gameState.autoNextTimeout) {
    clearTimeout(gameState.autoNextTimeout);
    gameState.autoNextTimeout = null;
  }

  const currentQ = gameState.questions[gameState.currentIndex];
  const teacherModal = document.getElementById("teacher-modal");
  const chatBox = document.getElementById("chat-box");
  
  teacherModal.classList.add("active");
  playClickSound();
  
  // Clear previous chat items
  chatBox.innerHTML = "";
  
  // Add children greetings or system status
  const userBubble = document.createElement("div");
  userBubble.className = "chat-bubble user";
  userBubble.innerText = `استاد جی! مجھے محاورہ "${currentQ.idiom}" کے بارے میں کچھ کہانی سنائیں نا۔`;
  chatBox.appendChild(userBubble);
  
  // Loading bubble
  const loadingBubble = document.createElement("div");
  loadingBubble.className = "chat-bubble teacher loading";
  loadingBubble.innerHTML = `
    <div class="dot"></div>
    <div class="dot"></div>
    <div class="dot"></div>
  `;
  chatBox.appendChild(loadingBubble);
  chatBox.scrollTop = chatBox.scrollHeight;
  
  // Call API
  fetchAITeacherExplanation(currentQ.idiom, currentQ.meaning).then(explanationText => {
    // Remove loading bubble
    loadingBubble.remove();
    
    // Add teacher response
    const teacherBubble = document.createElement("div");
    teacherBubble.className = "chat-bubble teacher";
    teacherBubble.innerText = explanationText;
    chatBox.appendChild(teacherBubble);
    chatBox.scrollTop = chatBox.scrollHeight;
    
    // Synthesize teacher voice/chime when speaking is completed
    playTone(523.25, 'sine', 0.1, 0.05, 0);
    playTone(659.25, 'sine', 0.1, 0.05, 0.08);
  });
}

function closeTeacherExplanation() {
  document.getElementById("teacher-modal").classList.remove("active");
  playClickSound();

  // If we were playing the game and the user has already answered,
  // transition to the next question automatically upon closing the teacher's modal
  const gameScreen = document.getElementById("game-screen");
  if (gameScreen.classList.contains("active") && !gameState.canAnswer) {
    nextQuestion();
  }
}

// Custom handler to explain idioms from the final review board
window.explainFromReview = function(idiom, meaning) {
  const teacherModal = document.getElementById("teacher-modal");
  const chatBox = document.getElementById("chat-box");
  
  teacherModal.classList.add("active");
  playClickSound();
  
  // Clear previous chat items
  chatBox.innerHTML = "";
  
  // Add children request
  const userBubble = document.createElement("div");
  userBubble.className = "chat-bubble user";
  userBubble.innerText = `استاد جی! مجھے محاورہ "${idiom}" کی تفصیلی کہانی یا تشریح بتائیں۔`;
  chatBox.appendChild(userBubble);
  
  // Loading bubble
  const loadingBubble = document.createElement("div");
  loadingBubble.className = "chat-bubble teacher loading";
  loadingBubble.innerHTML = `
    <div class="dot"></div>
    <div class="dot"></div>
    <div class="dot"></div>
  `;
  chatBox.appendChild(loadingBubble);
  chatBox.scrollTop = chatBox.scrollHeight;
  
  // Call API
  fetchAITeacherExplanation(idiom, meaning).then(explanationText => {
    loadingBubble.remove();
    
    // Add teacher response
    const teacherBubble = document.createElement("div");
    teacherBubble.className = "chat-bubble teacher";
    teacherBubble.innerText = explanationText;
    chatBox.appendChild(teacherBubble);
    chatBox.scrollTop = chatBox.scrollHeight;
    
    // Play sound chimes
    playTone(523.25, 'sine', 0.1, 0.05, 0);
    playTone(659.25, 'sine', 0.1, 0.05, 0.08);
  });
}

// -------------------------------------------------------------
// Setup Event Listeners on Load
// -------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  // Load settings/API key
  loadSettings();
  
  // Start screen active by default
  document.getElementById("start-screen").classList.add("active");
  
  // Navigation / Action event bindings
  document.querySelectorAll(".stage-card").forEach(card => {
    card.addEventListener("click", () => {
      const stage = card.getAttribute("data-stage");
      startGame(stage);
    });
  });
  
  document.getElementById("btn-next-question").addEventListener("click", nextQuestion);
  document.getElementById("btn-ask-teacher").addEventListener("click", openTeacherExplanation);
  document.getElementById("close-teacher-btn").addEventListener("click", closeTeacherExplanation);
  
  document.getElementById("btn-restart").addEventListener("click", () => {
    showScreen("start-screen");
  });
  
  document.getElementById("open-settings-btn").addEventListener("click", () => {
    document.getElementById("settings-panel").classList.add("active");
    playClickSound();
  });
  
  document.getElementById("close-settings-btn").addEventListener("click", () => {
    document.getElementById("settings-panel").classList.remove("active");
    playClickSound();
  });
  
  document.getElementById("save-settings-btn").addEventListener("click", saveSettings);
  
  // Close modals when clicking outside contents
  window.addEventListener("click", (e) => {
    const settingsPanel = document.getElementById("settings-panel");
    if (e.target === settingsPanel) {
      settingsPanel.classList.remove("active");
    }
  });
});
