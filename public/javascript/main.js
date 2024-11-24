const senderBtn = document.getElementById("button");
const username = document.getElementById("username-input");
const localVideo = document.getElementById("localVideo")
const remoteVideo = document.getElementById("remoteVideo");
const allusersHtml = document.getElementById("allusers");
const socket = io();


senderBtn.addEventListener("click", () => {
  if(username.value !== ""){
    
  }
})

socket.on("joined", (allusers) => {
  allusersHtml.innerHTML = "";
  for (const user in allusers) {
    const li = document.createElement("li");
    li.textContent = `${user} ${user === username.value ? "(You)" : ""}`;
    if (user !== username.value) {
      const button = createElement("button");
      button.textContent = "Fight";
      button.addEventListener("click", () => startCall(user));
      li.appendChild(button);
    }
    allusersHtml.appendChild(li);
  }
});
