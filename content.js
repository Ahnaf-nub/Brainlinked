// content.js
class BrainRotDetector {
    constructor() {
        this.stats = {
            timeSaved: 0,
            siteStats: {},
            slangUsed: 0,
            brainRotLevel: 0,
            brainCells: 3
        };
        this.startTime = Date.now();
        this.memeVocab = [
            'fr fr', 'no cap', 'bussin', 'skibidi', 'rizz',
            'gyatt', 'based', 'L', 'sus', 'sheesh', 'sigma'
        ];
        this.socialMediaDomains = {
            'linkedin.com': 'LinkedIn',
            'www.linkedin.com': 'LinkedIn'
        };
        this.isScanning = false;
        this.initialized = false;

        // Enhanced meme overlay handler
        this.boundMessageHandler = this.handleMessage.bind(this);
        window.addEventListener('message', this.boundMessageHandler);
    }

    handleMessage(event) {
        if (event.data === 'closeMeme') {
            this.removeOverlay();
        }
    }

    removeOverlay() {
        const overlay = document.querySelector('iframe[src*="meme-overlay.html"]');
        if (overlay) {
            overlay.remove();
            // Clean up any related styles/elements
            const cleanup = document.querySelectorAll('.meme-overlay-backdrop');
            cleanup.forEach(el => el.remove());
        }
    }

    async initialize() {
        if (this.initialized) return;
        
        await this.loadSettings();
        this.setupMessageListener();
        
        // Special handling for LinkedIn
        if (window.location.hostname.includes('linkedin.com')) {
            // Wait for feed to load
            await new Promise(resolve => {
                const checkFeed = () => {
                    if (document.querySelector('.core-rail, .feed-shared-update-v2')) {
                        resolve();
                    } else {
                        setTimeout(checkFeed, 500);
                    }
                };
                checkFeed();
            });
        }
        
        try {
            await this.setupObserver();
            this.trackTimeSpent();
            this.initialized = true;
        } catch (error) {
            console.warn('BrainRotDetector: Initialization failed', error);
            this.initialized = false;
        }
    }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'scanForMemes') {
                this.scanContent();
                sendResponse({success: true});
            }
            if (request.action === 'getStats') {
                sendResponse({stats: this.stats});
            }
            return true;
        });
    }

    setupObserver() {
        if (this.observer) return;
        
        // Create a more efficient observer
        this.observer = new MutationObserver((mutations) => {
            if (!this.isScanning && !this.debounceTimer) {
                this.debounceTimer = setTimeout(() => {
                    this.scanForMemes(mutations);
                    this.debounceTimer = null;
                }, 1000); // Debounce by 1 second
            }
        });

        try {
            // Only observe main content areas on LinkedIn
            if (window.location.hostname.includes('linkedin.com')) {
                const mainContent = document.querySelector('.core-rail, .feed-shared-update-v2');
                if (mainContent) {
                    this.observer.observe(mainContent, {
                        childList: true,
                        subtree: true,
                        characterData: true
                    });
                } else {
                    // Fallback to body with reduced subtree depth
                    this.observer.observe(document.body, {
                        childList: true,
                        subtree: false
                    });
                }
            } else {
                // Normal observation for other sites
                this.observer.observe(document.body, {
                    childList: true,
                    subtree: true,
                    characterData: true
                });
            }
        } catch (error) {
            console.warn('BrainRotDetector: Observer setup failed', error);
        }
    }

    scanForMemes(mutations) {
        if (this.isScanning) return;
        this.isScanning = true;

        try {
            // On LinkedIn, only scan visible viewport
            if (window.location.hostname.includes('linkedin.com')) {
                const visibleText = Array.from(document.querySelectorAll('.feed-shared-update-v2'))
                    .filter(el => this.isElementInViewport(el))
                    .map(el => el.textContent)
                    .join(' ')
                    .toLowerCase();
                
                this.memeVocab.forEach(word => {
                    if (visibleText.includes(word)) {
                        this.stats.slangUsed++;
                        this.updateStats();
                        this.showMemeAlert(word);
                    }
                });
            } else {
                // Normal scanning for other sites
                mutations.forEach(mutation => {
                    if (mutation.type === 'characterData' || mutation.type === 'childList') {
                        const text = mutation.target.textContent?.toLowerCase() || '';
                        if (text.length > 3) {
                            this.memeVocab.forEach(word => {
                                if (text.includes(word)) {
                                    this.stats.slangUsed++;
                                    this.updateStats();
                                    this.showMemeAlert(word);
                                }
                            });
                        }
                    }
                });
            }
        } catch (error) {
            console.warn('BrainRotDetector: Non-critical scan error', error);
        }

        this.isScanning = false;
    }

    // Helper method to check if element is in viewport
    isElementInViewport(el) {
        const rect = el.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }

    scanContent() {
        // Only scan visible content
        const visibleText = document.visibleText || document.body.innerText;
        let memeCount = 0;

        this.memeVocab.forEach(word => {
            const regex = new RegExp(word, 'gi');
            const matches = (visibleText.match(regex) || []).length;
            memeCount += matches;
        });

        this.stats.slangUsed = memeCount;
        this.updateStats();
    }

    trackTimeSpent() {
        setInterval(() => {
            const domain = window.location.hostname;
            if (this.socialMediaDomains[domain]) {
                const timeSpent = Math.floor((Date.now() - this.startTime) / 1000 / 60);
                
                if (!this.stats.siteStats[domain]) {
                    this.stats.siteStats[domain] = { timeSpent: 0 };
                }
                this.stats.siteStats[domain].timeSpent = timeSpent;

                // Only show meme overlay after 5 minutes on LinkedIn
                if (timeSpent >= 5 && domain.includes('linkedin.com')) {
                    this.showChillMeme();
                }
                this.updateStats();
            }
        }, 60000); // Check every minute
    }

    showChillMeme() {
        // Check if meme was already shown
        chrome.storage.local.get(['lastMemeShow'], (result) => {
            const lastShow = result.lastMemeShow || 0;
            const now = Date.now();
            
            // Show meme only if 30 minutes have passed since last show
            if (now - lastShow >= 30 * 60 * 1000) {
                const overlay = document.createElement('iframe');
                overlay.src = chrome.runtime.getURL('meme-overlay.html');
                overlay.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    border: none;
                    z-index: 99999;
                    background: transparent;
                `;
                
                // Add backdrop for click-outside closing
                const backdrop = document.createElement('div');
                backdrop.className = 'meme-overlay-backdrop';
                backdrop.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0,0,0,0.5);
                    z-index: 99998;
                `;
                backdrop.addEventListener('click', () => this.removeOverlay());
                
                document.body.appendChild(backdrop);
                document.body.appendChild(overlay);
                
                // Save last show time
                chrome.storage.local.set({ lastMemeShow: now });
            }
        });
    }

    detectTrendingWords() {
        const observer = new MutationObserver(() => {
            const text = document.body.innerText.toLowerCase();
            this.detectMemeLanguage(text);
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    detectMemeLanguage(text) {
        this.memeVocab.forEach(word => {
            if (text.includes(word)) {
                this.showMemeAlert(word);
                // Increment slang usage count
                this.stats.slangUsed++;
                
                // Calculate brain rot level (0-100%)
                const brainRotLevel = Math.min(100, (this.stats.slangUsed * 5));
                
                // Update stats with new values
                this.stats = {
                    ...this.stats,
                    brainRotLevel: brainRotLevel,
                    brainCells: Math.max(0, 3 - Math.floor(brainRotLevel / 33)) // Lose brain cells as rot increases
                };
                
                // Update stats in storage
                this.updateStats();
                
                // Show critical warning if brain rot is too high
                if (brainRotLevel >= 90) {
                    this.showChillMeme(); // Show intervention meme
                }
            }
        });
    }

    showMemeAlert(word) {
        const alert = document.createElement('div');
        alert.className = 'meme-alert';
        alert.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 10px 20px;
            border-radius: 8px;
            z-index: 9999;
            animation: fadeIn 0.3s ease-in-out;
        `;
        alert.innerHTML = `🔥 "${word}" detected!`;
        document.body.appendChild(alert);
        setTimeout(() => alert.remove(), 2000);
    }

    updateStats() {
        chrome.storage.local.set({ stats: this.stats }, () => {
            chrome.runtime.sendMessage({
                action: 'statsUpdated',
                stats: this.stats
            });
        });
    }

    loadSettings() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['stats'], (result) => {
                if (result.stats) {
                    this.stats = {...this.stats, ...result.stats};
                }
                resolve();
            });
        });
    }

    // Clean up when done
    cleanup() {
        window.removeEventListener('message', this.boundMessageHandler);
        this.removeOverlay();
    }
}

// Initialize detector
const detector = new BrainRotDetector();
detector.initialize().catch(console.error);

// Ensure initialization on page load
window.addEventListener('load', () => {
    detector.initialize().catch(console.error);
});