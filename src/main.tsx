import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
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
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

bootstrap();
