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
    answersContainer.innerHTML = question.answers.map((answer, i) => `
        <button class="answer-btn" data-index="${i}" type="button" tabindex="-1">${answer}</button>
    `).join('');
    setTimeout(() => {
        document.querySelectorAll('.answer-btn').forEach(btn => btn.blur());
    }, 30);
    document.querySelectorAll('.answer-btn').forEach(btn => {
        btn.addEventListener('click', handleAnswer, { once: true });
    });
    setTimeout(() => {
        document.querySelectorAll('.answer-btn').forEach(btn => btn.blur());
    }, 200);
    if (timerInterval) {
        clearInterval(timerInterval);
        const overlay = getFlashOverlay();
        overlay.classList.remove('flash-warning');
        window.soundManager.stopTimerLoop();
    }
    const timeDisplay = document.getElementById('time');
    timeDisplay.textContent = gameModes.quiz.timePerQuestion;
    timerInterval = startTimer(gameModes.quiz.timePerQuestion, timeDisplay, () => {
        if (!isAnswerSelected) {
            showCorrectAnswer();
        }
    });
    // Bouton suivante
    const nextBtn = document.querySelector('.next-btn');
    if (nextBtn) {
        nextBtn.onclick = () => {
            if (currentQuestionIndex < questions.length - 1) {
                currentQuestionIndex++;
                if (quizGameMode === 'pass') {
                    showPassPhoneScreen(currentQuestionIndex, questions.length, () => displayQuestion(currentQuestionIndex));
                } else {
                    displayQuestion(currentQuestionIndex);
                }
            } else {
                showResults();
            }
        };
    }
    // Bouton quitter
    const quitBtn = document.querySelector('.quit-btn');
    if (quitBtn) {
        quitBtn.onclick = showResults;
    }
}

function handleAnswer(event) {
    if (isAnswerSelected) return;
    isAnswerSelected = true;
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
        window.soundManager.playCorrect();
    } else {
        window.soundManager.playWrong();
    }
    flashEffect(selectedIndex === question.correctAnswer);
    if (timerInterval) clearInterval(timerInterval);
    
    // Si on est en mode "pass", afficher la correction 5 secondes puis passer à l'écran de passage
    if (quizGameMode === 'pass') {
        setTimeout(() => {
            if (currentQuestionIndex < questions.length - 1) {
                currentQuestionIndex++;
                showPassPhoneScreen(currentQuestionIndex, questions.length, () => window.renderQuizQuestionScreen(currentQuestionIndex));
            } else {
                showResults();
            }
        }, 5000);
    } else {
        // En mode normal, afficher le bouton suivant
        const nextBtn = document.querySelector('.next-btn');
        if (nextBtn) nextBtn.style.display = 'block';
    }
}

function showCorrectAnswer() {
    if (isAnswerSelected) return;
    isAnswerSelected = true;
    const question = questions[currentQuestionIndex];
    document.querySelectorAll('.answer-btn').forEach((btn, i) => {
        btn.disabled = true;
        if (i === question.correctAnswer) {
            btn.classList.add('correct');
        }
    });
    if (quizGameMode === 'pass') {
        setTimeout(() => {
            if (currentQuestionIndex < questions.length - 1) {
                currentQuestionIndex++;
                showPassPhoneScreen(currentQuestionIndex, questions.length, () => window.renderQuizQuestionScreen(currentQuestionIndex));
            } else {
                showResults();
            }
        }, 5000);
    } else {
        const nextBtn = document.querySelector('.next-btn');
        if (nextBtn) nextBtn.style.display = 'block';
    }
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
            window.soundManager.setupMenuButtonSounds();

            // Ajouter les event listeners
            document.querySelectorAll('.answer-btn').forEach(btn => {
                btn.disabled = false;
                btn.addEventListener('click', handleAnswer, { once: true });
            });

            // Mettre à jour le compteur
            document.getElementById('current-question').textContent = (index + 1);

            // Réinitialiser le timer
            const timeDisplay = document.getElementById('time');
            timeDisplay.textContent = gameModes.photos.timePerQuestion;
            if (timerInterval) clearInterval(timerInterval);
            timerInterval = startTimer(gameModes.photos.timePerQuestion, timeDisplay, () => {
                if (!isAnswerSelected) {
                    showCorrectAnswer();
                }
            });

            // Réattacher les boutons suivant/quitter
            const nextBtn = document.querySelector('.next-btn');
            const quitBtn = document.querySelector('.quit-btn');
            nextBtn.addEventListener('click', () => {
                if (currentQuestionIndex < challenges.length - 1) {
                    currentQuestionIndex++;
                    displayQuestion(currentQuestionIndex);
                    nextBtn.style.display = 'none';
                } else {
                    showResults();
                }
            });
            quitBtn.addEventListener('click', showResults);
        }

        function handleAnswer(event) {
            if (isAnswerSelected) return;
            isAnswerSelected = true;

            const selectedIndex = parseInt(event.target.dataset.index);
            const isCorrect = event.target.dataset.correct === 'true';

            // Désactiver tous les boutons
            document.querySelectorAll('.answer-btn').forEach(btn => {
                btn.disabled = true;
                if (btn.dataset.correct === 'true') {
                    btn.classList.add('correct');
                } else if (parseInt(btn.dataset.index) === selectedIndex) {
                    btn.classList.add('wrong');
                }
            });

            // Mettre à jour le score
            if (isCorrect) {
                score++;
                window.soundManager.playCorrect();
            } else {
                window.soundManager.playWrong();
            }

            // Effet visuel
            flashEffect(isCorrect);

            // Arrêter le timer
            if (timerInterval) clearInterval(timerInterval);

            // Afficher le bouton suivant (corrigé)
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
            nextBtn.style.display = 'block';
        }

        function showResults() {
            const totalQuestions = challenges.length;
            const questionsAnswered = Math.min(currentQuestionIndex + 1, totalQuestions);
            const percentage = Math.round((score / questionsAnswered) * 100);

            // Jouer le son de résultats
            window.soundManager.playResults();

            gameArea.innerHTML = `
                <div class="results-container">
                    <div class="results-header">
                        <span class="results-icon">🎉</span>
                        <h2 class="results-title">Quiz photo terminé !</h2>
                    </div>
                    <div class="results-summary">
                        <div class="results-row">
                            <span class="results-label">Photos devinées</span>
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

        // Démarrer avec la première question
        displayQuestion(currentQuestionIndex);

    } catch (error) {
        console.error('Erreur:', error);
        gameArea.innerHTML = `
            <div class="error-container">
                <h2>Erreur</h2>
                <p>Impossible de charger les photos. Veuillez réessayer.</p>
                <button onclick="returnToMainMenu()">Retour au menu</button>
            </div>
        `;
    }
}

// Fonction pour initialiser le jeu Action/Vérité
async function initTruthDareGame() {
    const data = await loadJsonData('data/questions.json');
    if (!data) return;
    
    const gameArea = document.querySelector('.game-area');
    gameArea.innerHTML = `
        <div class="truth-dare-container fade-in">
            <h2 class="quiz-title">Action / Vérité</h2>
            <div class="game-modes-cards">
                <button class="game-mode-card" data-mode="normal">
                    <span class="icon">🎲</span>
                    <span class="title">Normal</span>
                    <span class="desc">Défis classiques pour tous</span>
                </button>
                <button class="game-mode-card" data-mode="alcool">
                    <span class="icon">🍻</span>
                    <span class="title">Alcool</span>
                    <span class="desc">Défis à boire, à consommer avec modération</span>
                </button>
                <button class="game-mode-card" data-mode="adulte">
                    <span class="icon">🔞</span>
                    <span class="title">+18</span>
                    <span class="desc">Défis réservés aux adultes</span>
                </button>
            </div>
            <button class="menu-btn" onclick="returnToMainMenu()">Retour au menu</button>
        </div>
    `;
    window.soundManager.setupMenuButtonSounds();
    document.querySelectorAll('.game-mode-card').forEach(btn => {
        btn.addEventListener('click', () => {
            const selectedMode = btn.dataset.mode;
            showTruthDareCountSelection(selectedMode);
        });
    });

    addQuitButtonClickSound();
}

function showTruthDareCountSelection(selectedMode) {
    const gameArea = document.querySelector('.game-area');
    let modeLabel = 'Normal';
    if (selectedMode === 'alcool') modeLabel = 'Alcool';
    if (selectedMode === 'adulte') modeLabel = '+18';
    gameArea.innerHTML = `
        <div class="truth-dare-container fade-in">
            <h2 class="quiz-title">Action / Vérité - ${modeLabel}</h2>
            <div class="game-modes-cards">
                <button class="game-mode-card count-btn" data-count="10">10 défis</button>
                <button class="game-mode-card count-btn" data-count="25">25 défis</button>
                <button class="game-mode-card count-btn" data-count="50">50 défis</button>
                <button class="game-mode-card count-btn" data-count="100">100 défis</button>
            </div>
            <button class="menu-btn" onclick="returnToMainMenu()">Retour au menu</button>
        </div>
    `;
    window.soundManager.setupMenuButtonSounds();
    document.querySelectorAll('.count-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const questionCount = parseInt(btn.dataset.count);
            await startTruthDareWithCount(questionCount, selectedMode);
        });
    });

    addQuitButtonClickSound();
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

// Fonction utilitaire pour obtenir ou créer l'overlay de flash global
function getFlashOverlay() {
    let overlay = document.querySelector('.flash-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'flash-overlay';
        document.body.appendChild(overlay);
    }
    return overlay;
}

// Fonction utilitaire pour effet visuel de clignotement
function flashEffect(isCorrect) {
    const overlay = getFlashOverlay();
    // Supprimer toutes les classes d'animation existantes
    overlay.classList.remove('flash-correct', 'flash-wrong', 'flash-warning');
    // Forcer un reflow pour réinitialiser l'animation
    void overlay.offsetWidth;
    // Ajouter la nouvelle classe d'animation
    overlay.classList.add(isCorrect ? 'flash-correct' : 'flash-wrong');
    // Supprimer la classe après l'animation
    setTimeout(() => {
        overlay.classList.remove('flash-correct', 'flash-wrong');
    }, 500);
}

// Fonction utilitaire pour gérer le timer avec effet warning global
function startTimer(duration, displayElement, onComplete) {
    let timer = duration;
    const overlay = getFlashOverlay();
    let timerLoopStarted = false;
    
    // Nettoyer l'ancien timer et son effet
    if (timerInterval) {
        clearInterval(timerInterval);
        overlay.classList.remove('flash-warning');
        window.soundManager.stopTimerLoop();
    }

    const countdown = setInterval(() => {
        displayElement.textContent = timer;
        // Effet warning global
        if (timer <= 10 && timer > 0) {
            overlay.classList.add('flash-warning');
            if (!timerLoopStarted) {
                window.soundManager.playTimerLoop();
                timerLoopStarted = true;
            }
        } else {
            overlay.classList.remove('flash-warning');
            if (timerLoopStarted) {
                window.soundManager.stopTimerLoop();
                timerLoopStarted = false;
            }
        }
        if (--timer < 0) {
            clearInterval(countdown);
            overlay.classList.remove('flash-warning');
            if (timerLoopStarted) {
                window.soundManager.stopTimerLoop();
                timerLoopStarted = false;
            }
            if (onComplete) onComplete();
            
            // Si on est en mode "pass", afficher directement l'écran de passage du téléphone
            if (quizGameMode === 'pass' && !isAnswerSelected) {
                if (currentQuestionIndex < questions.length - 1) {
                    currentQuestionIndex++;
                    showPassPhoneScreen(currentQuestionIndex, questions.length, () => displayQuestion(currentQuestionIndex));
                } else {
                    showResults();
                }
            } else {
                // En mode normal, afficher le bouton suivant
                const nextBtn = document.querySelector('.next-btn');
                if (nextBtn) nextBtn.style.display = 'block';
            }
        }
    }, 1000);
    return countdown;
}

// Fonction pour revenir au menu principal
function returnToMainMenu() {
    const gameArea = document.querySelector('.game-area');
    const modeSelection = document.querySelector('.home-hero');
    
    // Démarrer la musique de fond (si elle n'est pas déjà en cours)
    window.soundManager.playBackground();
    
    gameArea.style.display = 'none';
    modeSelection.style.display = 'block';
}

// Ajout du son de clic sur tous les boutons 'Quitter le quiz' après chaque rendu dynamique
function addQuitButtonClickSound() {
    document.querySelectorAll('.quit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            window.soundManager.playClick();
        });
    });
} 