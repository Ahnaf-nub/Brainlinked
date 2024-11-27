// content.js
class BrainRotDetector {
    constructor() {
        this.stats = {
            postsBlocked: 0,
            timeSaved: 0,
            siteStats: {}
        };
        this.startTime = Date.now();
        this.trendingWords = ['skibidi', 'rizz', 'bussin', 'no cap', 'fr fr'];
        this.socialMediaDomains = {
            'linkedin.com': 'LinkedIn',
            'twitter.com': 'Twitter',
            'facebook.com': 'Facebook',
            'instagram.com': 'Instagram'
        };
        this.memeVocab = [
            'fr fr', 'no cap', 'bussin', 'skibidi', 'rizz',
            'gyatt', 'based', 'L', 'sus', 'sheesh', 'those who know', 'mango mango mango', 'still water'
        ];
        this.brainCells = 3;
        this.memeLevel = 0;
        this.rizzScore = 100;
    }

    async initialize() {
        this.loadSettings();
        this.setupObserver();
        this.trackTimeSpent();
        this.detectTrendingWords();
        this.updateStats();
    }

    generateReplacement() {
        const templates = {
            grass: `
                <div class="grass-reminder animated fadeIn">
                    <div class="reminder-card">
                        <div class="card-header">
                            <span class="emoji">🌱</span>
                            <h3>Time to Touch Grass!</h3>
                        </div>
                        <div class="card-body">
                            <div class="progress-circle">
                                <svg><!-- Add circular progress animation --></svg>
                                <span class="time">${this.stats.timeSaved}min saved</span>
                            </div>
                            <p>You've avoided ${this.stats.postsBlocked} brain rot posts today.</p>
                        </div>
                        <button class="action-btn">Take a Break</button>
                    </div>
                </div>
            `,
            kpop: `<!-- K-pop fancam template -->`,
            memes: `<!-- Meme template -->`
        };
        return templates[this.replacementType];
    }

    setupObserver() {
        const observer = new MutationObserver(() => this.scanContent());
        observer.observe(document.body, { 
            childList: true, 
            subtree: true 
        });
    }

    scanContent() {
        const posts = document.querySelectorAll('.feed-shared-update-v2');
        posts.forEach(post => this.processPost(post));
    }

    trackTimeSpent() {
        setInterval(() => {
            const domain = window.location.hostname;
            const timeSpent = Math.floor((Date.now() - this.startTime) / 1000 / 60);
            
            if (this.socialMediaDomains[domain]) {
                if (!this.stats.siteStats[domain]) {
                    this.stats.siteStats[domain] = { timeSpent: 0 };
                }
                this.stats.siteStats[domain].timeSpent = timeSpent;

                if (timeSpent >= 30 && domain === 'linkedin.com') {
                    this.showChillMeme();
                }
                if (timeSpent >= 5) {
                    this.showBreakReminder();
                }
                this.updateStats();
            }
        }, 60000); // Check every minute
    }

    showChillMeme() {
        const overlay = document.createElement('iframe');
        overlay.src = chrome.runtime.getURL('meme-overlay.html');
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;border:none;z-index:99999;';
        document.body.appendChild(overlay);
    }

    detectTrendingWords() {
        document.body.addEventListener('DOMSubtreeModified', () => {
            const text = document.body.innerText.toLowerCase();
            this.trendingWords.forEach(word => {
                if (text.includes(word)) {
                    this.showWarning(`Warning: "${word}" detected! Touch grass immediately.`);
                }
            });
            this.detectMemeLanguage(text);
        });
    }

    detectMemeLanguage(text) {
        const lowerText = text.toLowerCase();
        this.memeVocab.forEach(word => {
            if (lowerText.includes(word)) {
                this.brainCells--;
                this.memeLevel += 10;
                this.rizzScore += 25;
                this.showMemeAlert(word);
            }
        });
    }

    showMemeAlert(word) {
        const alert = document.createElement('div');
        alert.className = 'meme-alert';
        alert.innerHTML = `
            <span class="glitch-text">🔥 ${word.toUpperCase()} DETECTED</span>
            <div class="progress-bar"></div>
        `;
        document.body.appendChild(alert);
        setTimeout(() => alert.remove(), 2000);
    }

    showWarning(message) {
        const warning = document.createElement('div');
        warning.style.cssText = `
            position:fixed;
            top:20px;
            right:20px;
            background:red;
            color:white;
            padding:15px;
            border-radius:8px;
            z-index:99999;
        `;
        warning.textContent = message;
        document.body.appendChild(warning);
        setTimeout(() => warning.remove(), 3000);
    }

    updateStats() {
        chrome.storage.local.set({ stats: this.stats });
    }
}

const detector = new BrainRotDetector();
detector.initialize();