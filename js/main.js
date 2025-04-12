// === DOM Elements ===
const startScreen = document.getElementById('start-screen');
const quizScreen = document.getElementById('quiz-screen');
const resultsScreen = document.getElementById('results-screen');
// Start Screen Buttons
const startPracticeSequentialBtn = document.getElementById('start-practice-sequential-btn');
const startPracticeRandomBtn = document.getElementById('start-practice-random-btn');
const mainQuizButtons = document.querySelectorAll('.main-quiz-btn'); // Get all main quiz buttons by class
const startTimeAttackBtn = document.getElementById('start-timeattack-btn');
// Quiz Screen Buttons
const nextQuestionBtn = document.getElementById('next-question-btn');
const backToStartBtn = document.getElementById('back-to-start-btn');
// Results Screen Buttons
const restartBtn = document.getElementById('restart-btn');
// High Score Display Area
const highScoresArea = document.getElementById('high-scores-area');

// === Global Variables ===
let allHamCupData = [];
let allPossibleQuestions = []; // Generate once on load
let currentQuizMode = ''; // 'practice', 'main', 'timeAttack'
let currentQuizLength = 0; // For main quiz (10, 30, ...)
let currentQuizTimeLimit = 0; // For time attack (e.g., 120)

// === Initialization ===
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed");
    setupEventListeners();
    loadHamCupData().then(() => {
        ui.displayHighScores(); // Load and display high scores after data is ready
    });
});

// === Event Listeners Setup ===
function setupEventListeners() {
    // Practice Modes
    startPracticeSequentialBtn.addEventListener('click', () => handlePracticeStart(false)); // false = don't shuffle
    startPracticeRandomBtn.addEventListener('click', () => handlePracticeStart(true));   // true = shuffle

    // Main Quiz Modes (Loop through all buttons)
    mainQuizButtons.forEach(button => {
        button.addEventListener('click', () => {
            const numQuestions = parseInt(button.dataset.questions, 10);
            handleMainQuizStart(numQuestions);
        });
    });

    // Time Attack Mode
    startTimeAttackBtn.addEventListener('click', () => {
        const timeLimit = parseInt(startTimeAttackBtn.dataset.time, 10);
        handleTimeAttackStart(timeLimit);
    });

    // Results Screen Button
    restartBtn.addEventListener('click', () => {
        quiz.resetQuizState();
        ui.showScreen('start-screen');
        ui.displayHighScores(); // Refresh high scores display
    });

    // Quiz Screen Buttons
    nextQuestionBtn.addEventListener('click', () => quiz.moveToNextQuestion());
    backToStartBtn.addEventListener('click', () => {
        // Removed the console log from here
        if (confirm("クイズを中断してトップに戻りますか？\n（中断したクイズのスコアは記録されません）")) {
             quiz.resetQuizState();
             ui.showScreen('start-screen');
             ui.displayHighScores(); // Refresh high scores display
        }
    });
}

// === Data Loading ===
async function loadHamCupData() {
    const allStartButtons = document.querySelectorAll('#start-screen button');
    allStartButtons.forEach(btn => btn.disabled = true);

    try {
        console.log("Fetching hamcups.json...");
        const response = await fetch('js/hamcups.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        allHamCupData = await response.json();
        console.log("HamCup data loaded:", allHamCupData);

        allPossibleQuestions = quiz.generateQuizQuestions(allHamCupData);
        console.log(`Total possible questions generated: ${allPossibleQuestions.length}`);

        if (allPossibleQuestions.length > 0) {
            startPracticeSequentialBtn.disabled = false;
            startPracticeSequentialBtn.textContent = '練習 (順番)';
            startPracticeRandomBtn.disabled = false;
            startPracticeRandomBtn.textContent = '練習 (ランダム)';
            mainQuizButtons.forEach(btn => {
                btn.disabled = false;
                btn.textContent = `${btn.dataset.questions}問`;
            });
            startTimeAttackBtn.disabled = false;
            startTimeAttackBtn.textContent = `タイムアタック (${startTimeAttackBtn.dataset.time / 60}分)`;
        } else {
             throw new Error("No questions could be generated from the data.");
        }

    } catch (error) {
        console.error("Could not initialize app:", error);
        alert(`アプリの初期化に失敗しました: ${error.message}`);
        allStartButtons.forEach(btn => {
             btn.textContent = '読込失敗';
             btn.disabled = true;
        });
    }
}

// === Quiz Start Handlers ===
function handlePracticeStart(shuffle) {
    if (allPossibleQuestions.length === 0) { alert("出題できる練習問題がありません。"); return; }
    currentQuizMode = 'practice';
    currentQuizLength = allPossibleQuestions.length;
    currentQuizTimeLimit = 0;
    const questions = shuffle ? quiz.shuffleArray([...allPossibleQuestions]) : allPossibleQuestions;
    startQuiz(questions);
}

function handleMainQuizStart(numQuestions) {
    if (allPossibleQuestions.length === 0) { alert("出題できる問題がありません。"); return; }
    currentQuizMode = 'main';
    currentQuizLength = numQuestions;
    currentQuizTimeLimit = 0;

    if (allPossibleQuestions.length < numQuestions) {
        console.warn(`Requested ${numQuestions} questions, but only ${allPossibleQuestions.length} available. Using all.`);
        currentQuizLength = allPossibleQuestions.length;
    }

    const mainQuizQuestions = selectRandomQuestions(allPossibleQuestions, currentQuizLength);
    if (mainQuizQuestions.length === 0) { alert("問題を選択できませんでした。"); return; }

    startQuiz(mainQuizQuestions);
}

function handleTimeAttackStart(timeLimit) {
     if (allPossibleQuestions.length === 0) { alert("出題できる問題がありません。"); return; }
     currentQuizMode = 'timeAttack';
     currentQuizLength = allPossibleQuestions.length;
     currentQuizTimeLimit = timeLimit;

     const timeAttackQuestions = quiz.shuffleArray([...allPossibleQuestions]);
     startQuiz(timeAttackQuestions);
}

// === Core Quiz Initiation ===
function startQuiz(questions) {
    // Removed excessive logs, kept the essential one
    console.log(`Starting ${currentQuizMode} quiz. Length/Limit: ${currentQuizMode === 'timeAttack' ? currentQuizTimeLimit + 's' : questions.length + 'q'}`);
    quiz.initQuiz(questions, currentQuizMode, currentQuizTimeLimit);
    ui.showScreen('quiz-screen');
    quiz.loadQuestion();
    // Removed "startQuiz function finished" log
}

// === High Score Handling (using Local Storage) ===
const HIGH_SCORE_PREFIX = 'hamCupHighScores_';

function getHighScoreKey() {
    if (currentQuizMode === 'main') {
        return `${HIGH_SCORE_PREFIX}main_${currentQuizLength}`;
    } else if (currentQuizMode === 'timeAttack') {
        return `${HIGH_SCORE_PREFIX}timeAttack_${currentQuizTimeLimit}`;
    }
    return null;
}

function loadHighScores(key) {
    try {
        const scoresJSON = localStorage.getItem(key);
        return scoresJSON ? JSON.parse(scoresJSON) : [];
    } catch (e) {
        console.error("Error loading high scores for key:", key, e);
        return [];
    }
}

function saveHighScores(key, scores) {
    try {
        scores.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            if (a.time !== undefined && b.time !== undefined) return a.time - b.time;
            return 0;
        });
        const topScores = scores.slice(0, 3);
        localStorage.setItem(key, JSON.stringify(topScores));
        console.log("High scores saved for key:", key, topScores);
    } catch (e) {
        console.error("Error saving high scores for key:", key, e);
    }
}

function maybeSaveHighScore(finalScore, timeTaken) {
    const key = getHighScoreKey();
    if (!key) return;

    const highScores = loadHighScores(key);
    const lowestTopScore = highScores.length < 3 ? -Infinity : highScores[2].score; // Use -Infinity for comparison
    const lowestTopTime = highScores.length < 3 ? Infinity : highScores[2].time; // Use Infinity for comparison

    let isHighScore = false;
    if (finalScore > lowestTopScore) {
        isHighScore = true;
    } else if (finalScore === lowestTopScore) {
        if (currentQuizMode === 'main' && timeTaken < lowestTopTime) {
            isHighScore = true; // Better time for same score in main mode
        } else if (currentQuizMode === 'timeAttack') {
             // For time attack, only score matters for top 3 threshold
             // (Could add secondary sort by name/date later if desired)
             isHighScore = true; // Allow saving if score equals lowest top score
        }
    }

    // Always allow saving if less than 3 scores exist
    if (highScores.length < 3) {
        isHighScore = true;
    }


    if (isHighScore) {
        setTimeout(() => {
            let userName = prompt(`ハイスコア達成！ (${finalScore}点) \nランキングに登録する名前を入力してください (10文字以内):`, "名無しさん");
            if (userName !== null) { // Check if user pressed OK (null means Cancel)
                userName = userName.substring(0, 10).trim();
                if (userName === "") userName = "名無しさん";

                const newScoreEntry = {
                    name: userName,
                    score: finalScore,
                    date: new Date().toLocaleDateString('ja-JP')
                };
                if (currentQuizMode === 'main') {
                    newScoreEntry.time = timeTaken;
                    newScoreEntry.total = currentQuizLength;
                } else {
                    newScoreEntry.timeLimit = currentQuizTimeLimit;
                }
                highScores.push(newScoreEntry);
                saveHighScores(key, highScores);
                ui.displayHighScores();
            } else {
                 console.log("User cancelled name prompt for high score.");
            }
        }, 100);
    }
}


// === Helper Function (Random Selection) ===
function selectRandomQuestions(sourceArray, count) {
    if (!sourceArray || sourceArray.length === 0) return [];
    const actualCount = Math.min(count, sourceArray.length);
    const shuffled = quiz.shuffleArray([...sourceArray]);
    return shuffled.slice(0, actualCount);
}