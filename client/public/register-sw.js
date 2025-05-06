// Register the service worker for PWA functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then((registration) => {
        console.log('Service Worker registered with scope:', registration.scope);
      })
      .catch((error) => {
        console.error('Service Worker registration failed:', error);
      });
  });
}

// Add a2hs (add to home screen) functionality
let deferredPrompt;
const installButton = document.getElementById('install-button');

window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent Chrome 67 and earlier from automatically showing the prompt
  e.preventDefault();
  // Stash the event so it can be triggered later
  deferredPrompt = e;
  
  // Show the install button if it exists
  if (installButton) {
    installButton.style.display = 'block';
    
    installButton.addEventListener('click', (e) => {
      // Show the install prompt
      deferredPrompt.prompt();
      
      // Wait for the user to respond to the prompt
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        } else {
          console.log('User dismissed the install prompt');
        }
        // Clear the saved prompt
        deferredPrompt = null;
        
        // Hide the install button
        installButton.style.display = 'none';
      });
    });
  }
});

// Hide install button when app is installed
window.addEventListener('appinstalled', (evt) => {
  console.log('Application installed successfully');
  if (installButton) {
    installButton.style.display = 'none';
  }
});