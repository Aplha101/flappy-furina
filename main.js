function handleBackgroundMusic() {
    const homeMusic = new Audio('sound/SpotiDownloader.com - Fontaine Teaser - Linden Violin.mp3');
    homeMusic.loop = true;
    // --- FIX: Volume reduced from 0.8 to 0.3 ---
    homeMusic.volume = 0.3; 
    // -------------------------------------------

    homeMusic.play().catch(() => {
        document.addEventListener("click", () => homeMusic.play(), { once: true });
    });
}

const play = document.getElementById("playButton");

play.addEventListener("click", () => {
    const startline = new Audio('sound/furina.mp3');
    startline.play();
    startline.addEventListener("ended", () => {
        window.location.href = "game.html";
    });
});

handleBackgroundMusic();