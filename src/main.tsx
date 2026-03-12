import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import './index.css'
import ReactGA from 'react-ga4'
import { setupDiscord, isRunningInDiscord } from './lib/discord'
import App from './App.tsx'

async function bootstrap() {
  // Only run Discord auth if the app is inside the Discord iframe
  if (isRunningInDiscord()) {
    console.log("[Discord] Detected Discord iframe, starting auth...");
    try {
      await Promise.race([
        setupDiscord(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Discord auth timed out after 10s")), 10000)
        ),
      ]);
      console.log("[Discord] Auth complete");
    } catch (e) {
      console.error("[Discord] Authentication failed:", e);
    }
  } else {
    console.log("[Discord] Not in Discord iframe, skipping auth");
    // Initialize Google Analytics only when outside Discord
    ReactGA.initialize("G-MY639QH9M5");
  }

  const rootElement = document.getElementById('root')!;
  const app = (
    <StrictMode>
      <App />
    </StrictMode>
  );

  // If the root has pre-rendered content, hydrate instead of replacing
  // Check innerHTML instead of children count as pre-rendering might just be text or a single component
  if (rootElement.innerHTML.trim() !== '') {
    hydrateRoot(rootElement, app);
  } else {
    createRoot(rootElement).render(app);
  }

  // Remove the splash loader once React has started mounting/hydrating
  // We do this in a requestAnimationFrame to ensure it doesn't flicker before the first paint
  requestAnimationFrame(() => {
    const loader = document.getElementById('splash-loader');
    if (loader) {
      loader.classList.add('fade-out'); // Optional transition
      setTimeout(() => loader.remove(), 500);
    }
  });
}

bootstrap();
