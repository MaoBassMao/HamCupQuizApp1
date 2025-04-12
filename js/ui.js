// UIの更新（画面表示切り替え、問題・結果表示、ハイスコア表示など）
const ui = {
    // DOM要素
    startScreen: document.getElementById('start-screen'),
    quizScreen: document.getElementById('quiz-screen'),
    resultsScreen: document.getElementById('results-screen'),
    questionCounter: document.getElementById('question-counter'),
    timerDisplay: document.getElementById('timer'), // タイマー表示用
    quizImage: document.getElementById('quiz-image'),
    questionText: document.getElementById('question-text'),
    answerOptionsContainer: document.getElementById('answer-options'),
    feedbackText: document.getElementById('feedback-text'),
    infoImage: document.getElementById('info-image'), // 詳細情報用
    nextQuestionBtn: document.getElementById('next-question-btn'),
    scoreDisplay: document.getElementById('score'),
    timeTakenDisplay: document.getElementById('time-taken'),
    resultsDetailsContainer: document.getElementById('results-details'),
    highScoresArea: document.getElementById('high-scores-area'), // ハイスコア表示エリア

    // スクリーン表示切り替え (完全版)
    showScreen(screenId) {
        // Removed internal debug logs from previous step
        const screens = document.querySelectorAll('.screen');
        screens.forEach(screen => {
            if (screen.id === screenId) {
                screen.classList.add('active');
            } else {
                screen.classList.remove('active');
            }
        });
    },

    // 問題表示 (タイマー表示部分にログ追加 - 完全版)
    displayQuestion(questionData, currentNum, totalNum, mode) {
        this.feedbackText.textContent = ''; this.feedbackText.className = '';
        this.infoImage.style.display = 'none'; this.infoImage.src = '';
        this.nextQuestionBtn.style.display = 'none';

        const questionTotalDisplay = (mode === 'timeAttack') ? '∞' : totalNum;
        this.questionCounter.textContent = `問題 ${currentNum} / ${questionTotalDisplay}`;

        // ▼▼▼ タイマー表示ロジック (ログ追加) ▼▼▼
        // quiz オブジェクトとそのプロパティが存在するか確認
        const timeLimit = (typeof quiz !== 'undefined' && quiz.timeLimit !== undefined) ? quiz.timeLimit : 0;
        const shouldShowTimer = timeLimit > 0;
        // Check if timerDisplay element exists before setting style
        if (this.timerDisplay) {
            this.timerDisplay.style.display = shouldShowTimer ? 'block' : 'none';
            console.log(`>>> displayQuestion: quiz.timeLimit=${timeLimit}, Setting timer display to: ${this.timerDisplay.style.display}`); // ★ デバッグログ ★
            if (!shouldShowTimer) { this.updateTimerDisplay(null); } // 他のモード用にクリア
        } else {
            console.error("Timer display element (#timer) not found!");
        }
        // ▲▲▲ タイマー表示ロジック (ログ追加) ▲▲▲


        if (questionData.image) {
            if (this.quizImage) {
                 this.quizImage.src = questionData.image; this.quizImage.style.display = 'block';
                 this.quizImage.onerror = () => { this.quizImage.alt = '画像読込失敗'; this.quizImage.style.display = 'none'; };
                 this.quizImage.alt = `HamCup ${questionData?.originalData?.name || ''} Image`;
             }
        } else {
             if(this.quizImage) { this.quizImage.style.display = 'none'; this.quizImage.src = ''; this.quizImage.alt = ''; }
        }

        if(this.questionText) { this.questionText.textContent = questionData.text; }

        if(this.answerOptionsContainer) {
            this.answerOptionsContainer.innerHTML = '';
             if (!questionData.choices || questionData.choices.length === 0) { this.answerOptionsContainer.innerHTML = '<p>選択肢の生成に失敗しました。</p>'; return; }
            questionData.choices.forEach(choice => {
                const button = document.createElement('button'); button.textContent = choice; button.classList.add('answer-btn');
                button.addEventListener('click', () => { this.disableAnswerButtons(); quiz.submitAnswer(choice); });
                this.answerOptionsContainer.appendChild(button);
            });
        }
    },

    // 回答ボタン無効化 (完全版)
    disableAnswerButtons() {
        if (this.answerOptionsContainer) {
            const buttons = this.answerOptionsContainer.querySelectorAll('.answer-btn');
            buttons.forEach(button => { button.disabled = true; button.classList.add('disabled'); });
        }
    },

    // 正誤フィードバック表示 (練習モード用) - デバッグログ追加版
    displayFeedback(isCorrect, correctAnswer, infoImageUrl) {
        console.log("--- displayFeedback called ---"); // ★ 追加 ★
        if(this.feedbackText) {
            this.feedbackText.textContent = isCorrect ? '正解！' : `不正解... 正解は: ${correctAnswer}`;
            this.feedbackText.className = isCorrect ? 'correct' : 'incorrect';
        }

        const currentQuestionData = quiz.getCurrentQuestion();
        console.log("displayFeedback: Current question data:", currentQuestionData); // ★ 追加 ★
        if (currentQuestionData) {
             const correctImageToShow = currentQuestionData.answerImage || currentQuestionData.image;
             console.log(`displayFeedback: Image path determined for #quiz-image: ${correctImageToShow}`); // ★ 追加 ★
             if (correctImageToShow && this.quizImage) {
                 console.log("displayFeedback: Attempting to set #quiz-image src..."); // ★ 追加 ★
                 this.quizImage.src = correctImageToShow;
                 this.quizImage.alt = `正解: ${currentQuestionData.correctAnswer || ''} の画像`;
                 this.quizImage.style.display = 'block';
                 console.log("displayFeedback: Set #quiz-image src to:", this.quizImage.src); // ★ 追加 ★
                 this.quizImage.onerror = () => { console.error(`displayFeedback: ERROR loading image for #quiz-image: ${correctImageToShow}`); this.quizImage.alt = '画像読込失敗'; this.quizImage.style.display = 'none'; };
                 this.quizImage.onload = () => { console.log(`displayFeedback: Successfully loaded image for #quiz-image: ${correctImageToShow}`); };
             } else {
                 console.log("displayFeedback: No correctImageToShow for #quiz-image or element missing."); // ★ 追加 ★
                 if(this.quizImage) this.quizImage.style.display = 'none';
             }
         } else {
             console.warn("displayFeedback: Could not get currentQuestionData."); // ★ 追加 ★
         }

        if (infoImageUrl && this.infoImage) {
            console.log(`displayFeedback: Setting #info-image src to: ${infoImageUrl}`); // ★ 追加 ★
            this.infoImage.src = infoImageUrl;
            this.infoImage.style.display = 'block';
            this.infoImage.onerror = () => { this.infoImage.style.display = 'none'; this.infoImage.alt = '情報画像読込失敗'; };
            this.infoImage.alt = `詳細情報: ${correctAnswer}`;
        } else {
            console.log("displayFeedback: No infoImageUrl provided or element missing."); // ★ 追加 ★
            if(this.infoImage) { this.infoImage.style.display = 'none'; this.infoImage.src = ''; this.infoImage.alt = ''; }
        }

        if(this.answerOptionsContainer){
            const buttons = this.answerOptionsContainer.querySelectorAll('.answer-btn');
            buttons.forEach(button => { if (button.textContent === correctAnswer) button.classList.add('correct'); });
        }
        console.log("--- displayFeedback finished ---"); // ★ 追加 ★
    },

    // 次へボタン表示 (完全版)
    showNextButton() {
        if(this.nextQuestionBtn) { this.nextQuestionBtn.style.display = 'inline-block'; }
    },

    // タイマー表示更新 (ログ追加版)
    updateTimerDisplay(seconds) {
         console.log(`>>> updateTimerDisplay called with seconds: ${seconds}`); // ★ デバッグログ ★
         if (!this.timerDisplay) return; // 要素がなければ何もしない

         if (seconds === null || typeof seconds === 'undefined' || seconds < 0) {
             this.timerDisplay.textContent = '';
             console.log(`>>> updateTimerDisplay: Cleared timer text.`); // ★ デバッグログ ★
             return;
         }
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        const timerText = `残り時間: ${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
        this.timerDisplay.textContent = timerText;
         console.log(`>>> updateTimerDisplay: Set text to: "${timerText}"`); // ★ デバッグログ ★
    },

    // 結果表示 (完全版)
    displayResults(score, attemptedQuestionsCount, mode, timeTaken, userAnswers) {
        if(this.scoreDisplay) {
            let scoreText = `スコア: ${score}`;
            if (mode === 'main') { scoreText += ` / ${attemptedQuestionsCount}`; }
            else if (mode === 'timeAttack') { scoreText += ` 点 (${quiz.timeLimit}秒)`; }
            else { scoreText += ` / ${attemptedQuestionsCount}`; }
            this.scoreDisplay.textContent = scoreText;
        }

        if(this.timeTakenDisplay){
            if (mode === 'main') {
                 const minutes = Math.floor(timeTaken / 60); const seconds = timeTaken % 60;
                 this.timeTakenDisplay.textContent = `解答時間: ${minutes}分 ${seconds}秒`;
                 this.timeTakenDisplay.style.display = 'block';
            } else {
                 this.timeTakenDisplay.style.display = 'none';
            }
        }

        if(this.resultsDetailsContainer) {
            this.resultsDetailsContainer.innerHTML = '<h3>解答履歴:</h3>';
            const list = document.createElement('ul');
            if(userAnswers && userAnswers.length > 0) {
                userAnswers.forEach((answer, index) => {
                     if (!answer) return;
                    const li = document.createElement('li');
                    let answerDetailHTML = `<span>問題 ${index + 1}: ${answer.questionText.substring(0, 100)}...</span> <span class="correct-answer">正解: ${answer.correctAnswer}</span> <span class="user-answer ${answer.isCorrect ? 'correct' : 'incorrect'}">あなたの回答: ${answer.userAnswer} ${answer.isCorrect ? '✓' : '✗'}</span>`;
                    li.innerHTML = answerDetailHTML;
                    list.appendChild(li);
                });
            } else { list.innerHTML = '<li>解答履歴はありません。</li>'; }
            this.resultsDetailsContainer.appendChild(list);
        }
    },

    // ハイスコア表示用関数 (完全版)
    displayHighScores() {
        console.log("Updating high scores display...");
        if(!this.highScoresArea) return; // 要素がなければ何もしない

        this.highScoresArea.innerHTML = '<h2>ハイスコア Top 3</h2>';
        const scoreCategories = [ { key: getHighScoreKeyForMode('main', 10), title: '本番 (10問)' }, { key: getHighScoreKeyForMode('main', 30), title: '本番 (30問)' }, { key: getHighScoreKeyForMode('main', 50), title: '本番 (50問)' }, { key: getHighScoreKeyForMode('main', 100), title: '本番 (100問)' }, { key: getHighScoreKeyForMode('main', 350), title: '本番 (350問)' }, { key: getHighScoreKeyForMode('timeAttack', 120), title: `タイムアタック (${120 / 60}分)` } ];

        scoreCategories.forEach(category => {
            const scores = loadHighScores(category.key); // main.js の関数
            const categoryDiv = document.createElement('div'); categoryDiv.className = 'highscore-category';
            categoryDiv.innerHTML = `<h3>${category.title}</h3>`;
            const ol = document.createElement('ol');
            if (scores.length > 0) {
                scores.forEach(entry => {
                    const li = document.createElement('li'); let details = '';
                    if (entry.total !== undefined && entry.time !== undefined) { details = `(${entry.score}/${entry.total}点, ${entry.time}秒, ${entry.date})`; }
                    else if (entry.timeLimit !== undefined) { details = `(${entry.score}点 / ${entry.timeLimit}秒, ${entry.date})`; }
                    else { details = `(${entry.score}点, ${entry.date})`; }
                    li.innerHTML = `<span class="score-name">${entry.name}</span><span class="score-details">${details}</span>`;
                    ol.appendChild(li);
                });
            } else { ol.innerHTML = '<li>まだ記録はありません</li>'; }
            categoryDiv.appendChild(ol); this.highScoresArea.appendChild(categoryDiv);
        });
    }
};

// Helper function for getting LocalStorage Key (needed by ui.js)
function getHighScoreKeyForMode(mode, value) {
    const HIGH_SCORE_PREFIX = 'hamCupHighScores_';
    if (mode === 'main') { return `${HIGH_SCORE_PREFIX}main_${value}`; }
    else if (mode === 'timeAttack') { return `${HIGH_SCORE_PREFIX}timeAttack_${value}`; }
    return null;
}
