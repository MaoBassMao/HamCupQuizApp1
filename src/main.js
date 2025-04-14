// main.js (fetch パスを BASE_URL 対応に修正)

import quiz from './quiz.js';
import ui from './ui.js';
import { supabase } from './supabaseClient.js';

// === DOM Elements ===
const startScreen = document.getElementById('start-screen');
const quizScreen = document.getElementById('quiz-screen');
const resultsScreen = document.getElementById('results-screen');
const startPracticeSequentialBtn = document.getElementById('start-practice-sequential-btn');
const startPracticeRandomBtn = document.getElementById('start-practice-random-btn');
const characterSelect = document.getElementById('character-select');
const startPracticeCharSequentialBtn = document.getElementById('start-practice-character-sequential-btn');
const startPracticeCharRandomBtn = document.getElementById('start-practice-character-random-btn');
const mainQuizButtons = document.querySelectorAll('.main-quiz-btn');
const startTimeAttackBtn = document.getElementById('start-timeattack-btn');
const nextQuestionBtn = document.getElementById('next-question-btn');
const backToStartBtn = document.getElementById('back-to-start-btn');
const restartBtn = document.getElementById('restart-btn');
const highScoresArea = document.getElementById('high-scores-area');

// === Global Variables ===
let allHamCupData = [];
let allPossibleQuestions = [];
let currentQuizMode = ''; // 'practice', 'main', 'timeAttack', 'practiceCharacter'
let currentQuizLength = 0;
let currentQuizTimeLimit = 0;

// === Initialization ===
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed");
    setupEventListeners();
    loadHamCupData().then(() => {
        if (typeof ui.displayHighScores === 'function') {
             ui.displayHighScores(fetchOnlineHighScores); // オンラインランキング表示
        } else {
             console.error("ui.displayHighScores is not available or not a function.");
        }
    }).catch(error => {
        console.error("Error during initial data load:", error);
    });
});

// === Event Listeners Setup ===
function setupEventListeners() {
    // 通常の練習モード
    startPracticeSequentialBtn.addEventListener('click', () => handlePracticeStart(false));
    startPracticeRandomBtn.addEventListener('click', () => handlePracticeStart(true));

    // キャラ別練習のリスナー
    characterSelect.addEventListener('change', () => {
        if (characterSelect.value) {
            startPracticeCharSequentialBtn.disabled = false;
            startPracticeCharRandomBtn.disabled = false;
        } else {
            startPracticeCharSequentialBtn.disabled = true;
            startPracticeCharRandomBtn.disabled = true;
        }
    });
    startPracticeCharSequentialBtn.addEventListener('click', () => handleCharacterPracticeStart(false));
    startPracticeCharRandomBtn.addEventListener('click', () => handleCharacterPracticeStart(true));

    // 本番クイズモード
    mainQuizButtons.forEach(button => {
        button.addEventListener('click', () => {
            const numQuestions = parseInt(button.dataset.questions, 10);
            handleMainQuizStart(numQuestions);
        });
    });

    // タイムアタックモード
    startTimeAttackBtn.addEventListener('click', () => {
        const timeLimit = parseInt(startTimeAttackBtn.dataset.time, 10);
        handleTimeAttackStart(timeLimit);
    });

    // 結果画面のボタン
    restartBtn.addEventListener('click', () => {
        quiz.resetQuizState();
        ui.showScreen('start-screen');
        if (typeof ui.displayHighScores === 'function') {
            ui.displayHighScores(fetchOnlineHighScores);
        }
    });

    // 「次の問題へ」または「結果を見る」ボタン
    nextQuestionBtn.addEventListener('click', () => {
        if (nextQuestionBtn.textContent === '結果を見る') {
            // 練習モードの最後
            console.log("Showing practice results...");
            if (typeof ui.displayResults === 'function') {
                ui.displayResults(quiz.score, quiz.userAnswers.length, quiz.mode, 0, quiz.userAnswers, quiz.timeLimit);
            } else {
                 console.error("displayResults function is not available in ui");
             }
            if (typeof ui.showScreen === 'function') {
                ui.showScreen('results-screen');
            } else {
                 console.error("showScreen function is not available in ui");
             }
        } else {
            // 通常の次の問題へ
            quiz.moveToNextQuestion();
        }
    });

    // 「トップに戻る」ボタン (クイズ中)
    backToStartBtn.addEventListener('click', () => {
        let confirmMessage = "クイズを中断してトップに戻りますか？";
        if (currentQuizMode === 'main' || currentQuizMode === 'timeAttack') {
            confirmMessage += "\n（中断したクイズのスコアは記録されません）";
        }
        if (confirm(confirmMessage)) {
             quiz.resetQuizState();
             ui.showScreen('start-screen');
             if (typeof ui.displayHighScores === 'function') {
                  ui.displayHighScores(fetchOnlineHighScores);
             }
        }
    });
}

// === Data Loading ===
async function loadHamCupData() {
    // 開始ボタンとキャラ選択を一旦無効化
    const allStartButtons = document.querySelectorAll('#start-screen button');
    allStartButtons.forEach(btn => btn.disabled = true);
    if(characterSelect) characterSelect.disabled = true;

    // ★★★★★★★★★★★★ ここから修正箇所 ★★★★★★★★★★★★
    let jsonPath = ''; // エラー表示用に try の外で宣言

    try {
        // Viteの環境変数 BASE_URL を使って正しいパスを組み立てる
        // BASE_URL は開発時 '/'、ビルド時(base設定あり) '/HamCupQuizApp1/' のようになる
        const baseUrl = import.meta.env.BASE_URL;
        // base が '/' で終わる場合と終わらない場合を考慮して結合
        jsonPath = (baseUrl.endsWith('/') ? baseUrl : baseUrl + '/') + 'hamcups.json';

        console.log(`Workspaceing JSON from: ${jsonPath}`); // ★デバッグ用にパスを確認するログを追加
        const response = await fetch(jsonPath);         // ★修正後のパスでfetch

        if (!response.ok) {
            // fetchが失敗した場合 (404 Not Found など)
            // ★エラーメッセージ内のパスも修正後のものを使う
            throw new Error(`HTTP error! status: ${response.status}, Failed to fetch ${jsonPath}`);
        }
        // ★★★★★★★★★★★★ ここまで修正箇所 ★★★★★★★★★★★★

        // レスポンスボディをJSONとして解析
        try {
            allHamCupData = await response.json();
        } catch (jsonError) {
            console.error("Failed to parse response as JSON:", jsonError);
            throw new Error("Received data is not valid JSON."); // JSON解析失敗エラー
        }
        console.log("HamCup data loaded:", allHamCupData.length, "entries");

        // クイズ問題を生成
        allPossibleQuestions = quiz.generateQuizQuestions(allHamCupData);
        console.log(`Total possible questions generated: ${allPossibleQuestions.length}`);

        // 問題が生成できたら、関連するUI要素を有効化
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

            // キャラクター選択ドロップダウンを生成・有効化
            populateCharacterDropdown();

        } else {
            // 問題が生成できなかった場合
            throw new Error("No questions could be generated from the data.");
        }
    } catch (error) {
        // データ読み込みまたは処理中にエラーが発生した場合
        console.error("Could not initialize app (loading/processing JSON):", error); // ★エラーメッセージ修正
        // ★アラート内のパス表示も修正
        alert(`アプリの初期化に失敗しました: ${error.message}\n(${jsonPath || '/hamcups.json'} の読み込み、形式、または内容に問題がある可能性があります)`);
        // 開始ボタン類を「読込失敗」状態にする
        allStartButtons.forEach(btn => {
            btn.textContent = '読込失敗';
            btn.disabled = true;
        });
         if(characterSelect) characterSelect.disabled = true;
         // エラー発生後も処理を続けないように、ここで終了させるか、適切にハンドリング
         // throw error; // 必要であればここで再スロー
    }
}


/** キャラクター選択ドロップダウンに選択肢を追加する関数 (ID順ソート対応版) */
function populateCharacterDropdown() {
    if (!characterSelect || !allHamCupData || allHamCupData.length === 0) {
        console.error("Character select dropdown or HamCup data not available.");
        return;
    }

    // 既存のオプションをクリア (最初の "--選択してください--" 以外)
    while (characterSelect.options.length > 1) {
        characterSelect.remove(1);
    }

    // IDと名前を持つ有効なキャラクターデータのみをフィルタリング
    const validCharacters = allHamCupData.filter(h => h.id && h.name);

    // ID (文字列として) でソートする
    validCharacters.sort((a, b) => {
        if (a.id < b.id) return -1;
        if (a.id > b.id) return 1;
        return 0;
    });

    // ソートされたリストからオプションを追加
    validCharacters.forEach(hamcup => {
        const option = document.createElement('option');
        option.value = hamcup.name; // value は name (キャラクター別問題フィルター用)
        option.textContent = `${hamcup.id}: ${hamcup.name}`; // 表示テキストは "ID: 名前"
        characterSelect.appendChild(option);
    });

    // ドロップダウンを有効化し、キャラ別練習ボタンは選択されるまで無効のまま
    characterSelect.disabled = false;
    startPracticeCharSequentialBtn.disabled = true;
    startPracticeCharRandomBtn.disabled = true;
}


// === Quiz Start Handlers ===
/** 通常の練習モードを開始 */
function handlePracticeStart(shuffle) {
    if (allPossibleQuestions.length === 0) { alert("出題できる練習問題がありません。"); return; }
    currentQuizMode = 'practice';
    currentQuizLength = allPossibleQuestions.length;
    currentQuizTimeLimit = 0;
    const questions = shuffle ? quiz.shuffleArray([...allPossibleQuestions]) : allPossibleQuestions;
    startQuiz(questions);
}

/** キャラ別練習モードを開始 */
function handleCharacterPracticeStart(shuffle) {
    if (!characterSelect) { alert("キャラクター選択要素が見つかりません。"); return; }
    const selectedCharacterName = characterSelect.value;

    if (!selectedCharacterName) {
        alert("キャラクターを選択してください。");
        return;
    }
    if (allPossibleQuestions.length === 0) { alert("出題できる問題がありません。"); return; }

    // 選択されたキャラクターの問題のみを抽出 (問題オブジェクトに characterName プロパティが必要)
    const characterQuestions = allPossibleQuestions.filter(q => q.characterName === selectedCharacterName);

    if (characterQuestions.length === 0) {
        alert(`${selectedCharacterName} に関する問題が見つかりませんでした。\n(問題データに 'characterName' が正しく設定されているか確認してください)`);
        return;
    }

    console.log(`Starting character practice for ${selectedCharacterName}. Questions found: ${characterQuestions.length}, Shuffle: ${shuffle}`);

    currentQuizMode = 'practiceCharacter';
    currentQuizLength = characterQuestions.length;
    currentQuizTimeLimit = 0;

    const questionsToStart = shuffle ? quiz.shuffleArray([...characterQuestions]) : characterQuestions;
    startQuiz(questionsToStart);
}

/** 本番クイズモードを開始 */
function handleMainQuizStart(numQuestions) {
    if (allPossibleQuestions.length === 0) { alert("出題できる問題がありません。"); return; }
    currentQuizMode = 'main';
    currentQuizLength = Math.min(numQuestions, allPossibleQuestions.length); // 実際の問題数を超えないように
    currentQuizTimeLimit = 0;

    // 全問題からランダムに指定数だけ選択
    const mainQuizQuestions = selectRandomQuestions(allPossibleQuestions, currentQuizLength);

    if (mainQuizQuestions.length === 0) { alert("問題を選択できませんでした。"); return; }
    startQuiz(mainQuizQuestions);
}

/** タイムアタックモードを開始 */
function handleTimeAttackStart(timeLimit) {
     if (allPossibleQuestions.length === 0) { alert("出題できる問題がありません。"); return; }
     currentQuizMode = 'timeAttack';
     currentQuizLength = allPossibleQuestions.length; // タイムアタックは全問題を対象とする想定
     currentQuizTimeLimit = timeLimit;

     // 全問題をシャッフルして開始
     const timeAttackQuestions = quiz.shuffleArray([...allPossibleQuestions]);
     startQuiz(timeAttackQuestions);
}

// === Core Quiz Initiation ===
/** クイズを開始する共通関数 */
function startQuiz(questions) {
    console.log(`Starting ${currentQuizMode} quiz. Length/Limit: ${currentQuizMode === 'timeAttack' ? currentQuizTimeLimit + 's' : questions.length + 'q'}`);
    // quiz モジュールを初期化
    quiz.initQuiz(
        questions,
        currentQuizMode,
        currentQuizTimeLimit,
        ui, // ui モジュールを渡す
        { // コールバック関数オブジェクトを渡す
            maybeSaveHighScore: maybeSaveHighScore,
            submitScore: submitScore
        }
    );
    // ui モジュールにも quiz への参照を設定 (双方向連携用、必要なら)
    if (typeof ui.setQuizReference === 'function') {
        ui.setQuizReference(quiz);
    } else {
        // console.warn("ui.setQuizReference function is missing!"); // 必須でなければ警告程度でも
    }
    // クイズ画面を表示し、最初の問題をロード
    ui.showScreen('quiz-screen');
    quiz.loadQuestion();
}

// === High Score Handling ===
const HIGH_SCORE_PREFIX = 'hamCupHighScores_'; // ローカルストレージキーの接頭辞

/** 現在のモードに基づいたローカルストレージキーを取得 */
function getHighScoreKey() {
    if (currentQuizMode === 'main') {
        return `${HIGH_SCORE_PREFIX}${currentQuizMode}_${currentQuizLength}`;
    } else if (currentQuizMode === 'timeAttack') {
        return `${HIGH_SCORE_PREFIX}${currentQuizMode}_${currentQuizTimeLimit}`;
    }
    return null; // 練習モードなどは保存しない
}

/** ローカルストレージからハイスコアを読み込む */
function loadHighScores(key) {
    if (!key) return [];
    try {
        const scores = localStorage.getItem(key);
        return scores ? JSON.parse(scores) : [];
    } catch (e) {
        console.error("Error loading high scores from localStorage:", e);
        return [];
    }
}

/** ハイスコアをローカルストレージに保存 (上位3件) */
function saveHighScores(key, scores) {
    if (!key) return;
    try {
        // スコアで降順ソート、同点の場合はタイムで昇順 (mainモードのみ)
        scores.sort((a, b) => {
            if (b.score !== a.score) {
                return b.score - a.score;
            }
            // timeAttack または time がない場合はスコアのみで比較終了
            if (currentQuizMode !== 'main' || !a.time || !b.time) {
                return 0;
            }
            return a.time - b.time; // main モードはタイムが短い方が上位
        });
        // 上位3件のみを保存
        const topScores = scores.slice(0, 3);
        localStorage.setItem(key, JSON.stringify(topScores));
    } catch (e) {
        console.error("Error saving high scores to localStorage:", e);
    }
}

/** クイズ終了時にハイスコアをチェックし、必要なら保存 */
function maybeSaveHighScore(finalScore, timeTaken) {
    const isOnlineMode = (currentQuizMode === 'main' || currentQuizMode === 'timeAttack');
    if (!isOnlineMode) return; // 練習モードでは保存しない

    const key = getHighScoreKey();
    if (!key) return;

    const localHighScores = loadHighScores(key);
    let shouldPromptAndSave = false;

    // トップ3に入るかチェック
    if (localHighScores.length < 3) {
        shouldPromptAndSave = true;
    } else {
        const lowestTopScore = localHighScores[localHighScores.length - 1].score;
        const lowestTopTime = localHighScores[localHighScores.length - 1].time; // mainモード用

        if (finalScore > lowestTopScore) {
            shouldPromptAndSave = true;
        } else if (finalScore === lowestTopScore) {
            // 同点の場合、mainモードならタイムを比較
            if (currentQuizMode === 'main' && timeTaken !== null && (!lowestTopTime || timeTaken < lowestTopTime)) {
                shouldPromptAndSave = true;
            }
             else if (currentQuizMode === 'timeAttack') {
                // shouldPromptAndSave = true; // timeAttack同点時のルール次第
            }
        }
    }

    if (shouldPromptAndSave) {
        // 少し遅延させて結果表示の反映を待つ
        setTimeout(() => {
            let userName = prompt(`ハイスコア達成！ (${finalScore}点) \nランキングに登録する名前を入力してください (10文字以内):`, "名無しさん");
            if (userName !== null) { // キャンセルされなかった場合
                userName = userName.substring(0, 10).trim(); // 10文字制限とトリム
                if (userName === "") userName = "名無しさん"; // 空ならデフォルト名

                const newScoreEntryLocal = {
                    name: userName,
                    score: finalScore,
                    date: new Date().toLocaleDateString('ja-JP') // 保存日付
                };
                // モードに応じた追加情報
                if (currentQuizMode === 'main') {
                    newScoreEntryLocal.time = timeTaken; // タイム
                    newScoreEntryLocal.total = currentQuizLength; // 問題数
                } else if (currentQuizMode === 'timeAttack') {
                    newScoreEntryLocal.timeLimit = currentQuizTimeLimit; // 制限時間
                }

                // ローカルストレージに保存
                const updatedLocalScores = [...localHighScores, newScoreEntryLocal];
                saveHighScores(key, updatedLocalScores);

                // Supabaseにも送信
                submitScore(userName, finalScore, currentQuizMode, currentQuizMode === 'main' ? currentQuizLength : currentQuizTimeLimit, timeTaken);

                // オンラインランキング表示を更新 (結果画面 or スタート画面で)
                if (typeof ui.displayHighScores === 'function') {
                     ui.displayHighScores(fetchOnlineHighScores);
                 }

            } else {
                console.log("User cancelled name prompt for high score.");
            }
        }, 100); // 100ms の遅延
    } else {
        console.log("Score did not qualify for local high score top 3.");
    }
}

// === Helper Function (Random Selection) ===
/** 配列からランダムに指定された数の要素を選択 */
function selectRandomQuestions(sourceArray, count) {
    if (!sourceArray || sourceArray.length === 0) return [];
    const actualCount = Math.min(count, sourceArray.length);
    // quiz.shuffleArray を使う (quiz.js に実装されている想定)
    const shuffled = quiz.shuffleArray([...sourceArray]);
    return shuffled.slice(0, actualCount);
}

// === Supabase Score Submission ===
/** スコアを Supabase に送信 */
async function submitScore(name, score, mode, modeValue, timeTaken = null) {
    if (!supabase) { console.warn("Supabase client not available. Skipping score submission."); return; }

    console.log(`Submitting score to Supabase: ${name}, ${score}, ${mode}, ${modeValue}, time: ${timeTaken}`);
    const scoreData = {
        player_name: name,
        score: score,
        quiz_mode: mode, // e.g., 'main', 'timeAttack'
        mode_value: modeValue, // e.g., 10 (for 10q), 180 (for 180s)
    };
    // mainモードの場合のみ time_taken_seconds を追加
    if (mode === 'main' && timeTaken !== null) {
        scoreData.time_taken_seconds = timeTaken;
    }

    try {
        const { data, error } = await supabase
            .from('scores') // あなたのテーブル名に合わせてください
            .insert([scoreData]);

        if (error) {
            console.error("Supabase score submission failed:", error);
        } else {
            console.log("Supabase score submission successful:", data);
        }
    } catch (error) {
        console.error("An unexpected error occurred during score submission:", error);
    }
}

// === Supabase High Score Fetching ===
/** Supabase から指定されたモードのハイスコアを取得 */
async function fetchOnlineHighScores(mode, value, limit = 3) {
    if (!supabase) { console.warn("Supabase client not available. Skipping online high score fetch."); return []; }

    console.log(`Workspaceing online high scores for mode: ${mode}, value: ${value}, limit: ${limit}`);
    try {
        let query = supabase
            .from('scores') // あなたのテーブル名
            .select('player_name, score, time_taken_seconds, created_at') // 必要なカラム
            .eq('quiz_mode', mode)
            .eq('mode_value', value);

        // 並び替え: スコア降順 -> (mainモードならタイム昇順) -> 登録日時降順
        query = query.order('score', { ascending: false });
        if (mode === 'main') {
            query = query.order('time_taken_seconds', { ascending: true, nullsFirst: false });
        }
        query = query.order('created_at', { ascending: false }); // 最新の登録を優先する場合

        query = query.limit(limit); // 上位 N 件

        const { data, error } = await query;

        if (error) {
            console.error(`Error fetching high scores for ${mode} ${value}:`, error);
            return []; // エラー時は空配列を返す
        }

        console.log(`Workspaceed online scores for ${mode} ${value}:`, data);
        return data || []; // データがない場合は空配列を返す

    } catch (err) {
        console.error("Unexpected error fetching online high scores:", err);
        return []; // 予期せぬエラー時も空配列を返す
    }
}

// --- quiz.js と ui.js が正しくインポートされ、期待通り動作することが前提です ---
// --- supabaseClient.js で supabase が正しく初期化されていることが前提です ---