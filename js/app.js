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

// Variables pour la gestion des parties multi-joueurs
let peer = null;
let connections = [];
let isHost = false;
let gameCode = '';
let players = new Map(); // Map pour stocker les joueurs et leurs scores
let currentPlayerTurn = null;

// Exposer les fonctions globalement
window.startGame = startGame;
window.returnToMainMenu = returnToMainMenu;
window.createMultiplayerGame = createMultiplayerGame;
window.joinMultiplayerGame = joinMultiplayerGame;

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
        btn.addEventListener('click', window.handleAnswer, { once: true });
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

// --- ENVOI DE LA RÉPONSE AU HOST PAR LE CLIENT ---
let myPeerConnection = null; // Pour garder la connexion côté client

// Modif dans connectToHost pour garder la connexion
function connectToHost(playerName, hostCode) {
    // Nettoyer le code entré (majuscules, sans espaces)
    const cleanCode = hostCode.trim().toUpperCase();
    peer = new Peer();
    
    peer.on('open', (id) => {
        console.log('[CLIENT] PeerJS ouvert avec ID :', id);
        const conn = peer.connect(cleanCode);
        myPeerConnection = conn; // On garde la connexion pour l'envoi des réponses
        conn.on('open', () => {
            console.log('[CLIENT] Connecté à l\'hôte', cleanCode);
            conn.send({
                type: 'join',
                playerName: playerName,
                playerId: id
            });
        });

        conn.on('data', (data) => {
            handleHostData(data);
        });

        conn.on('error', (err) => {
            console.error('[CLIENT] Connexion PeerJS error:', err);
            showJoinError('Impossible de se connecter à la partie. Vérifie le code ou réessaie.');
        });
    });
    peer.on('error', (err) => {
        console.error('[CLIENT] PeerJS error:', err);
        showJoinError('Erreur réseau PeerJS. Réessaie ou change de code.');
    });
}

// --- ENVOI DE LA RÉPONSE AU HOST PAR LE CLIENT ---
function sendAnswerToHost(isCorrect) {
    if (myPeerConnection && myPeerConnection.open) {
        myPeerConnection.send({
            type: 'answer',
            isCorrect: isCorrect,
            playerId: peer.id
        });
    }
}

// --- MODIFIE handleAnswer POUR ENVOYER LA RÉPONSE AU HOST ---
const originalHandleAnswer = handleAnswer;
window.handleAnswer = function(event) {
    // Envoi au host si on est client
    if (!isHost && typeof sendAnswerToHost === 'function') {
        sendAnswerToHost(event.target.dataset.correct === 'true');
    }
    originalHandleAnswer.call(this, event);
};

// --- HOST : MET À JOUR LE SCORE DU JOUEUR ---
function handlePlayerData(playerId, data) {
    switch(data.type) {
        case 'join':
            players.set(playerId, { name: data.playerName, score: 0 });
            updatePlayersList();
            // Informer TOUS les joueurs de l'état actuel du jeu
            connections.forEach(conn => {
                conn.send({
                    type: 'gameState',
                    players: Array.from(players.entries())
                });
            });
            break;
        case 'answer':
            // Gérer la réponse du joueur
            if (data.isCorrect) {
                if (players.has(playerId)) {
                    players.get(playerId).score = (players.get(playerId).score || 0) + 1;
                }
            }
            break;
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
    gameArea.classList.remove('multiplayer-vertical-center');
    
    // Relancer la musique de fond
    window.soundManager.playBackground();
}

// Effet visuel lors de la réponse (placeholder)
function flashEffect(isCorrect) {
    // Tu peux ajouter un effet visuel ici si tu veux
}

// Fonction pour créer une partie multi-joueurs
async function createMultiplayerGame() {
    const gameArea = document.querySelector('.game-area');
    gameArea.classList.add('multiplayer-vertical-center');
    gameArea.innerHTML = `
        <div class="multiplayer-container fade-in">
            <h2>Créer une partie</h2>
            <div class="player-setup">
                <input type="text" id="player-name" placeholder="Votre pseudo" maxlength="20">
                <button id="create-game-btn">Créer la partie</button>
            </div>
            <div id="waiting-room" style="display: none;">
                <h3>Salle d'attente</h3>
                <div style="margin-bottom:0.5em; color:#b3e0fc; font-size:0.98em;">Code de la partie :</div>
                <div id="game-code" title="Clique pour copier le code"></div>
                <div style="font-size:0.85em; color:#b3e0fc; margin-bottom:1em;">Partage ce code à tes amis pour qu'ils rejoignent la partie</div>
                <div id="players-list"></div>
                <button id="start-game-btn" disabled>Démarrer la partie</button>
            </div>
            <button class="menu-btn" onclick="returnToMainMenu()">Retour au menu</button>
        </div>
    `;
    window.soundManager.setupMenuButtonSounds();

    document.getElementById('create-game-btn').addEventListener('click', () => {
        const playerName = document.getElementById('player-name').value.trim();
        if (playerName) {
            initializeHost(playerName);
        } else {
            alert('Veuillez entrer un pseudo');
        }
    });

    // Ajout du copier-coller sur le code de partie
    setTimeout(() => {
        const codeElem = document.getElementById('game-code');
        if (codeElem) {
            codeElem.addEventListener('click', () => {
                navigator.clipboard.writeText(codeElem.textContent);
                codeElem.style.background = '#38bdf8cc';
                codeElem.style.color = '#fff';
                setTimeout(() => {
                    codeElem.style.background = '';
                    codeElem.style.color = '';
                }, 700);
            });
        }
    }, 500);
}

// Fonction utilitaire pour générer un code de partie court et lisible
function generateShortGameCode(length = 6) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Pas de O, I, 1, 0 pour éviter confusion
    let code = '';
    for (let i = 0; i < length; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Fonction pour initialiser l'hôte
function initializeHost(playerName) {
    // Générer un code court et simple
    const shortCode = generateShortGameCode();
    // Utiliser le code court comme PeerJS ID
    peer = new Peer(shortCode);
    
    peer.on('open', (id) => {
        console.log('[HOST] PeerJS ouvert avec ID :', id);
        gameCode = id;
        isHost = true;
        players.set(id, { name: playerName, score: 0 });
        
        document.querySelector('.player-setup').style.display = 'none';
        document.getElementById('waiting-room').style.display = 'block';
        document.getElementById('game-code').textContent = gameCode;
        updatePlayersList();
        
        // Remplacer le bouton par "Choisir le mode de jeu"
        const startBtn = document.getElementById('start-game-btn');
        startBtn.textContent = 'Choisir le mode de jeu';
        startBtn.disabled = false;
        // Supprime tous les anciens listeners
        const newStartBtn = startBtn.cloneNode(true);
        startBtn.parentNode.replaceChild(newStartBtn, startBtn);
        newStartBtn.addEventListener('click', showMultiplayerModeSelection);
    });

    peer.on('connection', (conn) => {
        console.log('[HOST] Connexion entrante de', conn.peer);
        connections.push(conn);
        
        conn.on('open', () => {
            conn.on('data', (data) => {
                handlePlayerData(conn.id, data);
            });
        });
    });

    peer.on('error', (err) => {
        console.error('[HOST] PeerJS error:', err);
    });
}

// Fonction pour rejoindre une partie
function joinMultiplayerGame() {
    const gameArea = document.querySelector('.game-area');
    gameArea.classList.add('multiplayer-vertical-center');
    gameArea.innerHTML = `
        <div class="multiplayer-container fade-in">
            <h2>Rejoindre une partie</h2>
            <div class="join-game">
                <input type="text" id="player-name" placeholder="Votre pseudo" maxlength="20">
                <input type="text" id="game-code" placeholder="Code de la partie">
                <button id="join-game-btn">Rejoindre</button>
            </div>
            <button class="menu-btn" onclick="returnToMainMenu()">Retour au menu</button>
        </div>
    `;
    window.soundManager.setupMenuButtonSounds();

    document.getElementById('join-game-btn').addEventListener('click', () => {
        const playerName = document.getElementById('player-name').value.trim();
        const code = document.getElementById('game-code').value.trim();
        
        if (playerName && code) {
            connectToHost(playerName, code);
        } else {
            alert('Veuillez remplir tous les champs');
        }
    });
}

// Fonction pour gérer les données reçues par l'hôte
function handleHostData(data) {
    switch(data.type) {
        case 'gameState':
            // Afficher la salle d'attente et la liste des joueurs côté client
            const gameArea = document.querySelector('.game-area');
            gameArea.classList.add('multiplayer-vertical-center');
            const playersList = data.players.map(([id, player]) => `
                <div class="player-item">
                    <span class="player-name">${player.name}</span>
                </div>
            `).join('');
            gameArea.innerHTML = `
                <div class="multiplayer-container fade-in">
                    <h2>Salle d'attente</h2>
                    <div style="margin-bottom:0.5em; color:#b3e0fc; font-size:0.98em;">En attente du lancement de la partie...</div>
                    <div id="players-list">${playersList}</div>
                    <div style="font-size:0.85em; color:#b3e0fc; margin-bottom:1em;">Tu es bien connecté, attends que l'hôte démarre la partie.</div>
                    <button class="menu-btn" onclick="returnToMainMenu()">Retour au menu</button>
                </div>
            `;
            window.soundManager.setupMenuButtonSounds();
            break;
        case 'gameStart':
            // Réception du début de partie et des questions
            questions = data.questions;
            quizGameMode = data.gameMode;
            currentQuestionIndex = 0;
            score = 0;
            isAnswerSelected = false;

            // Définir le rendu de la question pour le client
            window.renderQuizQuestionScreen = function(index) {
                const gameArea = document.querySelector('.game-area');
                const modeLabel = gameModes[quizGameMode]?.title || '';
                gameArea.innerHTML = `
                    <h2 class="quiz-title">${modeLabel} - Multi-joueurs</h2>
                    <div class="quiz-status-bar">
                        ⏱️ <span id="time">${gameModes[quizGameMode].timePerQuestion}</span> s &nbsp;|&nbsp; Question <span id="current-question">${index+1}</span>/${questions.length}
                    </div>
                    <div class="question-bubble"><span class="question">Chargement de la question...</span></div>
                    <div class="answers"></div>
                    <div class="quiz-actions">
                        <button class="next-btn" style="display: none;">Question suivante</button>
                        <button class="quit-btn">Quitter le quiz</button>
                    </div>
                `;
                displayQuestion(index);
            };

            // Afficher la première question
            window.renderQuizQuestionScreen(currentQuestionIndex);
            break;
        case 'question':
            // Afficher la nouvelle question (pour la synchro avancée)
            break;
        case 'result':
            // Afficher les résultats
            break;
        case 'endGame':
            // Afficher l'écran de fin de partie avec le classement
            showMultiplayerResults(data.classement);
            break;
    }
}

// Fonction pour mettre à jour la liste des joueurs
function updatePlayersList() {
    const playersList = document.getElementById('players-list');
    if (playersList) {
        playersList.innerHTML = Array.from(players.entries())
            .map(([id, player]) => `
                <div class="player-item">
                    <span class="player-name">${player.name}</span>
                    <span class="player-score">${player.score}</span>
                </div>
            `).join('');
    }
}

// Affiche le choix du mode de jeu et du nombre de questions pour le multi-joueurs
function showMultiplayerModeSelection() {
    const gameArea = document.querySelector('.game-area');
    gameArea.innerHTML = `
        <div class="quiz-container fade-in">
            <h2 class="quiz-title">Choisis le mode de jeu</h2>
            <div class="game-modes-cards">
                <button class="game-mode-card multi-mode-btn" data-mode="quiz">
                    <span class="icon">🎯</span>
                    <span class="title">Quiz Culture Générale</span>
                    <span class="desc">Testez vos connaissances avec des questions variées</span>
                </button>
                <button class="game-mode-card multi-mode-btn" data-mode="photos">
                    <span class="icon">📸</span>
                    <span class="title">Devinettes Photos</span>
                    <span class="desc">Devinez ce qui se cache derrière les images</span>
                </button>
                <button class="game-mode-card multi-mode-btn" data-mode="truth-dare">
                    <span class="icon">🎲</span>
                    <span class="title">Action/Vérité</span>
                    <span class="desc">Choisissez entre une action ou une vérité</span>
                </button>
            </div>
            <button class="menu-btn" onclick="returnToMainMenu()">Retour au menu</button>
        </div>
    `;
    window.soundManager.setupMenuButtonSounds();
    document.querySelectorAll('.multi-mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.mode;
            showMultiplayerQuestionCountSelection(mode);
        });
    });
}

function showMultiplayerQuestionCountSelection(gameMode) {
    const gameArea = document.querySelector('.game-area');
    const modeLabel = gameModes[gameMode]?.title || '';
    
    gameArea.innerHTML = `
        <div class="quiz-container fade-in">
            <h2 class="quiz-title">${modeLabel} - Multi-joueurs</h2>
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
        btn.addEventListener('click', () => {
            const questionCount = parseInt(btn.dataset.count);
            startMultiplayerGame(gameMode, questionCount);
        });
    });

    addQuitButtonClickSound();
}

// Nouvelle version : démarre la partie multi-joueurs avec choix du mode et du nombre de questions
async function startMultiplayerGame(gameMode, questionCount) {
    console.log('Démarrage partie multijoueur:', gameMode, questionCount);
    // Charger les questions selon le mode choisi
    let data = await loadJsonData('data/questions.json');
    if (!data) {
        alert('Impossible de charger les questions.');
        return;
    }
    if (gameMode === 'quiz') {
        questions = shuffleArray([...data.quiz.questions]);
    } else if (gameMode === 'photos') {
        questions = shuffleArray([...data.photos.challenges]);
    } else if (gameMode === 'truth-dare') {
        questions = shuffleArray([...data.truthDare.questions]);
    } else {
        alert('Mode de jeu inconnu.');
        return;
    }
    if (questions.length > questionCount) {
        questions = questions.slice(0, questionCount);
    }
    quizGameMode = gameMode;
    currentQuestionIndex = 0;
    score = 0;
    isAnswerSelected = false;

    // Définir le rendu de la question pour le multi-joueurs
    window.renderQuizQuestionScreen = function(index) {
        const gameArea = document.querySelector('.game-area');
        const modeLabel = gameModes[quizGameMode]?.title || '';
        gameArea.innerHTML = `
            <h2 class="quiz-title">${modeLabel} - Multi-joueurs</h2>
            <div class="quiz-status-bar">
                ⏱️ <span id="time">${gameModes[quizGameMode].timePerQuestion}</span> s &nbsp;|&nbsp; Question <span id="current-question">${index+1}</span>/${questions.length}
            </div>
            <div class="question-bubble"><span class="question">Chargement de la question...</span></div>
            <div class="answers"></div>
            <div class="quiz-actions">
                <button class="next-btn" style="display: none;">Question suivante</button>
                <button class="quit-btn">Quitter le quiz</button>
            </div>
        `;
        displayQuestion(index);
    };

    // Informer tous les joueurs que la partie commence
    connections.forEach(conn => {
        conn.send({
            type: 'gameStart',
            questions: questions,
            gameMode: gameMode
        });
    });

    // Démarrer la partie pour l'hôte
    window.renderQuizQuestionScreen(currentQuestionIndex);
}
window.startMultiplayerGame = startMultiplayerGame;

// Affiche le classement final multijoueur
function showMultiplayerResults(classement) {
    const gameArea = document.querySelector('.game-area');
    window.soundManager.playResults();
    gameArea.innerHTML = `
        <div class="results-container" style="max-width: 420px; margin: 2.5rem auto; background: linear-gradient(135deg, #38bdf8 0%, #2563eb 100%); border-radius: 28px; box-shadow: 0 6px 32px #0002; color: #fff; padding: 2.2rem 1.2rem 2.2rem 1.2rem;">
            <div class="results-header" style="text-align:center; margin-bottom:1.5em;">
                <span class="results-icon" style="font-size:3.2rem;">🏆</span>
                <h2 class="results-title" style="font-size:2.1rem; font-weight:900; color:#ffe066; margin:0.5em 0 0.2em 0; text-shadow: 2px 2px 12px #0005, 0 0 18px #38bdf8cc;">Classement final</h2>
            </div>
            <div class="results-summary" style="width:100%;">
                <table style="width:100%;margin-bottom:1.2em; border-collapse:separate; border-spacing:0 0.5em;">
                    <thead>
                        <tr><th style="text-align:left;font-size:1.25rem;color:#b3e0fc;font-weight:700;">Joueur</th><th style="text-align:right;font-size:1.25rem;color:#b3e0fc;font-weight:700;">Score</th></tr>
                    </thead>
                    <tbody>
                        ${classement.map((player, i) => `
                            <tr style="background:${i===0?'rgba(255,224,102,0.13)':'transparent'}; border-radius:18px;">
                                <td style="text-align:left;font-weight:900;font-size:1.18rem;color:${i===0?'#ffe066':'#fff'};padding:0.4em 0 0.4em 0.2em;">${i+1}. ${player.name}</td>
                                <td style="text-align:right;font-weight:900;font-size:1.18rem;color:${i===0?'#ffe066':'#fff'};padding:0.4em 0.2em 0.4em 0;">${player.score}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            <button class="menu-btn" style="font-size:1.18rem;padding:1.1rem 2.2rem;margin-top:1.2em;" onclick="returnToMainMenu()">Retour au menu</button>
        </div>
    `;
    window.soundManager.setupMenuButtonSounds();
    addQuitButtonClickSound();
}

// Flag pour éviter de renvoyer le classement plusieurs fois
let hasSentEndGame = false;

function sendEndGameToAll() {
    if (hasSentEndGame) return;
    hasSentEndGame = true;
    // Génère le classement trié
    const classement = Array.from(players.values())
        .sort((a, b) => b.score - a.score);
    connections.forEach(conn => {
        conn.send({
            type: 'endGame',
            classement
        });
    });
    // Affiche aussi le classement côté hôte
    showMultiplayerResults(classement);
}

// Hook sur retour menu
const originalReturnToMainMenu = window.returnToMainMenu;
window.returnToMainMenu = function() {
    if (isHost && connections.length > 0 && !hasSentEndGame) {
        sendEndGameToAll();
        // NE PAS faire de retour auto, laisser l'hôte cliquer sur le bouton du classement
    } else {
        hasSentEndGame = false; // reset pour la prochaine partie
        originalReturnToMainMenu();
    }
};

// Hook sur fermeture onglet
window.addEventListener('beforeunload', function(e) {
    if (isHost && connections.length > 0) {
        sendEndGameToAll();
    }
});