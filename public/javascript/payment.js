
        const options = {
            key: "rzp_test_HPAKSJHzTmYhop", // Replace with your Razorpay test/live Key ID
            amount: 1900, // Amount in paise (₹500)
            currency: "INR",
            name: "Your Company Name",
            description: "Test Transaction",
            handler: function (response) {
                // Redirect after successful payment
                window.location.href = `/Booking-Done/${liveId}`;
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