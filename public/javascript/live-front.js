const socket = io();
const followbtn = document.querySelector(".follow-btn");
const commentbtn = document.querySelector(".comments");
const allcomments = document.querySelector(".allcomments");
const msgbox = document.querySelector(".msg-box");
const postBtn = document.getElementById("post-btn");
const commentInput = document.getElementById("comment-input");
const commentSection = document.getElementById("comment-section");
const commentCount = document.getElementById("comment-count");
const description = document.querySelector(".video-description");
let fullText = description.innerText;
let wordLimit = 35; // Set word limit
let words = fullText.split(" ");
let truncatedText = words.length > wordLimit ? words.slice(0, wordLimit).join(" ") + "..." : fullText;
description.innerText = truncatedText; // Apply truncated text initially
let isFullTextVisible = false;


followbtn.addEventListener("click", () => {
        socket.emit("Follow", { creatorId, UserId });
        const span = followbtn.querySelector("span");
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


commentbtn.addEventListener("click", (event) => {
    // Prevent click on the comment button itself from closing it
    event.stopPropagation();
    allcomments.classList.add("active");
    msgbox.classList.add("active");
    commentbtn.classList.add("active");
});

document.addEventListener("click", (event) => {
    // Check if the click is outside the comments and msgbox
    if (!allcomments.contains(event.target) && !msgbox.contains(event.target) && !commentbtn.contains(event.target)) {
        allcomments.classList.remove("active");
        msgbox.classList.remove("active");
        commentbtn.classList.remove("active");
    }
});



if (words.length > wordLimit) {
    let truncatedText = words.slice(0, wordLimit).join(" ") + "...";
    description.innerText = truncatedText; // Apply truncated text
}

description.addEventListener("click", function (event) {
    description.innerText = isFullTextVisible ? truncatedText : fullText;
    isFullTextVisible = !isFullTextVisible;
    event.stopPropagation(); // Prevents click from bubbling to document
});

document.addEventListener("click", (event) => {
// Check if the click is outside the comments and msgbox
document.addEventListener("click", function (event) {
    if (!description.contains(event.target)) {
        description.innerText = truncatedText;
        isFullTextVisible = false;
    }
});
});


postBtn.addEventListener("click", () => {
    const commentText = commentInput.value.trim();
    if (commentText) {
        const commentData = {
            text: commentText,
            userId: Iduser,
            videoType: currentRoute,
            vedioId: vedioId
        };
        console.log(commentData);
        socket.emit("newComment", commentData);
        commentInput.value = ""; // Clear input
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

    // Update comment count
    commentCount.textContent = parseInt(commentCount.textContent) + 1;
});
