
        const socket = io();
    
        // Listen for alerts from the server
        socket.on("alert", (message) => {
            alert(message.message);
        });
    
        let intervalID; // Store interval reference

async function updateTimeLeft() {
    const now = new Date();
    let allExpired = true; // Flag to check if all videos are expired

    document.querySelectorAll('.video-card').forEach(async (videoCard) => {
        let timeElement = videoCard.querySelector('.video-time');
        let statusElement = videoCard.querySelector('.video-status');

        // If missing, create and append them
        if (!timeElement) {
            timeElement = document.createElement("span");
            timeElement.classList.add("video-time");
            videoCard.appendChild(timeElement);
        }

        if (!statusElement) {
            statusElement = document.createElement("span");
            statusElement.classList.add("video-status");
            statusElement.style.display = "none";
            videoCard.appendChild(statusElement);
        }

        const videoTime = new Date(timeElement.dataset.time);
        const timeLeft = videoTime - now;

        if (timeLeft > 0) {
            allExpired = false; // At least one video is still counting

            // Show countdown, hide status
            const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
            const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

            timeElement.textContent = days > 0 
                ? `Time Left: ${days}d ${hours}h ${minutes}m` 
                : `Time Left: ${hours}h ${minutes}m`;

            timeElement.style.display = "block";  
            statusElement.style.display = "none"; 
        } else {
            // Time is up: Hide countdown, show status
            timeElement.style.display = "none";   
            // Update status in database
            const videoId = videoCard.dataset.id;
            if (videoId) {
                await fetch(`/update-status/${videoId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ LiveStatus: 'Live' })
                });
            }
        }
    });

    // If all videos are expired, stop the interval
    if (allExpired && intervalID) {
        clearInterval(intervalID);
        console.log("All countdowns are finished, interval stopped.");
    }
}

// Start interval and store reference
intervalID = setInterval(updateTimeLeft, 1000);
updateTimeLeft(); // Run immediately once

        
        
    
    
        document.addEventListener("DOMContentLoaded", () => {
            const banner = document.querySelector('.banner');
            const closeButton = document.querySelector('.close-button');
            const body = document.body;
            const container = document.querySelector('.container');
    
            // Get the unique user ID or username from a data attribute or server-rendered value
            const userId = "<%= user._id %>"; // Replace this with the correct variable holding the user ID
    
            // Unique key for the user
            const bannerKey = `bannerShown_${userId}`;
    
            // Show Banner Functionality
            function showBanner() {
                banner.style.display = 'block';
                container.classList.add('blur');
                body.classList.add('no-scroll');
            }
    
            // Hide Banner Functionality
            closeButton.addEventListener('click', () => {
                banner.style.display = 'none';
                container.classList.remove('blur');
                body.classList.remove('no-scroll');
    
                // Store in sessionStorage that the banner was shown for this user
                sessionStorage.setItem(bannerKey, 'true');
            });
    
            // Check if the banner has been shown for this user
            if (!sessionStorage.getItem(bannerKey)) {
                showBanner();
            }
        });
       