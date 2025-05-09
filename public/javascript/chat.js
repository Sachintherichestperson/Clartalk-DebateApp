const socket = io();
const btn = document.querySelector(".send-btn"); 

document.addEventListener('click', function (e) {
        const dropdown = document.querySelector('.dropdown-menu');
        const checkbox = document.querySelector('#dropdown-toggle');
        const files = document.querySelector('.file-options');

        if (!files.contains(e.target)) {
    dropdown.style.display = 'none';  // Hide dropdown menu
    } else {
    dropdown.style.display = 'block';  // Show dropdown menu (toggle logic)
    }
}); 
    
const colors = [
    "#e6194B", "#3cb44b", "#ffe119", "#4363d8", "#f58231", 
    "#911eb4", "#42d4f4", "#f032e6", "#bfef45", "#fabebe"
];

function getColorForUser(username) {
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
        hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length]; // Pick from preset colors
}

socket.emit("joinCommunity", communityId);

socket.on('allMessages', (messages) => {
    const panel = document.querySelector(".chat-panel");
    panel.innerHTML = ''; 

    messages.forEach(message => {
            const messageDiv = document.createElement("div");
            const randomColor = getColorForUser(message.sender);

            if (message.sender === user) {
                messageDiv.classList.add("self-msg");
                messageDiv.innerHTML = `<span style="color:${randomColor}">Self:</span><p>${message.Message}</p>`;
            } else {
                messageDiv.classList.add("chat-msg");
                messageDiv.innerHTML = `<span style="color:${randomColor}">${message.sender}:</span><p>${message.Message}</p>`;
            }
            panel.appendChild(messageDiv);
        });
});

btn.addEventListener("click", () => {
    sendMessage();
});

document.querySelector(".message-input").addEventListener("keydown", (event) => {
    if (event.key === "Enter") { // Prevent the default "Enter" behavior (e.g., new line)
        sendMessage();
    }
});

function sendMessage() {
    const panel = document.querySelector(".chat-panel");
    const message = document.querySelector(".message-input").value; // Correct reference
    document.querySelector(".message-input").value = ""; // Clear input field
    if (message) {
        socket.emit("chatMessage", { username: user, message, communityId }); // Send message to server
    }
}

socket.on("chatMessage", (data) => {
    const panel = document.querySelector(".chat-panel");
    const message = document.createElement("div");

    const randomColor = getColorForUser(data.username)

    if(data.username === user){
        message.classList.add("self-msg");
        message.innerHTML = `<span style="color:${randomColor}">Self:</span><p>${data.message}</p>`;
    }else{
        message.classList.add("chat-msg");
        message.innerHTML = `<span style="color:${randomColor}">${data.username}:</span><p>${data.message}</p>`;
    }
    panel.appendChild(message);
});

const options = {
    key: "rzp_test_HPAKSJHzTmYhop", // Replace with your Razorpay test/live Key ID
    amount: 1900, // Amount in paise (₹500)
    currency: "INR",
    name: "Clartalk",
    description: "Test Transaction",
    handler: function (response) {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = `/Community/${community}/payment`;
},
    prefill: {
        name: "Test User",
        email: "test.user@example.com",
        contact: "9999999999"
    },
    theme: {
        color: "#3399cc"
    }
};
 
const rzp = new Razorpay(options);
 
 document.getElementById("rzp-button1").onclick = function (e) {
    rzp.open();
    e.preventDefault();
};
     