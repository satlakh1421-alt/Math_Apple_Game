// --- STATE MANAGEMENT TRACKERS ---
let score = 0;
let currentLevel = parseInt(localStorage.getItem('appleCatchSavedLevel')) || 1;
const maxLevels = 10;
let lives = 3;
let timeLeft = 60;
let currentAnswer = 0;
let currentQuestionId = 0;
let gameActive = false;
let isPaused = false;

// THE RANDOM BACKGROUND THEMES
const backgroundThemes = [
    "linear-gradient(180deg, #0f172a 0%, #1e1b4b 100%)",
    "linear-gradient(180deg, #111827 0%, #311042 100%)",
    "linear-gradient(180deg, #030712 0%, #064e3b 100%)",
    "linear-gradient(180deg, #0c4a6e 0%, #0f172a 100%)",
    "linear-gradient(180deg, #1e1b4b 0%, #4c1d95 100%)",
    "linear-gradient(180deg, #2e1065 0%, #831843 100%)",
    "linear-gradient(180deg, #1c1917 0%, #44403c 100%)",
    "linear-gradient(180deg, #0f172a 0%, #172554 100%)"
];

let gameSettings = { musicEnabled: true, sfxEnabled: true, difficulty: "Normal" };
let loopTimer = null;
let loopSpawn = null;

// --- UI NODES ---
const viewportContainer = document.getElementById('game-viewport');
const viewStart = document.getElementById('screen-start');
const viewGameplay = document.getElementById('screen-gameplay');
const viewScoreboard = document.getElementById('screen-scoreboard');
const rulesOverlay = document.getElementById('rules-overlay');
const settingsOverlay = document.getElementById('settings-overlay');

const btnMainPlay = document.getElementById('btn-main-play');
const btnMainRules = document.getElementById('btn-main-rules');
const btnMainSettings = document.getElementById('btn-main-settings');
const btnRulesClose = document.getElementById('btn-rules-close');
const btnSettingsSave = document.getElementById('btn-settings-save');
const btnBoardNext = document.getElementById('btn-board-next');
const btnBoardRetry = document.getElementById('btn-board-retry');
const btnToggleSound = document.getElementById('btn-toggle-sound');

const btnPauseGame = document.getElementById('btn-game-pause');
const btnPauseResume = document.getElementById('btn-pause-resume');
const btnPauseHome = document.getElementById('btn-pause-home');

const chkMusic = document.getElementById('chk-music');
const chkSFX = document.getElementById('chk-sfx');
const selDifficulty = document.getElementById('sel-difficulty');

const elScore = document.getElementById('txt-score');
const elLevel = document.getElementById('txt-level');
const elLives = document.getElementById('txt-lives');
const elTimer = document.getElementById('txt-timer');
const elQuestion = document.getElementById('txt-question');
const activeArena = document.getElementById('active-arena');

const txtBoardTitle = document.getElementById('txt-board-title');
const txtBoardDesc = document.getElementById('txt-board-desc');
const elFinalScore = document.getElementById('txt-final-score');
const elFinalLevel = document.getElementById('txt-final-level');
const starNodes = document.querySelectorAll('.star-node');

// --- SOUND MECHANICS ENGINE ---
const bgMusic = new Audio('music.mp3'); bgMusic.loop = true;
const sfxCorrect = new Audio('correct.mp3');
const sfxExplode = new Audio('wrong.mp3');

// --- UPGRADED PAUSE LOGIC WITH CSS FREEZE ---
function togglePause() {
    if (!gameActive) return;
    isPaused = !isPaused;

    const pauseOverlay = document.getElementById('pause-overlay');
    const allActiveApples = document.querySelectorAll('.falling-apple'); // Grab all apples currently on screen

    if (isPaused) {
        pauseOverlay.classList.remove('hidden');
        bgMusic.pause();

        // Freeze every apple right where it is
        allActiveApples.forEach(apple => {
            apple.style.animationPlayState = 'paused';
        });
    } else {
        pauseOverlay.classList.add('hidden');
        if (gameSettings.musicEnabled) bgMusic.play().catch(() => { });

        // Resume falling from the exact spot
        allActiveApples.forEach(apple => {
            apple.style.animationPlayState = 'running';
        });
    }
}

btnPauseGame.addEventListener('click', togglePause);
btnPauseResume.addEventListener('click', togglePause);
btnPauseHome.addEventListener('click', () => {
    togglePause();
    returnToMainMenu();
});

window.addEventListener('load', () => {
    if (gameSettings.musicEnabled && bgMusic.paused && !gameActive) {
        bgMusic.play().catch((err) => { });
    }
});

document.addEventListener('click', () => {
    if (gameSettings.musicEnabled && bgMusic.paused && !gameActive) {
        bgMusic.play().catch(() => { });
    }
}, { once: true });

// --- VIEW PORTS CONTROL MAPPINGS ---
btnMainRules.addEventListener('click', () => rulesOverlay.classList.remove('hidden'));
btnRulesClose.addEventListener('click', () => rulesOverlay.classList.add('hidden'));

btnMainSettings.addEventListener('click', () => {
    chkMusic.checked = gameSettings.musicEnabled;
    chkSFX.checked = gameSettings.sfxEnabled;
    selDifficulty.value = gameSettings.difficulty;
    settingsOverlay.classList.remove('hidden');
});

btnSettingsSave.addEventListener('click', () => {
    gameSettings.musicEnabled = chkMusic.checked;
    gameSettings.sfxEnabled = chkSFX.checked;
    gameSettings.difficulty = selDifficulty.value;

    btnToggleSound.innerText = gameSettings.musicEnabled ? "ON" : "OFF";
    btnToggleSound.classList.toggle('active', gameSettings.musicEnabled);

    if (!gameSettings.musicEnabled) bgMusic.pause(); else if (!gameActive) bgMusic.play().catch(() => { });
    settingsOverlay.classList.add('hidden');
});

btnToggleSound.addEventListener('click', (e) => {
    e.stopPropagation();
    gameSettings.musicEnabled = !gameSettings.musicEnabled;
    btnToggleSound.innerText = gameSettings.musicEnabled ? "ON" : "OFF";
    btnToggleSound.classList.toggle('active', gameSettings.musicEnabled);
    if (!gameSettings.musicEnabled) bgMusic.pause(); else bgMusic.play().catch(() => { });
});

btnMainPlay.addEventListener('click', () => {
    if (gameSettings.musicEnabled && bgMusic.paused) bgMusic.play().catch(() => { });
    switchPage(viewStart, viewGameplay);
    initiateGameLoop();
});

function switchPage(fromPage, toPage) { fromPage.classList.add('hidden'); toPage.classList.remove('hidden'); }

// --- ENGINE CALCULATION PIPELINES ---
function initiateGameLoop() { score = 0; lives = 3; executeStageSetup(); }

function generateMathQuestion() {
    currentQuestionId++;
    let num1 = 0, num2 = 0;
    if (currentLevel <= 2) {
        num1 = Math.floor(Math.random() * 5) + 1; num2 = Math.floor(Math.random() * 4) + 1; currentAnswer = num1 + num2; elQuestion.innerText = `${num1} + ${num2} = ?`;
    } else if (currentLevel <= 5) {
        num1 = Math.floor(Math.random() * 6) + 6; num2 = Math.floor(Math.random() * 5) + 1; currentAnswer = num1 - num2; elQuestion.innerText = `${num1} - ${num2} = ?`;
    } else {
        num1 = Math.floor(Math.random() * 10) + 5; num2 = Math.floor(Math.random() * 9) + 2;
        if (Math.random() > 0.5) { currentAnswer = num1 + num2; elQuestion.innerText = `${num1} + ${num2} = ?`; }
        else { currentAnswer = num1 - num2; elQuestion.innerText = `${num1} - ${num2} = ?`; }
    }
}

function executeStageSetup() {
    timeLeft = 60; activeArena.innerHTML = ""; gameActive = true; isPaused = false;
    document.getElementById('pause-overlay').classList.add('hidden');

    const randomTheme = backgroundThemes[Math.floor(Math.random() * backgroundThemes.length)];
    if (viewportContainer) viewportContainer.style.background = randomTheme;

    generateMathQuestion(); refreshHUD();
    clearInterval(loopTimer); clearInterval(loopSpawn);

    if (gameSettings.musicEnabled && bgMusic.paused) bgMusic.play().catch(() => { });

    loopTimer = setInterval(() => {
        if (!gameActive || isPaused) return;
        timeLeft--;
        elTimer.innerText = timeLeft + "s";
        if (timeLeft <= 0) handleStageClear();
    }, 1000);

    let dropIntervalSpeed = currentLevel === 10 ? 400 : Math.max(1600 - (currentLevel * 120), 600);
    loopSpawn = setInterval(() => {
        if (gameActive && !isPaused) generateAppleEntity();
    }, dropIntervalSpeed);
}

function generateAppleEntity() {
    if (!gameActive || isPaused) return;

    const apple = document.createElement('div');
    apple.classList.add('falling-apple');

    const myQuestionId = currentQuestionId;
    const targetAnswerForThisApple = currentAnswer;

    let isTarget = Math.random() > 0.5;
    let isRotten = false, isGolden = false;

    if (currentLevel >= 8 && Math.random() < 0.15) isGolden = true;
    else if (currentLevel >= 4 && !isTarget && Math.random() < 0.35) isRotten = true;

    let appleWeight = 0;
    if (isGolden) { apple.classList.add('golden-apple'); apple.innerText = "★20★"; }
    else if (isRotten) { apple.classList.add('rotten-apple'); appleWeight = Math.max(1, targetAnswerForThisApple + (Math.random() > 0.5 ? 2 : -2) + Math.floor(Math.random() * 3)); apple.innerText = "🤢 " + appleWeight; }
    else { appleWeight = isTarget ? targetAnswerForThisApple : Math.max(1, targetAnswerForThisApple + (Math.random() > 0.5 ? 2 : -2) + Math.floor(Math.random() * 3)); apple.innerText = appleWeight; }

    const isGenuinelyCorrect = !isGolden && !isRotten && (appleWeight === targetAnswerForThisApple);
    apple.style.left = Math.floor(Math.random() * (activeArena.clientWidth - 70)) + "px";

    if (currentLevel >= 7 && currentLevel < 10) apple.classList.add('windy-sway');

    let baseSpeedModifier = gameSettings.difficulty === "Easy" ? 1.5 : (gameSettings.difficulty === "Hard" ? -0.8 : 0);
    let dropDurationSpeed = currentLevel === 10 ? Math.max(1.4 + baseSpeedModifier, 0.9) : Math.max(4.5 - (currentLevel * 0.25) + baseSpeedModifier, 1.3);
    apple.style.animationDuration = dropDurationSpeed + "s";

    let processActive = true;
    apple.addEventListener('animationend', () => {
        if (processActive && !isGolden && gameActive && !isPaused) {
            if (myQuestionId === currentQuestionId && isGenuinelyCorrect) deductHealthMetrics();
        }
        apple.remove();
    });

    apple.addEventListener('click', () => {
        if (!processActive || !gameActive || isPaused) return;
        processActive = false;

        if (isGolden) { score += 20; triggerAudioFeedback(sfxCorrect); }
        else if (isRotten) { if (myQuestionId === currentQuestionId) deductHealthMetrics(); }
        else if (myQuestionId === currentQuestionId && isGenuinelyCorrect) { score += 20; triggerAudioFeedback(sfxCorrect); generateMathQuestion(); }
        else if (myQuestionId === currentQuestionId) deductHealthMetrics();

        apple.remove(); refreshHUD();
    });

    activeArena.appendChild(apple);
}

function deductHealthMetrics() { lives--; triggerAudioFeedback(sfxExplode); refreshHUD(); if (lives <= 0) terminateGameSession(false); }
function handleStageClear() { gameActive = false; clearInterval(loopTimer); clearInterval(loopSpawn); activeArena.innerHTML = ""; if (currentLevel >= maxLevels) terminateGameSession(true); else { switchPage(viewGameplay, viewScoreboard); txtBoardTitle.innerText = `🎉 STAGE ${currentLevel} CLEARED!`; txtBoardDesc.innerText = "Awesome calculation! Ready for the next stage?"; elFinalScore.innerText = score; elFinalLevel.innerText = currentLevel; btnBoardNext.innerText = "NEXT STAGE"; btnBoardNext.onclick = function () { currentLevel++; localStorage.setItem('appleCatchSavedLevel', currentLevel); lives = 3; switchPage(viewScoreboard, viewGameplay); executeStageSetup(); }; btnBoardRetry.innerText = "QUIT GAME"; btnBoardRetry.onclick = function () { currentLevel++; localStorage.setItem('appleCatchSavedLevel', currentLevel); lives = 3; returnToMainMenu(); }; if (lives === 3) activateStars(3); else activateStars(2); } }
function refreshHUD() { elScore.innerText = String(score).padStart(3, '0'); elLevel.innerText = `${String(currentLevel).padStart(2, '0')}/${maxLevels}`; elTimer.innerText = timeLeft + "s"; let healthHearts = ""; for (let i = 0; i < lives; i++) healthHearts += "❤️"; elLives.innerText = healthHearts || "☠️"; }
function triggerAudioFeedback(audioNode) { if (!gameSettings.sfxEnabled) return; try { audioNode.currentTime = 0; let playPromise = audioNode.play(); if (playPromise !== undefined) playPromise.catch(() => { }); } catch (err) { } }
function terminateGameSession(isVictory) { gameActive = false; clearInterval(loopTimer); clearInterval(loopSpawn); if (!isVictory) bgMusic.pause(); switchPage(viewGameplay, viewScoreboard); elFinalScore.innerText = score; if (isVictory) { txtBoardTitle.innerText = "🏆 GRAND CHAMPION!"; txtBoardDesc.innerText = "All levels beaten completely!"; elFinalLevel.innerText = currentLevel; btnBoardNext.innerText = "PLAY AGAIN"; btnBoardNext.onclick = function () { currentLevel = 1; localStorage.setItem('appleCatchSavedLevel', currentLevel); initiateGameLoop(); switchPage(viewScoreboard, viewGameplay); }; btnBoardRetry.innerText = "QUIT GAME"; btnBoardRetry.onclick = function () { currentLevel = 1; localStorage.setItem('appleCatchSavedLevel', currentLevel); returnToMainMenu(); }; if (score >= 1200) activateStars(3); else if (score >= 700) activateStars(2); else activateStars(1); } else { let originalLevel = currentLevel; if (currentLevel > 1) currentLevel--; localStorage.setItem('appleCatchSavedLevel', currentLevel); txtBoardTitle.innerText = "💥 GAME OVER"; txtBoardDesc.innerText = `Failed on Stage ${originalLevel}. Dropped to Stage ${currentLevel}!`; elFinalLevel.innerText = currentLevel; btnBoardNext.innerText = `RETRY STAGE ${currentLevel}`; btnBoardNext.onclick = function () { lives = 3; switchPage(viewScoreboard, viewGameplay); executeStageSetup(); }; btnBoardRetry.innerText = "QUIT GAME"; btnBoardRetry.onclick = function () { lives = 3; returnToMainMenu(); }; activateStars(0); } }
function returnToMainMenu() { 
    // 1. Reset variables and stop all background timers
    score = 0; 
    isPaused = false; 
    gameActive = false;
    clearInterval(loopTimer);
    clearInterval(loopSpawn);

    // 2. Hide both gameplay and scoreboard screens explicitly
    viewGameplay.classList.add('hidden');
    viewScoreboard.classList.add('hidden');
    
    // 3. Show the main start screen
    viewStart.classList.remove('hidden'); 
    
    // 4. Restart the music
    if (gameSettings.musicEnabled) { 
        bgMusic.currentTime = 0; 
        bgMusic.play().catch((err) => {
            console.error("Audio Error:", err);
        }); 
    } 
}function activateStars(count) { starNodes.forEach(node => { node.classList.remove('active'); node.classList.add('missing'); }); for (let i = 0; i < count; i++) { if (starNodes[i]) { starNodes[i].classList.remove('missing'); nodeDelayTrigger(starNodes[i], i * 200); } } }
function nodeDelayTrigger(element, delay) { setTimeout(() => { element.classList.add('active'); }, delay); }