// Gestionnaire de sons pour le jeu
class SoundManager {
    constructor() {
        this.sounds = {
            background: new Audio('sounds/background.wav'),
            click: new Audio('sounds/click.wav'),
            correct: new Audio('sounds/correct.wav'),
            wrong: new Audio('sounds/wrong.wav'),
            timer: new Audio('sounds/timer.wav'),
            results: new Audio('sounds/results.wav')
        };

        // Configuration des sons
        this.sounds.background.loop = true;
        this.sounds.background.volume = 0.3;
        this.sounds.click.volume = 0.5;
        this.sounds.correct.volume = 0.6;
        this.sounds.wrong.volume = 0.6;
        this.sounds.timer.volume = 0.4;
        this.sounds.results.volume = 0.7;

        // État du son
        this.isMuted = false;
        this.isBackgroundPlaying = false;

        // Lancer la musique de fond au chargement
        this.playBackground();

        // Ajouter les sons de clic aux boutons du menu
        this.setupMenuButtonSounds();
    }

    // Configuration des sons pour les boutons du menu
    setupMenuButtonSounds() {
        // Ajouter le son aux boutons de mode de jeu
        document.querySelectorAll('.game-mode-card, .mode-btn, .count-btn, .menu-btn').forEach(btn => {
            btn.addEventListener('click', () => this.playClick());
        });

        // Ajouter le son au bouton de son
        const soundToggle = document.getElementById('sound-toggle');
        if (soundToggle) {
            soundToggle.addEventListener('click', () => this.playClick());
        }
    }

    // Jouer la musique de fond
    playBackground() {
        if (!this.isMuted && !this.isBackgroundPlaying) {
            this.sounds.background.play().catch(error => {
                console.log('Erreur lors de la lecture de la musique de fond:', error);
            });
            this.isBackgroundPlaying = true;
        }
    }

    // Arrêter la musique de fond
    stopBackground() {
        this.sounds.background.pause();
        this.sounds.background.currentTime = 0;
        this.isBackgroundPlaying = false;
    }

    // Jouer un son de clic
    playClick() {
        if (!this.isMuted) {
            this.sounds.click.currentTime = 0;
            this.sounds.click.play().catch(error => {
                console.log('Erreur lors de la lecture du son de clic:', error);
            });
        }
    }

    // Jouer un son de bonne réponse
    playCorrect() {
        if (!this.isMuted) {
            this.sounds.correct.currentTime = 0;
            this.sounds.correct.play().catch(error => {
                console.log('Erreur lors de la lecture du son de bonne réponse:', error);
            });
        }
    }

    // Jouer un son de mauvaise réponse
    playWrong() {
        if (!this.isMuted) {
            this.sounds.wrong.currentTime = 0;
            this.sounds.wrong.play().catch(error => {
                console.log('Erreur lors de la lecture du son de mauvaise réponse:', error);
            });
        }
    }

    // Jouer le son du chronomètre (une seule fois)
    playTimer() {
        if (!this.isMuted) {
            this.sounds.timer.currentTime = 0;
            this.sounds.timer.play().catch(error => {
                console.log('Erreur lors de la lecture du son du chronomètre:', error);
            });
        }
    }

    // Jouer le son du timer en boucle
    playTimerLoop() {
        if (!this.isMuted) {
            this.sounds.timer.loop = true;
            this.sounds.timer.currentTime = 0;
            this.sounds.timer.play().catch(error => {
                console.log('Erreur lors de la lecture du son du timer (loop):', error);
            });
        }
    }

    // Stopper le son du timer
    stopTimerLoop() {
        this.sounds.timer.pause();
        this.sounds.timer.currentTime = 0;
        this.sounds.timer.loop = false;
    }

    // Jouer le son de résultats
    playResults() {
        if (!this.isMuted) {
            this.sounds.results.currentTime = 0;
            this.sounds.results.play().catch(error => {
                console.log('Erreur lors de la lecture du son de résultats:', error);
            });
        }
    }

    // Activer/désactiver le son
    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.isMuted) {
            this.stopBackground();
        } else {
            this.playBackground();
        }
        return this.isMuted;
    }
}

// Créer une instance globale du gestionnaire de sons
window.soundManager = new SoundManager(); 