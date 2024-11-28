
// Dark mode support

chrome.storage.local.get(['darkMode'], (result) => {

    if (result.darkMode) {

        document.body.style.background = '#121212';

        document.querySelector('.meme-container').style.background = '#1e1e1e';

    }

});



// Enhanced close functionality

const closeBtn = document.querySelector('.close-btn');

if (closeBtn) {

    closeBtn.addEventListener('click', () => {

        // Send message to parent window

        window.parent.postMessage('closeMeme', '*');

        

        // Fallback close method

        try {

            window.frameElement?.remove();

        } catch (e) {

            console.warn('Could not remove frame directly');

        }

    });

}



// Add keyboard escape handler

document.addEventListener('keydown', (e) => {

    if (e.key === 'Escape') {

        window.parent.postMessage('closeMeme', '*');

        try {

            window.frameElement?.remove();

        } catch (e) {

            console.warn('Could not remove frame directly');

        }

    }

});