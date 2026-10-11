
/*
 * Labirent: Ölümcül Kalış
 * Ana sayfa ve oyun başlatma kontrolleri.
 *
 * 3D oyun client.js dosyasında çalışır.
 * Bu dosya ikinci bir oyun döngüsü oluşturmaz.
 */

(() => {
  "use strict";

  const GAME_NAME = "Labirent: Ölümcül Kalış";

  function checkGameElements() {
    const requiredElements = [
      "game",
      "overlay",
      "startButton",
      "status"
    ];

    const missing = requiredElements.filter(
      id => !document.getElementById(id)
    );

    if (missing.length > 0) {
      console.error(
        `[${GAME_NAME}] Eksik HTML elemanları:`,
        missing.join(", ")
      );
      return false;
    }

    return true;
  }

  function setupPage() {
    document.title = GAME_NAME;

    if (!checkGameElements()) {
      return;
    }

    console.info(`[${GAME_NAME}] Sayfa hazır.`);

    const startButton = document.getElementById("startButton");

    startButton.addEventListener("click", () => {
      console.info(`[${GAME_NAME}] Başlatma isteği gönderildi.`);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupPage, {
      once: true
    });
  } else {
    setupPage();
  }
})();

