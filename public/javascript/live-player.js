const socket = io();
const postBtn = document.querySelector("#commentButtonComments");
const commentInput = document.querySelector("#commentInputComments");
const commentSection = document.querySelector(".allsinglecomment");
const btn = document.querySelector("#commentButtonQuestions");
const input = document.querySelector("#commentInputQuestions");
const questions = document.querySelector(".questions");

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

btn.addEventListener("click", () => {
const Text = input.value.trim(); 


if (Text) {
    const questionData = {
        questions: Text,
        liveId: liveId
    };

    socket.emit("livequestions", questionData);
    input.value = "";
    console.log(questionData);
}
});

socket.on("liveaddquestion", (data) => {
console.log("Received on client:", data);

if (!data.questions || !Array.isArray(data.questions)) return;

const latestQuestion = data.questions[data.questions.length - 1];

const questionElement = document.createElement("div");
questionElement.classList.add("single-question");
questionElement.innerHTML = `<strong class="strong">Questions:</strong><p>${latestQuestion}</p>`;

questions.prepend(questionElement);
});