        let deleteUrl = "/Delete-Account"; // Set the delete route URL
    
        function openModal(event) {
            event.preventDefault(); // Prevent immediate navigation
            document.getElementById("myModal").style.display = "flex";
        }
    
        function closeModal() {
            document.getElementById("myModal").style.display = "none";
        }
    
        function confirmDelete() {
            // Hide modal
            document.getElementById("myModal").style.display = "none";
    
            // Redirect after 1 second (optional delay)
            setTimeout(() => {
                window.location.href = deleteUrl;
            }, 500);
        }