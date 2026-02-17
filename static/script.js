let allQuestions = [];
let quizQuestions = [];
let userAnswers = {}; // { questionId: { selectedOptionId: id, isCorrect: bool } }
let currentQuestionIndex = 0;
let timer = null;
let timeRemaining = 0;
let settings = {
    count: 'all', // 'all' or 'custom'
    customCount: 5,
    timeLimit: null // in seconds
};

// --- Upload Section ---

document.getElementById('file-input').addEventListener('change', function (e) {
    if (e.target.files.length > 0) {
        document.getElementById('file-name').textContent = e.target.files[0].name;
        document.getElementById('params-btn').classList.remove('hidden');
    }
});

async function uploadFile() {
    // This function is now triggered by "Fayl tanlash" change indirectly or we can keep it for direct upload if needed.
    // Actually, in the new UI, we upload first, then show settings.
    // But the user clicks "Davom etish" (params-btn) to proceed.
    // Let's modify the flow: 
    // 1. Select file. 
    // 2. Click "Davom etish". 
    // 3. Upload file to server to parse. 
    // 4. If success, show Settings.
}

async function showSettings() {
    const fileInput = document.getElementById('file-input');
    const file = fileInput.files[0];

    if (!file) {
        alert("Iltimos, avval fayl tanlang!");
        return;
    }

    // Show loading
    document.getElementById('loading-spinner').classList.remove('hidden');
    document.getElementById('params-btn').classList.add('hidden');

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Fayl yuklashda xatolik yuz berdi.');
        }

        const data = await response.json();
        allQuestions = data.questions;

        if (!allQuestions || allQuestions.length === 0) {
            throw new Error("Fayldan savollar topilmadi!");
        }

        // Show Settings UI
        document.getElementById('upload-section').classList.add('hidden');
        document.getElementById('settings-section').classList.remove('hidden');

        // Update stats
        document.getElementById('total-questions-info').textContent = `Mavjud: ${allQuestions.length} ta savol`;
        document.getElementById('settings-subtitle').textContent = `Fayl: ${file.name}`;

    } catch (error) {
        alert(error.message);
        document.getElementById('params-btn').classList.remove('hidden');
    } finally {
        document.getElementById('loading-spinner').classList.add('hidden');
    }
}

// --- Settings Section ---

function setQuestionCount(type) {
    settings.count = type;

    // UI Updates
    document.getElementById('btn-all-questions').classList.remove('active');
    const customInput = document.getElementById('custom-count');

    if (type === 'all') {
        document.getElementById('btn-all-questions').classList.add('active');
        customInput.value = '';
    } else {
        customInput.focus();
    }
}

function goBackToUpload() {
    document.getElementById('settings-section').classList.add('hidden');
    document.getElementById('upload-section').classList.remove('hidden');
    document.getElementById('params-btn').classList.remove('hidden');
}

// --- Quiz Logic ---

function startTest() {
    // 1. Apply Settings
    let count = allQuestions.length;
    if (settings.count === 'custom') {
        const inputVal = parseInt(document.getElementById('custom-count').value);
        if (inputVal && inputVal > 0 && inputVal <= allQuestions.length) {
            count = inputVal;
        }
    }

    // Prepare questions (shuffle order of questions?)
    // User didn't explicitly ask to shuffle questions, but usually anticipated.
    // Let's shuffle questions for better experience.
    const shuffledQuestions = [...allQuestions].sort(() => 0.5 - Math.random());
    quizQuestions = shuffledQuestions.slice(0, count);

    // Shuffle options for each question
    quizQuestions.forEach(q => {
        q.options = shuffleArray(q.options);
    });

    // Time Limit
    const timeInput = parseInt(document.getElementById('time-limit').value);
    if (timeInput && timeInput > 0) {
        settings.timeLimit = timeInput * 60; // seconds
        timeRemaining = settings.timeLimit;
    } else {
        settings.timeLimit = null;
    }

    // Reset State
    currentQuestionIndex = 0;
    userAnswers = {};

    // Switch UI
    document.getElementById('settings-section').classList.add('hidden');
    document.getElementById('quiz-section').classList.remove('hidden');

    // Start Timer
    if (settings.timeLimit) {
        startTimer();
    } else {
        document.getElementById('timer-display').classList.add('hidden');
    }

    renderQuestion(0);
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function startTimer() {
    document.getElementById('timer-display').classList.remove('hidden');
    updateTimerDisplay();

    timer = setInterval(() => {
        timeRemaining--;
        updateTimerDisplay();

        if (timeRemaining <= 0) {
            clearInterval(timer);
            finishTest();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    document.getElementById('timer-display').textContent =
        `⏱ ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    // Warning color
    if (timeRemaining < 60) {
        document.getElementById('timer-display').style.color = '#e53e3e';
    }
}

function renderQuestion(index) {
    const question = quizQuestions[index];
    const container = document.getElementById('current-question-card');

    // Update Header
    document.getElementById('progress-text').textContent = `Savol ${index + 1} / ${quizQuestions.length}`;

    // Build Card Content
    let html = `<div class="question-text">${index + 1}. ${question.question}</div>`;
    html += `<ul class="options-list">`;

    question.options.forEach(opt => {
        // Check if selected
        const answer = userAnswers[question.id];
        let className = 'option-item';

        if (answer) {
            if (answer.selectedOptionId === opt.id) {
                className += ' selected'; // Just visual marker
                // In this design, we might want to highlight correct/incorrect immediately?
                // User didn't specify "Exam mode" (hidden results) or "Practice mode".
                // In previous version it showed correct/incorrect immediately. 
                // Let's keep immediate feedback for now, but cleaner.
                if (opt.isCorrect) className += ' correct';
                else className += ' incorrect';
            } else if (answer.selectedOptionId !== opt.id && opt.isCorrect && answer.selectedOptionId) {
                // Show correct answer if user picked wrong
                className += ' correct';
            }
            className += ' disabled';
        }

        html += `<li class="${className}" onclick="selectAnswer(${question.id}, ${opt.id}, ${opt.isCorrect})">${opt.text}</li>`;
    });

    html += `</ul>`;
    container.innerHTML = html;

    // Update Buttons
    document.getElementById('prev-btn').disabled = index === 0;

    const nextBtn = document.getElementById('next-btn');
    const finishBtn = document.getElementById('finish-btn');

    if (index === quizQuestions.length - 1) {
        nextBtn.classList.add('hidden');
        finishBtn.classList.remove('hidden');
    } else {
        nextBtn.classList.remove('hidden');
        finishBtn.classList.add('hidden');
    }
}

function selectAnswer(questionId, optionId, isCorrect) {
    if (userAnswers[questionId]) return; // Already answered

    // Find option text for completeness if needed, but we store ID
    userAnswers[questionId] = { selectedOptionId: optionId, isCorrect: isCorrect };

    // Re-render to show feedback
    renderQuestion(currentQuestionIndex);
}

function nextQuestion() {
    if (currentQuestionIndex < quizQuestions.length - 1) {
        currentQuestionIndex++;
        renderQuestion(currentQuestionIndex);
    }
}

function prevQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        renderQuestion(currentQuestionIndex);
    }
}

// --- Results Section ---

function finishTest() {
    clearInterval(timer);

    document.getElementById('quiz-section').classList.add('hidden');
    document.getElementById('results-section').classList.remove('hidden');

    calculateResults();
}

function calculateResults() {
    const total = quizQuestions.length;
    let correctCount = 0;

    Object.values(userAnswers).forEach(ans => {
        if (ans.isCorrect) correctCount++;
    });

    const percentage = Math.round((correctCount / total) * 100) || 0;

    // Update Score Circle
    const scoreCircle = document.querySelector('.score-circle');
    scoreCircle.setAttribute('data-score', `${percentage}%`);
    scoreCircle.style.setProperty('--score', `${percentage}%`);

    // Update color based on score
    if (percentage >= 80) {
        scoreCircle.style.setProperty('--secondary-color', '#10B981'); // Emerald
    } else if (percentage >= 50) {
        scoreCircle.style.setProperty('--secondary-color', '#F59E0B'); // Amber
    } else {
        scoreCircle.style.setProperty('--secondary-color', '#EF4444'); // Red
    }

    // Text Stats
    const statsText = document.getElementById('stats-display');
    statsText.innerHTML = `
        <strong>${correctCount}</strong> ta to'g'ri <span style="color:#D1D5DB">|</span>
        <strong>${total - correctCount}</strong> ta noto'g'ri<br>
        <span style="font-size: 0.9em; margin-top: 5px; display:block">Jami ${total} ta savol</span>
    `;

    const hasMistakes = correctCount < total;
    if (hasMistakes) {
        document.getElementById('mistakes-btn').classList.remove('hidden');
    } else {
        document.getElementById('mistakes-btn').classList.add('hidden');
    }
}

function restartTest() {
    location.reload();
}

function workOnMistakes() {
    // Filter wrong answers
    const wrongQuestionIds = quizQuestions.filter(q => {
        const ans = userAnswers[q.id];
        return !ans || !ans.isCorrect;
    }).map(q => q.id);

    if (wrongQuestionIds.length === 0) return;

    // Setup new quiz with mistakes
    quizQuestions = quizQuestions.filter(q => wrongQuestionIds.includes(q.id));

    // Reset state
    currentQuestionIndex = 0;
    userAnswers = {};
    settings.timeLimit = null; // No timer for mistakes

    document.getElementById('results-section').classList.add('hidden');
    document.getElementById('quiz-section').classList.remove('hidden');
    document.getElementById('timer-display').classList.add('hidden');

    renderQuestion(0);
}
