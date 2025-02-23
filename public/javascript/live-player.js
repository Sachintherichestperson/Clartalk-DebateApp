
       const socket = io();
       const postBtn = document.querySelector("#commentButtonComments");
       const commentInput = document.querySelector("#commentInputComments");
       const commentSection = document.querySelector(".allsinglecomment");
       const liveId = "<%= Live._id %>";
       console.log(liveId);

       postBtn.addEventListener("click", () => {
        const commentText = commentInput.value.trim(); 
        if (commentText) {
            const commentData = {
                text: commentText,
                userId: "<%= user._id %>",
                liveId: liveId
            };
            console.log(commentData);
            socket.emit("livenewComment", commentData);
            commentInput.value = ""; // Clear input
        }
       });

       socket.on("liveaddComment", (data) => {
    const commentElement = document.createElement("div");
    commentElement.classList.add("single-comment");
    commentElement.innerHTML = `
        <img src="${data.image}" alt="" class="comment-image">
        <p><strong class="strong">${data.username}:</strong> ${data.text}</p>
    `;
    commentSection.prepend(commentElement);

    // Update comment count
    commentCount.textContent = parseInt(commentCount.textContent) + 1;
});

document.addEventListener("DOMContentLoaded", function () {
    const commentsSection = document.querySelector(".comments");
    const questionsSection = document.querySelector("#questions");
    const commentsButton = document.querySelector("#buttons div:nth-child(1)");
    const questionsButton = document.querySelector("#buttons div:nth-child(2)");
    const icon = document.getElementById("icon");

    commentsButton.addEventListener("click", function () {
        commentsSection.classList.toggle("active");
        questionsSection.classList.remove("active");
    });

    questionsButton.addEventListener("click", function () {
        questionsSection.classList.toggle("active");
        commentsSection.classList.remove("active");
    });

    let open = "open"
    icon.addEventListener("click", function () {
        if(open){
            commentsSection.classList.toggle("accent");
        }else{
            commentsSection.classList.remove("accent");
        }
    });
});