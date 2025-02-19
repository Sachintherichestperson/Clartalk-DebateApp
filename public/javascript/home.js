
        const socket = io();
    
        // Listen for alerts from the server
        socket.on("alert", (message) => {
            alert(message.message);
        });
    
        // Function to calculate and update the "Time Left"
        function updateTimeLeft() {
            const now = new Date();
    
            document.querySelectorAll('.video-time').forEach((timeElement) => {
                const videoTime = new Date(timeElement.dataset.time); // Parse video time
                const timeLeft = videoTime - now; // Calculate remaining time in milliseconds
    
                if (timeLeft > 0) {
                    // Calculate days, hours, and minutes
                    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
                    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    
                    // Display time left in days, hours, and minutes, or just hours and minutes
                    if (days > 0) {
                        timeElement.textContent = `Time Left: ${days}d ${hours}h ${minutes}m`;
                    } else {
                        timeElement.textContent = `Time Left: ${hours}h ${minutes}m`;
                    }
                } else {
                    timeElement.textContent = "Event Ended";
                }
            });
        }
    
        // Update time every 1 second
        setInterval(updateTimeLeft, 1000);
        updateTimeLeft(); // Run the function on page load
    
    
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
       