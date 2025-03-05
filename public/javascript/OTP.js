const otpInputs = document.querySelectorAll(".otp-input");

otpInputs.forEach((input, index) => {
    input.addEventListener("input", (e) => {
        if (e.target.value.length === 1) {
            if (index < otpInputs.length - 1) {
                otpInputs[index + 1].focus(); // Move to next input
            }
        }
    });

input.addEventListener("keydown", (e) => {
        if (e.key === "Backspace" && input.value === "") {
            if (index > 0) {
                otpInputs[index - 1].focus(); // Move to previous input on backspace
            }
        }
    });
});

document.getElementById("otpForm").addEventListener("submit", async function (event) {
    event.preventDefault();

    const otpInputs = document.querySelectorAll(".otp-input");
    const otp = Array.from(otpInputs).map(input => input.value).join("");

    const response = await fetch("/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp }),
    });

    const data = await response.json();

    if (data.success) {
        window.location.href = data.redirectUrl;
    } else {
        alert(data.error);
        otpInputs.forEach(input => input.value = "");  // Clear inputs on failure
        otpInputs[0].focus();  // Focus on first input
    }
});

document.getElementById("resendOtp").addEventListener("click", async function () {
    const response = await fetch("/resend-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
});
    
    const data = await response.json();
    
    if (data.success) {
        document.getElementById("resendMsg").style.display = "block"
    } else {
        document.getElementById("resendMsg").innerText = data.error;
    }
});
