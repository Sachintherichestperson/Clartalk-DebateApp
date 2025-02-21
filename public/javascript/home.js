
        const socket = io();
    
        // Listen for alerts from the server
        socket.on("alert", (message) => {
            alert(message.message);
        });
    
        async function updateTimeLeft() {
            const now = new Date();
        
            document.querySelectorAll('.video-card').forEach(async (videoCard) => {
                const timeElement = videoCard.querySelector('.video-time');
                const statusElement = videoCard.querySelector('.video-status');
                const videoTime = new Date(timeElement.dataset.time);
                const timeLeft = videoTime - now;
        
                if (timeLeft > 0) {
                    // Time left: Show countdown, hide status
                    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
                    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        
                    timeElement.textContent = days > 0 
                        ? `Time Left: ${days}d ${hours}h ${minutes}m` 
                        : `Time Left: ${hours}h ${minutes}m`;
        
                    timeElement.style.display = "block";  // Show countdown
                    statusElement.style.display = "none"; // Hide status
                } else {
                    // Time is up: Hide countdown, show status
                    timeElement.style.display = "none";   // Hide countdown
                    statusElement.style.display = "block"; // Show status
        
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
        }
        
        // Run every second
        setInterval(updateTimeLeft, 1000);
        updateTimeLeft();
        
        
    
    
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
       