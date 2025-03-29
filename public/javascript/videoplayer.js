    const socket = io();
    const followbtn = document.querySelector(".follow-btn");
    const commentbtn = document.querySelector(".comments");
    const allcomments = document.querySelector(".allcomments");
    const msgbox = document.querySelector(".msg-box");
    const postBtn = document.getElementById("post-btn");
    const commentInput = document.getElementById("comment-input");
    const commentSection = document.getElementById("comment-section");
    const commentCount = document.getElementById("comment-count");
    const video = document.getElementById("videoPlayer");
    let startTime = 0;
    let endTime = 0;
    let watchTime = 0;
    

    followbtn.addEventListener("click", () => {
<<<<<<< HEAD
        const span = followbtn.querySelector("span");
        const isFollowing = span.classList.contains("unfollow");
    
        // Optimistically update UI (change follow/unfollow immediately)
        span.classList.toggle("follow", isFollowing);
        span.classList.toggle("unfollow", !isFollowing);
        span.textContent = isFollowing ? "Follow" : "Unfollow";
    
        // Emit socket event
        socket.emit("Follow", { creatorId, UserId });
=======
        socket.emit("Follow", { creatorId, UserId });

        const span = followbtn.querySelector("span");
>>>>>>> 2eba0c87247afa197b6f566bfacd31c5b6cc6626
    });

    socket.on("FollowStatusUpdated", (data) => {
        const followbtn = document.querySelector(`.follow-btn[data-creator-id='${data.creatorId}']`);
        const followersCountElement = document.querySelector(".followers-count");

        if (followbtn) {
            const span = followbtn.querySelector("span");
            

            // Update the follow/unfollow button text
            if (data.isFollowing) {
                span.classList.remove("follow");
                span.classList.add("unfollow");
                span.textContent = "Unfollow";
            } else {
                span.classList.remove("unfollow");
                span.classList.add("follow");
                span.textContent = "Follow";
            }
        }

        // Update the followers count on the page
        if (followersCountElement) {
            // console.log(followersCount)
            console.log("followers Count",data.followersCount)
            followersCountElement.textContent = `${data.followersCount} Followers`;
        }
        
    });

     video.addEventListener("play", () => {
        startTime = Date.now();
     });
     
     function sendWatchTime() {
        if(startTime){
            let endTime = Date.now();
            watchTime += (endTime - startTime) / 1000;
            startTime = 0;

            fetch("/watch-time", {
                method: "post",
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ watchTime, vedioId, videoType: currentRoute })
            });
        }
     }

     video.addEventListener("pause", sendWatchTime);
     video.addEventListener("ended", sendWatchTime);

     window.addEventListener("beforeunload", () => {
         sendWatchTime();
     });


<<<<<<< HEAD
     postBtn.addEventListener("click", () => {
        const commentText = commentInput.value.trim();
        if (commentText) {
            // ⚡ Instantly update UI
            const commentElement = document.createElement("div");
            commentElement.classList.add("single-comment");
            commentElement.innerHTML = `
                <img src="/images/default.png" alt="" class="comment-image">
                <p><strong>You:</strong> ${commentText}</p>
            `;
            commentSection.prepend(commentElement);
            commentInput.value = ""; 
    
            // ⚡ Increment comment count instantly
            commentCount.textContent = parseInt(commentCount.textContent) + 1;
    
            // Send to server without waiting
            socket.emit("VideonewComment", { 
                text: commentText, 
                userId: userid, 
                videoType: currentRoute, 
                vedioId: vedioId 
            });
        }
    });
    
    
    socket.on("addComment", (data) => {
        const commentElement = document.createElement("div");
        commentElement.classList.add("single-comment");
        commentElement.innerHTML = `
            <img src="${data.image}" alt="" class="comment-image">
            <p><strong>${data.username}:</strong> ${data.text}</p>
        `;
        commentSection.prepend(commentElement);
    });
    
=======
postBtn.addEventListener("click", () => {
    const commentText = commentInput.value.trim();
    if (commentText) {
        const commentData = {
            text: commentText,
            userId: userid,
            videoType: currentRoute,
            vedioId: vedioId
        };
        console.log(commentData);
        socket.emit("VideonewComment", commentData);
        commentInput.value = ""; // Clear input
    }
});
>>>>>>> 2eba0c87247afa197b6f566bfacd31c5b6cc6626

socket.on("addComment", (data) => {
    const commentElement = document.createElement("div");
    commentElement.classList.add("single-comment");
    commentElement.innerHTML = `
        <img src="${data.image}" alt="" class="comment-image">
        <p><strong>${data.username}:</strong> ${data.text}</p>
    `;
    commentSection.prepend(commentElement);

    // Update comment count
    commentCount.textContent = parseInt(commentCount.textContent) + 1;
});

<<<<<<< HEAD
=======

>>>>>>> 2eba0c87247afa197b6f566bfacd31c5b6cc6626
commentbtn.addEventListener("click", (event) => {
    // Prevent click on the comment button itself from closing it
    event.stopPropagation();
    allcomments.classList.add("active");
    msgbox.classList.add("active");
    commentbtn.classList.add("active");
});

document.addEventListener("click", (event) => {
<<<<<<< HEAD
=======
    // Check if the click is outside the comments and msgbox
>>>>>>> 2eba0c87247afa197b6f566bfacd31c5b6cc6626
    if (!allcomments.contains(event.target) && !msgbox.contains(event.target) && !commentbtn.contains(event.target)) {
        allcomments.classList.remove("active");
        msgbox.classList.remove("active");
        commentbtn.classList.remove("active");
    }
});

