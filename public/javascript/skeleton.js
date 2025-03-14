document.addEventListener("DOMContentLoaded", function () {
setTimeout(() => {
    document.querySelector(".skeleton-loader").style.display = "none";
}, 200); // Simulates loading time
});

// Detect Offline & Online Events
window.addEventListener("offline", function () {
document.querySelector(".offline-message").style.display = "block";
});

window.addEventListener("online", function () {
document.querySelector(".offline-message").style.display = "none";
});