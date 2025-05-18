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

// Exposer les fonctions globalement
window.startGame = startGame;
window.returnToMainMenu = returnToMainMenu;

// Gestionnaire d'événements pour les boutons de mode de jeu
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM chargé, initialisation des boutons...');
    document.querySelectorAll('.game-mode-btn').forEach(button => {
        button.addEventListener('click', () => {
            const mode = button.dataset.mode;
            console.log('Mode sélectionné:', mode);
            startGame(mode);
        });
    });
    // Lancer la musique de fond dès l'arrivée sur la page principale
    window.soundManager.playBackground();
});

// === VARIABLES GLOBALES POUR LE QUIZ CULTURE GENERALE ===
let currentQuestionIndex = 0;
let score = 0;
let timerInterval;
let isAnswerSelected = false;
let questions = [];
let quizGameMode = '';

// Timer générique pour les questions
function startTimer(duration, display, onEnd) {
    let timer = duration;
    display.textContent = timer;
    const interval = setInterval(() => {
        timer--;
        display.textContent = timer;
        if (timer <= 0) {
            clearInterval(interval);
            if (typeof onEnd === 'function') onEnd();
        }
    }, 1000);
    return interval;
}

// Fonction pour démarrer un jeu
function startGame(mode) {
    console.log('Démarrage du jeu en mode:', mode);
    const gameArea = document.querySelector('.game-area');
    const modeSelection = document.querySelector('.home-hero');
    
    // Cacher la sélection de mode et afficher la zone de jeu
    modeSelection.style.display = 'none';
    gameArea.style.display = 'block';
    
    // Démarrer la musique de fond
    window.soundManager.playBackground();
    
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
        default:
            console.error('Mode de jeu inconnu:', mode);
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

// Fonction pour charger les données depuis un fichier JSON
async function loadJsonData(filePath) {
    try {
        const response = await fetch(filePath);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
        return null;
    }
}

// Fonction pour initialiser le jeu Quiz
async function initQuizGame() {
    const data = await loadJsonData('data/questions.json');
    if (!data) return;
    
    const gameArea = document.querySelector('.game-area');
    gameArea.innerHTML = `
        <div class="quiz-container fade-in">
            <h2 class="quiz-title">${gameModes.quiz.title}</h2>
            <div class="game-modes-cards">
                <button class="game-mode-card mode-btn" data-mode="master">
                    <span class="icon">👑</span>
                    <span class="title">Mode Maître du jeu</span>
                    <span class="desc">Une seule personne pose les questions</span>
                </button>
                <button class="game-mode-card mode-btn" data-mode="pass">
                    <span class="icon">🔄</span>
                    <span class="title">Mode Passe à ton voisin</span>
                    <span class="desc">Le téléphone passe entre les joueurs</span>
                </button>
            </div>
            <button class="menu-btn" onclick="returnToMainMenu()">Retour au menu</button>
        </div>
    `;
    window.soundManager.setupMenuButtonSounds();

    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.mode;
            showQuestionCountSelection(mode);
        });
    });

    addQuitButtonClickSound();
}

function showQuestionCountSelection(gameMode) {
    const gameArea = document.querySelector('.game-area');
    const modeLabel = gameMode === 'master' ? 'Maître du jeu' : 'Passe à ton voisin';
    
    gameArea.innerHTML = `
        <div class="quiz-container fade-in">
            <h2 class="quiz-title">${gameModes.quiz.title} - ${modeLabel}</h2>
            <div class="game-modes-cards">
                <button class="game-mode-card count-btn" data-count="10">10 questions</button>
                <button class="game-mode-card count-btn" data-count="25">25 questions</button>
                <button class="game-mode-card count-btn" data-count="50">50 questions</button>
                <button class="game-mode-card count-btn" data-count="100">100 questions</button>
            </div>
            <button class="menu-btn" onclick="returnToMainMenu()">Retour au menu</button>
        </div>
    `;
    window.soundManager.setupMenuButtonSounds();

    document.querySelectorAll('.count-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const questionCount = parseInt(btn.dataset.count);
            await startQuizWithCount(questionCount, gameMode);
        });
    });

    addQuitButtonClickSound();
}

// Fonction utilitaire pour le son du bouton quitter (évite l'erreur JS)
function addQuitButtonClickSound() {
    // À compléter si besoin
}

async function startQuizWithCount(questionCount, gameMode) {
    try {
        const response = await fetch('data/questions.json');
        const data = await response.json();
        questions = [...data.quiz.questions];
        // Mélanger les questions
        questions = shuffleArray(questions);
        // Limiter le nombre de questions si nécessaire
        if (questions.length > questionCount) {
            questions = questions.slice(0, questionCount);
        }
        quizGameMode = gameMode;
        currentQuestionIndex = 0;
        score = 0;
        isAnswerSelected = false;

        const gameArea = document.querySelector('.game-area');
        const modeLabel = gameMode === 'master' ? 'Maître du jeu' : 'Passe à ton voisin';

        function renderQuizQuestionScreen(index) {
            gameArea.innerHTML = `
                <h2 class="quiz-title">${gameModes.quiz.title} - ${modeLabel}</h2>
                <div class="quiz-status-bar">
                    ⏱️ <span id="time">${gameModes.quiz.timePerQuestion}</span> s &nbsp;|&nbsp; Question <span id="current-question">${index+1}</span>/${questions.length}
                </div>
                <div class="question-bubble"><span class="question">Chargement de la question...</span></div>
                <div class="answers"></div>
                <div class="quiz-actions">
                    <button class="next-btn" style="display: none;">Question suivante</button>
                    <button class="quit-btn">Quitter le quiz</button>
                </div>
            `;
            displayQuestion(index);
        }
        // Exposer la fonction pour l'utiliser dans showPassPhoneScreen
        window.renderQuizQuestionScreen = renderQuizQuestionScreen;
        // Initialisation
        renderQuizQuestionScreen(currentQuestionIndex);
    } catch (error) {
        console.error('Erreur lors du chargement des questions:', error);
        const gameArea = document.querySelector('.game-area');
        gameArea.innerHTML = `
            <div class="error-container">
                <h2>Erreur</h2>
                <p>Impossible de charger les questions. Veuillez réessayer.</p>
                <button onclick="returnToMainMenu()">Retour au menu</button>
            </div>
        `;
    }
}

// === FONCTIONS DE GESTION DU QUIZ (UTILISENT LES VARIABLES GLOBALES) ===
function displayQuestion(index) {
    isAnswerSelected = false;
    const question = questions[index];
    document.querySelector('.question-bubble .question').textContent = question.question;
    document.getElementById('current-question').textContent = (index + 1);
    
    const answersContainer = document.querySelector('.answers');
    const correctAnswer = question.answers[question.correctAnswer];
    const shuffledAnswers = [...question.answers];
    shuffleArray(shuffledAnswers);
    const newCorrectIndex = shuffledAnswers.indexOf(correctAnswer);
    answersContainer.innerHTML = shuffledAnswers.map((answer, i) => `
        <button class="answer-btn" data-index="${i}" data-correct="${i === newCorrectIndex}" type="button">${answer}</button>
    `).join('');
    
    document.querySelectorAll('.answer-btn').forEach(btn => {
        btn.addEventListener('click', handleAnswer, { once: true });
    });
    
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    const timeDisplay = document.getElementById('time');
    timeDisplay.textContent = gameModes.quiz.timePerQuestion;
    timerInterval = startTimer(gameModes.quiz.timePerQuestion, timeDisplay, () => {
        if (!isAnswerSelected) {
            showCorrectAnswer();
        }
    });

    // Ajout des listeners pour les boutons à chaque affichage de question
    const nextBtn = document.querySelector('.next-btn');
    if (nextBtn) {
        nextBtn.onclick = () => {
            if (currentQuestionIndex < questions.length - 1) {
                currentQuestionIndex++;
                displayQuestion(currentQuestionIndex);
            } else {
                showResults();
            }
        };
    }
    const quitBtn = document.querySelector('.quit-btn');
    if (quitBtn) {
        quitBtn.onclick = () => {
            returnToMainMenu();
        };
    }
}

function handleAnswer(event) {
    if (isAnswerSelected) return;
    isAnswerSelected = true;

    const selectedIndex = parseInt(event.target.dataset.index);
    const isCorrect = event.target.dataset.correct === 'true';

    document.querySelectorAll('.answer-btn').forEach(btn => {
        btn.disabled = true;
        if (btn.dataset.correct === 'true') {
            btn.classList.add('correct');
        } else if (parseInt(btn.dataset.index) === selectedIndex) {
            btn.classList.add('wrong');
        }
    });

    if (isCorrect) {
        score++;
        window.soundManager.playCorrect();
    } else {
        window.soundManager.playWrong();
    }

    flashEffect(isCorrect);
    if (timerInterval) clearInterval(timerInterval);
    const nextBtn = document.querySelector('.next-btn');
    if (nextBtn) nextBtn.style.display = 'block';
}

function showCorrectAnswer() {
    if (isAnswerSelected) return;
    isAnswerSelected = true;

    document.querySelectorAll('.answer-btn').forEach(btn => {
        btn.disabled = true;
        if (btn.dataset.correct === 'true') {
            btn.classList.add('correct');
        }
    });

    if (timerInterval) clearInterval(timerInterval);
    const nextBtn = document.querySelector('.next-btn');
    if (nextBtn) nextBtn.style.display = 'block';
}

function showResults() {
    const totalQuestions = questions.length;
    const questionsAnswered = Math.min(currentQuestionIndex + 1, totalQuestions);
    const percentage = totalQuestions > 0 ? Math.round((score / questionsAnswered) * 100) : 0;
    window.soundManager.playResults();
    const gameArea = document.querySelector('.game-area');
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
    window.soundManager.setupMenuButtonSounds();
    addQuitButtonClickSound();
}

function showPassPhoneScreen(currentQuestionIndex, totalQuestions, onContinue) {
    const gameArea = document.querySelector('.game-area');
    // Forcer le style sur gameArea pour éviter les bandes
    gameArea.style.width = '100vw';
    gameArea.style.height = '100vh';
    gameArea.style.padding = '0';
    gameArea.style.margin = '0';
    gameArea.style.background = 'linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%)';
    gameArea.innerHTML = `
        <div class="pass-phone-screen fade-in" style="width:100vw; height:100vh; min-height:100vh; margin:0; padding:0; display:flex; flex-direction:column; justify-content:center; align-items:center; color:#fff;">
            <div class="big-question-label fade-in-delay0" style="font-size: 1.3rem; font-weight: 700; margin-bottom: 1.2rem; color: #fff; letter-spacing: 0.01em;">Question ${currentQuestionIndex + 1} / ${totalQuestions}</div>
            <span class="phone-emoji bounce-in" style="font-size: 3.5rem; margin-bottom: 1.2rem;">📱</span>
            <h2 class="pass-title fade-in-delay1" style="font-size: 2rem; font-weight: 800; margin-bottom: 2.2rem; color: #fff; text-align: center;">Passe le téléphone au joueur suivant !</h2>
            <button class="next-btn fade-in-delay2" style="background: linear-gradient(90deg, var(--primary-color) 0%, var(--secondary-color) 100%); color: #fff; border: none; border-radius: 18px; padding: 1rem 2.5rem; font-size: 1.25rem; font-weight: 700; box-shadow: 0 2px 16px rgba(0,0,0,0.10); cursor: pointer;">Continuer</button>
        </div>
    `;
    document.querySelector('.next-btn').addEventListener('click', () => {
        setTimeout(() => {
            if (typeof onContinue === 'function') {
                // Utiliser la fonction globale pour afficher la question suivante
                if (window.renderQuizQuestionScreen) {
                    window.renderQuizQuestionScreen(currentQuestionIndex);
                } else {
                    onContinue();
                }
            }
        }, 10);
    });
}

// Fonction pour initialiser le jeu Photos
async function initPhotoGame() {
    const data = await loadJsonData('data/questions.json');
    if (!data) return;
    
    const gameArea = document.querySelector('.game-area');
    gameArea.innerHTML = `
        <div class="photo-game-container fade-in">
            <h2 class="quiz-title">Devinette Photo</h2>
            <div class="game-modes-cards">
                <button class="game-mode-card count-btn" data-count="10">10 photos</button>
                <button class="game-mode-card count-btn" data-count="25">25 photos</button>
                <button class="game-mode-card count-btn" data-count="50">50 photos</button>
                <button class="game-mode-card count-btn" data-count="100">100 photos</button>
            </div>
            <button class="menu-btn" onclick="returnToMainMenu()">Retour au menu</button>
        </div>
    `;
    window.soundManager.setupMenuButtonSounds();
    document.querySelectorAll('.count-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const questionCount = parseInt(btn.dataset.count);
            await startPhotoGameWithCount(questionCount);
        });
    });

    addQuitButtonClickSound();
}

async function startPhotoGameWithCount(questionCount) {
    try {
        const response = await fetch('data/questions.json');
        const data = await response.json();
        let challenges = [...data.photos.challenges];
        
        // Mélanger les défis
        challenges = shuffleArray(challenges);
        
        // Limiter le nombre de défis
        challenges = challenges.slice(0, questionCount);

        const gameArea = document.querySelector('.game-area');
        gameArea.innerHTML = `
            <div class="photo-game-container fade-in">
                <h2 class="quiz-title">Devinette Photo</h2>
                <div class="game-modes-cards">
                    <button class="game-mode-card count-btn" data-count="10">10 photos</button>
                    <button class="game-mode-card count-btn" data-count="25">25 photos</button>
                    <button class="game-mode-card count-btn" data-count="50">50 photos</button>
                    <button class="game-mode-card count-btn" data-count="100">100 photos</button>
                </div>
                <button class="menu-btn" onclick="returnToMainMenu()">Retour au menu</button>
            </div>
        `;
        window.soundManager.setupMenuButtonSounds();

        let currentQuestionIndex = 0;
        let score = 0;
        let timerInterval;
        let isAnswerSelected = false;

        const nextBtn = document.querySelector('.next-btn');
        const quitBtn = document.querySelector('.quit-btn');

        function displayQuestion(index) {
            isAnswerSelected = false;
            const challenge = challenges[index];
            // Mélanger les réponses tout en gardant trace de la bonne réponse
            const correctAnswer = challenge.answers[challenge.correctAnswer];
            const shuffledAnswers = [...challenge.answers];
            shuffleArray(shuffledAnswers);
            const newCorrectIndex = shuffledAnswers.indexOf(correctAnswer);

            // Générer la structure identique au quiz classique
            gameArea.innerHTML = `
                <div class="quiz-container fade-in">
                    <h2 class="quiz-title">${gameModes.photos.title}</h2>
                    <div class="quiz-status-bar">
                        ⏱️ <span id="time">${gameModes.photos.timePerQuestion}</span> s &nbsp;|&nbsp; Photo <span id="current-question">${index+1}</span>/${challenges.length}
                    </div>
                    <div class="question-bubble">
                        <img src="${challenge.image}" alt="Photo à deviner" class="mystery-photo" />
                    </div>
                    <div class="answers">
                        ${shuffledAnswers.map((answer, i) => `
                            <button class="answer-btn" data-index="${i}" data-correct="${i === newCorrectIndex}" type="button">${answer}</button>
                        `).join('')}
                    </div>
                    <div class="quiz-actions">
                        <button class="next-btn" style="display: none;">Photo suivante</button>
                        <button class="quit-btn" style="display: block;">Quitter le quiz</button>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Erreur lors du chargement des questions:', error);
        const gameArea = document.querySelector('.game-area');
        gameArea.innerHTML = `
            <div class="error-container">
                <h2>Erreur</h2>
                <p>Impossible de charger les questions. Veuillez réessayer.</p>
                <button onclick="returnToMainMenu()">Retour au menu</button>
            </div>
        `;
    }
}

// Fonction pour retourner au menu principal
function returnToMainMenu() {
    const gameArea = document.querySelector('.game-area');
    const modeSelection = document.querySelector('.home-hero');
    
    // Réinitialiser les variables globales
    currentQuestionIndex = 0;
    score = 0;
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    isAnswerSelected = false;
    questions = [];
    quizGameMode = '';
    
    // Afficher le menu principal et cacher la zone de jeu
    modeSelection.style.display = 'flex';
    gameArea.style.display = 'none';
    
    // Relancer la musique de fond
    window.soundManager.playBackground();
}

// Effet visuel lors de la réponse (placeholder)
function flashEffect(isCorrect) {
    // Tu peux ajouter un effet visuel ici si tu veux
}