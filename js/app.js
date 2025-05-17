// Configuration des modes de jeu
const gameModes = {
    quiz: {
        title: 'Quiz Culture Générale',
        description: 'Testez vos connaissances avec des questions variées',
        timePerQuestion: 30, // secondes
    },
    photos: {
        title: 'Devinettes Photos',
        description: 'Devinez ce qui se cache derrière les images',
        timePerQuestion: 45,
    },
    'truth-dare': {
        title: 'Action/Vérité',
        description: 'Choisissez entre une action ou une vérité',
        timePerQuestion: 60,
    }
};

// Gestionnaire d'événements pour les boutons de mode de jeu
document.querySelectorAll('.game-mode-btn').forEach(button => {
    button.addEventListener('click', () => {
        const mode = button.dataset.mode;
        startGame(mode);
    });
});

// Fonction pour démarrer un jeu
function startGame(mode) {
    const gameArea = document.querySelector('.game-area');
    const modeSelection = document.querySelector('.mode-selection');
    
    // Cacher la sélection de mode et afficher la zone de jeu
    modeSelection.style.display = 'none';
    gameArea.style.display = 'block';
    
    // Initialiser le jeu selon le mode choisi
    switch(mode) {
        case 'quiz':
            initQuizGame();
            break;
        case 'photos':
            initPhotoGame();
            break;
        case 'truth-dare':
            initTruthDareGame();
            break;
    }
}

// Fonction pour mélanger un tableau (algorithme de Fisher-Yates)
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Fonction pour initialiser le jeu Quiz
async function initQuizGame() {
    const gameArea = document.querySelector('.game-area');
    gameArea.innerHTML = `
        <div class="quiz-container">
            <h2>${gameModes.quiz.title}</h2>
            <div class="quiz-options">
                <h3>Choisissez le nombre de questions :</h3>
                <div class="question-count-buttons">
                    <button class="count-btn" data-count="10">10 questions</button>
                    <button class="count-btn" data-count="25">25 questions</button>
                    <button class="count-btn" data-count="50">50 questions</button>
                    <button class="count-btn" data-count="100">100 questions</button>
                </div>
            </div>
        </div>
    `;

    // Ajouter les événements sur les boutons de sélection
    document.querySelectorAll('.count-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const questionCount = parseInt(btn.dataset.count);
            await startQuizWithCount(questionCount);
        });
    });
}

async function startQuizWithCount(questionCount) {
    try {
        const response = await fetch('data/questions.json');
        const data = await response.json();
        let questions = [...data.quiz.questions];
        
        // Mélanger les questions
        questions = shuffleArray(questions);
        
        // Limiter le nombre de questions si nécessaire
        if (questions.length > questionCount) {
            questions = questions.slice(0, questionCount);
        }

        const gameArea = document.querySelector('.game-area');
        gameArea.innerHTML = `
            <div class="quiz-header-row">
                <h2 class="quiz-title" style="text-align:center; width:100%">${gameModes.quiz.title}</h2>
            </div>
            <div class="quiz-status-bar">
                ⏱️ <span id="time">${gameModes.quiz.timePerQuestion}</span> s
                <span class="progress-bar-inline">Question <span id="current-question">1</span>/${questionCount}</span>
            </div>
            <div class="question-bubble"><span class="question">Chargement de la question...</span></div>
            <div class="answers"></div>
            <div class="quiz-actions">
                <button class="next-btn" style="display: none;">Question suivante</button>
                <button class="quit-btn" style="display: block;">Quitter le quiz</button>
            </div>
        `;

        let currentQuestionIndex = 0;
        let score = 0;
        let timerInterval;

        const nextBtn = document.querySelector('.next-btn');
        nextBtn.addEventListener('click', () => {
            currentQuestionIndex++;
            if (currentQuestionIndex < questions.length) {
                displayQuestion(currentQuestionIndex);
                nextBtn.style.display = 'none';
            } else {
                showResults();
            }
        });

        function displayQuestion(index) {
            const question = questions[index];
            document.querySelector('.question-bubble .question').textContent = question.question;
            const answersContainer = document.querySelector('.answers');
            answersContainer.innerHTML = question.answers.map((answer, i) => `
                <button class="answer-btn" data-index="${i}" type="button" tabindex="-1">${answer}</button>
            `).join('');
            // Forcer le blur sur tous les boutons pour éviter tout focus automatique
            setTimeout(() => {
                document.querySelectorAll('.answer-btn').forEach(btn => btn.blur());
            }, 30);
            document.querySelectorAll('.answer-btn').forEach(btn => {
                btn.addEventListener('click', handleAnswer);
            });
            // Blur aussi après le rendu de la page (mobile)
            setTimeout(() => {
                document.querySelectorAll('.answer-btn').forEach(btn => btn.blur());
            }, 200);
            const timeDisplay = document.getElementById('time');
            timeDisplay.textContent = gameModes.quiz.timePerQuestion;
            if (timerInterval) clearInterval(timerInterval);
            timerInterval = startTimer(gameModes.quiz.timePerQuestion, timeDisplay, () => {
                showCorrectAnswer();
            });
        }

        function handleAnswer(event) {
            const selectedIndex = parseInt(event.target.dataset.index);
            const question = questions[currentQuestionIndex];
            document.querySelectorAll('.answer-btn').forEach((btn, i) => {
                btn.disabled = true;
                if (i === question.correctAnswer) {
                    btn.classList.add('correct');
                }
                if (i === selectedIndex && i !== question.correctAnswer) {
                    btn.classList.add('wrong');
                }
            });
            if (selectedIndex === question.correctAnswer) {
                score++;
            }
            if (timerInterval) clearInterval(timerInterval);
            nextBtn.style.display = 'block';
        }

        function showCorrectAnswer() {
            const question = questions[currentQuestionIndex];
            document.querySelectorAll('.answer-btn').forEach((btn, i) => {
                btn.disabled = true;
                if (i === question.correctAnswer) {
                    btn.classList.add('correct');
                }
            });
            nextBtn.style.display = 'block';
        }

        function showResults() {
            // Corrige le compteur pour ne jamais dépasser le nombre total de questions
            const totalQuestions = questions.length;
            const questionsAnswered = Math.min(currentQuestionIndex + 1, totalQuestions);
            const percentage = totalQuestions > 0 ? Math.round((score / questionsAnswered) * 100) : 0;
            
            gameArea.innerHTML = `
                <div class="results-container">
                  <div class="results-header">
                    <span class="results-icon">🎉</span>
                    <h2 class="results-title">Quiz terminé !</h2>
                  </div>
                  <div class="results-summary">
                    <div class="results-row">
                      <span class="results-label">Questions répondues</span>
                      <span class="results-value">${questionsAnswered} / ${totalQuestions}</span>
                    </div>
                    <div class="results-row">
                      <span class="results-label">Score</span>
                      <span class="results-value">${score} / ${questionsAnswered}</span>
                    </div>
                    <div class="results-row highlight">
                      <span class="results-label">Pourcentage de réussite</span>
                      <span class="results-value">${percentage}%</span>
                    </div>
                  </div>
                  <button class="menu-btn" onclick="returnToMainMenu()">Retour au menu</button>
                </div>
            `;
        }

        // Modifier l'événement sur le bouton Quitter
        document.querySelector('.quit-btn').addEventListener('click', () => {
            showResults();
        });

        // Démarrer avec la première question
        displayQuestion(currentQuestionIndex);

    } catch (error) {
        console.error('Erreur lors du chargement des questions:', error);
        gameArea.innerHTML = `
            <div class="error-container">
                <h2>Erreur</h2>
                <p>Impossible de charger les questions. Veuillez réessayer.</p>
                <button onclick="returnToMainMenu()">Retour au menu</button>
            </div>
        `;
    }
}

// Fonction pour initialiser le jeu Photos
function initPhotoGame() {
    const gameArea = document.querySelector('.game-area');
    gameArea.innerHTML = `
        <div class="photo-game-container">
            <h2 class="quiz-title">Devinette Photo</h2>
            <div class="quiz-options">
                <h3>Choisissez le nombre de devinettes :</h3>
                <div class="question-count-buttons">
                    <button class="count-btn" data-count="10">10 photos</button>
                    <button class="count-btn" data-count="25">25 photos</button>
                    <button class="count-btn" data-count="50">50 photos</button>
                    <button class="count-btn" data-count="100">100 photos</button>
                </div>
            </div>
        </div>
    `;
    document.querySelectorAll('.count-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const questionCount = parseInt(btn.dataset.count);
            await startPhotoGameWithCount(questionCount);
        });
    });
}

async function startPhotoGameWithCount(questionCount) {
    const gameArea = document.querySelector('.game-area');
    gameArea.innerHTML = `
        <div class="photo-game-container">
            <h2 class="quiz-title">Devinette Photo</h2>
            <div class="quiz-status-bar">
                ⏱️ <span id="time">--</span> s
                <span class="progress-bar-inline">Photo <span id="current-photo">1</span>/${questionCount}</span>
            </div>
            <div class="photo-question-block">
                <img src="" alt="Photo à deviner" class="mystery-photo">
                <div class="hints"></div>
                <div class="answer-input">
                    <input type="text" placeholder="Votre réponse...">
                    <button class="submit-answer">Valider</button>
                </div>
            </div>
            <button class="quit-btn">Terminer le jeu</button>
        </div>
    `;
    // TODO: Logique du jeu photo à compléter
}

// Fonction pour initialiser le jeu Action/Vérité
function initTruthDareGame() {
    const gameArea = document.querySelector('.game-area');
    gameArea.innerHTML = `
        <div class="truth-dare-container">
            <h2 class="quiz-title">Action / Vérité</h2>
            <div class="quiz-options">
                <h3>Choisissez un mode :</h3>
                <div class="truth-dare-mode-buttons">
                    <button class="mode-btn" data-mode="normal">Normal</button>
                    <button class="mode-btn" data-mode="alcool">Alcool</button>
                    <button class="mode-btn" data-mode="adulte">+18</button>
                </div>
            </div>
        </div>
    `;
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const selectedMode = btn.dataset.mode;
            showTruthDareCountSelection(selectedMode);
        });
    });
}

function showTruthDareCountSelection(selectedMode) {
    const gameArea = document.querySelector('.game-area');
    let modeLabel = 'Normal';
    if (selectedMode === 'alcool') modeLabel = 'Alcool';
    if (selectedMode === 'adulte') modeLabel = '+18';
    gameArea.innerHTML = `
        <div class="truth-dare-container">
            <h2 class="quiz-title">Action / Vérité - ${modeLabel}</h2>
            <div class="quiz-options">
                <h3>Choisissez le nombre de défis :</h3>
                <div class="question-count-buttons">
                    <button class="count-btn" data-count="10">10 défis</button>
                    <button class="count-btn" data-count="25">25 défis</button>
                    <button class="count-btn" data-count="50">50 défis</button>
                    <button class="count-btn" data-count="100">100 défis</button>
                </div>
            </div>
        </div>
    `;
    document.querySelectorAll('.count-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const questionCount = parseInt(btn.dataset.count);
            await startTruthDareWithCount(questionCount, selectedMode);
        });
    });
}

async function startTruthDareWithCount(questionCount, selectedMode) {
    const gameArea = document.querySelector('.game-area');
    let modeLabel = 'Normal';
    if (selectedMode === 'alcool') modeLabel = 'Alcool';
    if (selectedMode === 'adulte') modeLabel = '+18';
    gameArea.innerHTML = `
        <div class="truth-dare-container">
            <h2 class="quiz-title">Action / Vérité - ${modeLabel}</h2>
            <div class="quiz-status-bar">
                ⏱️ <span id="time">--</span> s
                <span class="progress-bar-inline">Défi <span id="current-challenge">1</span>/${questionCount}</span>
            </div>
            <div class="truth-dare-block">
                <p class="challenge-text">Chargement du défi...</p>
                <div class="action-buttons">
                    <button class="truth-btn">Vérité</button>
                    <button class="dare-btn">Action</button>
                    <button class="skip-btn">Passer</button>
                </div>
            </div>
            <button class="quit-btn">Terminer le jeu</button>
        </div>
    `;
    // TODO: Logique du jeu action/vérité à compléter
}

// Fonction utilitaire pour gérer le timer
function startTimer(duration, displayElement, onComplete) {
    let timer = duration;
    const countdown = setInterval(() => {
        displayElement.textContent = timer;
        
        if (--timer < 0) {
            clearInterval(countdown);
            if (onComplete) onComplete();
        }
    }, 1000);
    
    return countdown;
}

// Fonction pour revenir au menu principal
window.returnToMainMenu = function() {
    const gameArea = document.querySelector('.game-area');
    const modeSelection = document.querySelector('.mode-selection');
    
    gameArea.style.display = 'none';
    modeSelection.style.display = 'block';
} 