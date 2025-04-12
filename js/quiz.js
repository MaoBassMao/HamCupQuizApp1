// クイズのロジック (状態管理、問題選択、正誤判定など)
const quiz = {
    questions: [],
    currentIndex: 0,
    score: 0,
    mode: '',
    timeLimit: 0,
    timerId: null,
    timeRemaining: 0,
    userAnswers: [],

    initQuiz(selectedQuestions, mode, timeLimit = 0) {
        this.questions = Array.isArray(selectedQuestions) ? selectedQuestions : [];
        this.currentIndex = 0;
        this.score = 0;
        this.mode = mode;
        this.timeLimit = this.mode === 'timeAttack' ? timeLimit : 0;
        this.userAnswers = [];
        this.resetTimer();
        console.log(`Quiz initialized. Mode: ${this.mode}, Questions: ${this.questions.length}, TimeLimit: ${this.timeLimit}s`);

        if (this.timeLimit > 0) {
            this.timeRemaining = this.timeLimit;
            this.startTimer();
        }
    },

    // 問題データの配列から、実際のクイズ問題形式を生成する (完全版)
    generateQuizQuestions(data) {
        const generatedQuestions = [];
        if (!Array.isArray(data)) return generatedQuestions;

        const allNames = data.map(h => h.name).filter(n => n);
        const allOwner1s = data.map(h => h.owner1).filter(o => o);
        const allOwner2s = data.map(h => h.owner2).filter(o => o);
        const allIds = data.map(h => h.id).filter(id => id);
        const allHobbies = data.map(h => h.hobby).filter(t => t);
        const allSkills = data.map(h => h.skill).filter(t => t);
        const allSweets = data.map(h => h.sweets).filter(t => t);
        const allPersonalities = data.map(h => h.personality).filter(t => t);
        let allProfileAnswers = new Set();

        data.forEach(hamcup => {
            if (hamcup.profile) {
                const profileMatches = hamcup.profile.matchAll(/{\[(.*?)\]}/g);
                for (const match of profileMatches) {
                    if (match[1]) { allProfileAnswers.add(match[1].trim()); }
                }
            }
        });
        const profileAnswersPool = Array.from(allProfileAnswers);

        data.forEach(hamcup => {
            const commonProps = { infoImage: hamcup.image_info, originalData: hamcup };
            const traits = [ { key: 'hobby', name: '趣味', pool: allHobbies }, { key: 'skill', name: '特技', pool: allSkills }, { key: 'sweets', name: '和菓子', pool: allSweets }, { key: 'personality', name: '性格', pool: allPersonalities }];

            if (hamcup.image_quiz && hamcup.name) generatedQuestions.push({ ...commonProps, type: 'image_to_name', text: 'このHamCupの名前は？', image: hamcup.image_quiz, correctAnswer: hamcup.name, choices: this.generateChoices(hamcup.name, allNames) });
            if (hamcup.name && hamcup.owner1) generatedQuestions.push({ ...commonProps, type: 'name_to_owner1', text: `HamCup『${hamcup.name}』の1st Ownerは？`, image: hamcup.image_quiz, correctAnswer: hamcup.owner1, choices: this.generateChoices(hamcup.owner1, allOwner1s) });
            if (hamcup.name && hamcup.owner2) generatedQuestions.push({ ...commonProps, type: 'name_to_owner2', text: `HamCup『${hamcup.name}』の2nd Ownerは？`, image: hamcup.image_quiz, correctAnswer: hamcup.owner2, choices: this.generateChoices(hamcup.owner2, allOwner2s) });
            if (hamcup.name && hamcup.id) generatedQuestions.push({ ...commonProps, type: 'name_to_id', text: `HamCup『${hamcup.name}』のID(No.)は？`, image: hamcup.image_quiz, correctAnswer: hamcup.id, choices: this.generateChoices(hamcup.id, allIds) });
            if (hamcup.id && hamcup.name) generatedQuestions.push({ ...commonProps, type: 'id_to_name', text: `HamCup #${hamcup.id} の名前は？`, image: hamcup.image_quiz, correctAnswer: hamcup.name, choices: this.generateChoices(hamcup.name, allNames) });
            traits.forEach(traitInfo => { if (hamcup.name && hamcup[traitInfo.key]) generatedQuestions.push({ ...commonProps, type: `name_to_${traitInfo.key}`, text: `HamCup『${hamcup.name}』の${traitInfo.name}は？`, image: hamcup.image_quiz, correctAnswer: hamcup[traitInfo.key], choices: this.generateChoices(hamcup[traitInfo.key], traitInfo.pool) }); });
            traits.forEach(traitInfo => { if (hamcup[traitInfo.key] && hamcup.name) generatedQuestions.push({ ...commonProps, type: `${traitInfo.key}_to_name`, text: `『${hamcup[traitInfo.key]}』が${traitInfo.name}なのは誰？`, image: 'assets/images/question-mark.png', answerImage: hamcup.image_quiz, correctAnswer: hamcup.name, choices: this.generateChoices(hamcup.name, allNames) }); });
             if (hamcup.profile) {
                const profileMatches = Array.from(hamcup.profile.matchAll(/{\[(.*?)\]}/g));
                profileMatches.forEach((match, index) => {
                    const correctAnswer = match[1]?.trim(); if (!correctAnswer) return;
                    let builtQuestionText = ""; let lastIndex = 0;
                    profileMatches.forEach((m, i) => { builtQuestionText += hamcup.profile.substring(lastIndex, m.index); if (i === index) { builtQuestionText += "[＿＿＿]"; } else { builtQuestionText += (m[1] || ''); } lastIndex = m.index + m[0].length; });
                    builtQuestionText += hamcup.profile.substring(lastIndex); const questionText = builtQuestionText;
                    const choices = this.generateChoices(correctAnswer, profileAnswersPool);
                    generatedQuestions.push({ ...commonProps, type: 'profile_fill_blank', text: questionText, image: hamcup.image_quiz, correctAnswer: correctAnswer, choices: choices });
                });
             }
        });
        return generatedQuestions;
    },

    // 選択肢を生成する (完全版)
    generateChoices(correctAnswer, allOptionsPool) {
        const choices = new Set();
        if (correctAnswer !== null && correctAnswer !== undefined && String(correctAnswer).trim() !== '') {
            choices.add(String(correctAnswer));
        }
        const uniqueOptions = [...new Set(allOptionsPool)].map(opt => String(opt)).filter(opt => opt.trim() !== '' && opt !== String(correctAnswer));
        const maxChoices = 4;
        while (choices.size < maxChoices && uniqueOptions.length > 0) {
            const randomIndex = Math.floor(Math.random() * uniqueOptions.length);
            choices.add(uniqueOptions.splice(randomIndex, 1)[0]);
        }
        const dummyAnswers = ["？？？", "---", "データなし", "ひみつ"];
        let dummyIndex = 0;
         while (choices.size < maxChoices && dummyIndex < dummyAnswers.length) {
             if (!choices.has(dummyAnswers[dummyIndex])) {
                 choices.add(dummyAnswers[dummyIndex]);
             }
             dummyIndex++;
         }
        return this.shuffleArray(Array.from(choices));
    },

    // 配列をシャッフルする (完全版)
    shuffleArray(array) {
        if (!Array.isArray(array)) return [];
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    },

    // 現在の問題データを取得 (完全版)
    getCurrentQuestion() {
        if (this.questions && Array.isArray(this.questions) && this.currentIndex >= 0 && this.currentIndex < this.questions.length) {
            return this.questions[this.currentIndex];
        }
        return null;
    },

    // 問題を読み込んで表示 (完全版)
    loadQuestion() {
        const questionData = this.getCurrentQuestion();
        if (questionData) {
            ui.displayQuestion(questionData, this.currentIndex + 1, this.questions.length, this.mode);
        } else {
            if(this.questions && this.questions.length > 0 && this.currentIndex >= this.questions.length) {
                 if (this.mode !== 'timeAttack') { this.endQuiz(); }
            } else {
                 console.warn("No question data to load (likely end of quiz or init issue). Current index:", this.currentIndex, "Questions length:", this.questions ? this.questions.length : 'N/A');
                 if(typeof ui !== 'undefined' && ui.showScreen) { ui.showScreen('start-screen'); }
                 else { console.error("ui object or showScreen method not available."); }
            }
        }
    },

    // 回答処理 (完全版)
    submitAnswer(selectedAnswer) {
        const currentQuestion = this.getCurrentQuestion();
        if (!currentQuestion) return;
        const isCorrect = (selectedAnswer === currentQuestion.correctAnswer);
        this.userAnswers[this.currentIndex] = { questionText: currentQuestion.text, userAnswer: selectedAnswer, correctAnswer: currentQuestion.correctAnswer, isCorrect: isCorrect, infoImage: currentQuestion.infoImage };
        if (isCorrect) { this.score++; }
        if (this.mode === 'practice') { ui.displayFeedback(isCorrect, currentQuestion.correctAnswer, currentQuestion.infoImage); ui.showNextButton(); }
        else { this.moveToNextQuestion(); }
    },

    // 次の問題へ進む (完全版)
    moveToNextQuestion() {
        this.currentIndex++;
        if (this.mode === 'timeAttack' && this.currentIndex >= this.questions.length) {
            console.log("Time attack reached end of questions, looping.");
            this.currentIndex = 0;
        }
        if (this.currentIndex < this.questions.length || (this.mode === 'timeAttack' && this.timeRemaining > 0)) {
            this.loadQuestion();
        } else {
             if (this.mode !== 'timeAttack') { this.endQuiz(); }
        }
    },

    // クイズ終了処理 (完全版)
    endQuiz() {
        const timeTaken = this.timeLimit > 0 ? this.timeLimit - this.timeRemaining : 0;
        this.stopTimer();
        console.log(`Quiz ended. Mode: ${this.mode}, Score: ${this.score}/${this.userAnswers.length}, Time Taken/Remaining: ${timeTaken}s / ${this.timeRemaining}s`);
        if (typeof maybeSaveHighScore === 'function' && (this.mode === 'main' || this.mode === 'timeAttack')) { maybeSaveHighScore(this.score, timeTaken); }
        ui.displayResults(this.score, this.userAnswers.length, this.mode, timeTaken, this.userAnswers);
        ui.showScreen('results-screen');
    },

    // タイマー開始 (デバッグログ追加版)
    startTimer() {
         if (this.timeLimit <= 0) return;
         this.stopTimer();
         this.timeRemaining = this.timeLimit;
         // ▼▼▼ デバッグログ ▼▼▼
         console.log(`>>> startTimer called. Initial timeRemaining: ${this.timeRemaining}`);
         ui.updateTimerDisplay(this.timeRemaining); // 初期表示
         this.timerId = setInterval(() => {
            this.timeRemaining--;
            // ▼▼▼ デバッグログ ▼▼▼
            console.log(`>>> Timer Tick. timeRemaining: ${this.timeRemaining}`);
            ui.updateTimerDisplay(this.timeRemaining); // 表示更新
            if (this.timeRemaining <= 0) {
                // ▼▼▼ デバッグログ ▼▼▼
                console.log(">>> Timer reached zero. Calling endQuiz.");
                this.endQuiz(); // 時間切れ
            }
        }, 1000); // 1秒ごと
    },

    // タイマー停止 (完全版)
    stopTimer() {
         if (this.timerId) {
            clearInterval(this.timerId);
            this.timerId = null;
         }
    },

    // タイマーリセット (完全版)
    resetTimer() {
        this.stopTimer();
        this.timeRemaining = 0;
        ui.updateTimerDisplay(null);
    },

     // クイズ状態リセット (完全版)
    resetQuizState() {
        this.stopTimer();
        this.questions = [];
        this.currentIndex = 0;
        this.score = 0;
        this.mode = '';
        this.timeLimit = 0;
        this.userAnswers = [];
    }
};

// Assign shuffleArray as a method (完全版)
quiz.shuffleArray = function(array) {
    if (!Array.isArray(array)) return [];
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};
