let allQuestions = [];
let currentQuestions = [];
let userAnswers = {}; // { questionId: { selected: index, correct: boolean } }
let isMistakesMode = false;

// Handle file selection
document.getElementById('file-input').addEventListener('change', function (e) {
    if (e.target.files.length > 0) {
        document.getElementById('file-name').textContent = e.target.files[0].name;
        document.getElementById('start-btn').classList.remove('hidden');
    }
});

async function uploadFile() {
    const fileInput = document.getElementById('file-input');
    const file = fileInput.files[0];

    if (!file) return;

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
        startQuiz(allQuestions);

    } catch (error) {
        alert(error.message);
    }
}

function startQuiz(questions) {

    if (!questions || questions.length === 0) {
        alert("Fayldan savollar topilmadi! Iltimos, fayl formatini tekshiring (++++ va ==== belgilari).");
        location.reload();
        return;
    }

    currentQuestions = questions;
    userAnswers = {};

    document.getElementById('upload-section').classList.add('hidden');
    document.getElementById('results-section').classList.add('hidden');
    document.getElementById('quiz-section').classList.remove('hidden');

    renderQuestions(currentQuestions);
}

function renderQuestions(questions) {
    const container = document.getElementById('questions-container');
    container.innerHTML = '';

    updateProgress();

    questions.forEach((q, index) => {
        const card = document.createElement('div');
        card.className = 'question-card';
        card.id = `q-${q.id}`;

        // Header
        const header = document.createElement('div');
        header.className = 'question-text';
        header.textContent = `${index + 1}. ${q.question}`;
        card.appendChild(header);

        // Options
        const optionsList = document.createElement('ul');
        optionsList.className = 'options-list';

        q.options.forEach((opt) => {
            const li = document.createElement('li');
            li.className = 'option-item';
            li.textContent = opt.text;
            li.onclick = () => checkAnswer(q.id, opt, li, optionsList);
            optionsList.appendChild(li);
        });

        card.appendChild(optionsList);
        container.appendChild(card);
    });

    document.getElementById('finish-btn').classList.remove('hidden');
}

function checkAnswer(questionId, option, element, optionsList) {
    // If already answered, do nothing
    if (userAnswers[questionId]) return;

    const isCorrect = option.isCorrect;
    userAnswers[questionId] = { isCorrect: isCorrect, selectedOption: option };

    // Disable all options for this question
    Array.from(optionsList.children).forEach(li => {
        li.classList.add('disabled');
        // If this option matches the correct answer, highlight it green
        // We need to find the option data that corresponds to this LI, but here we can just rely on structure
        // Or better, logic:
    });

    // Find the correct option in the list to highlight it green anyway
    const question = currentQuestions.find(q => q.id === questionId);

    // Highlight selected
    if (isCorrect) {
        element.classList.add('correct');
    } else {
        element.classList.add('incorrect');
        // Highlight the correct one
        const correctOpt = question.options.find(o => o.isCorrect);
        // Find the LI that has this text
        Array.from(optionsList.children).forEach(li => {
            if (li.textContent === correctOpt.text) {
                li.classList.add('correct');
            }
        });
    }

    updateProgress();
}

function updateProgress() {
    const total = currentQuestions.length;
    const answered = Object.keys(userAnswers).length;

    const progressText = document.getElementById('progress-text');
    const progressFill = document.getElementById('progress-fill');

    if (progressText) progressText.textContent = `Savol: ${answered} / ${total}`;
    if (progressFill) progressFill.style.width = `${(answered / total) * 100}%`;
}

function finishTest() {
    document.getElementById('quiz-section').classList.add('hidden');
    document.getElementById('results-section').classList.remove('hidden');

    calculateResults();
}

function calculateResults() {
    const total = currentQuestions.length;
    let correctCount = 0;

    Object.values(userAnswers).forEach(ans => {
        if (ans.isCorrect) correctCount++;
    });

    const percentage = Math.round((correctCount / total) * 100) || 0;

    document.getElementById('score-display').textContent = `${percentage}%`;
    document.getElementById('stats-display').textContent = `To'g'ri: ${correctCount}, Noto'g'ri: ${total - correctCount}, Jami: ${total}`;

    // Check if there are mistakes
    const hasMistakes = correctCount < total;
    if (hasMistakes) {
        document.getElementById('mistakes-btn').classList.remove('hidden');
    } else {
        document.getElementById('mistakes-btn').classList.add('hidden');
    }
}

function restartTest() {
    // Reload page or reset state
    location.reload();
}

function workOnMistakes() {
    isMistakesMode = true;

    // Filter questions that were answered incorrectly OR not answered at all
    const incorrectQuestionIds = currentQuestions
        .filter(q => !userAnswers[q.id] || !userAnswers[q.id].isCorrect)
        .map(q => q.id);

    const mistakeQuestions = allQuestions.filter(q => incorrectQuestionIds.includes(q.id));

    startQuiz(mistakeQuestions);
}
