
    const followbtn = document.querySelector(".follow-btn");
    const socket = io();
    

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