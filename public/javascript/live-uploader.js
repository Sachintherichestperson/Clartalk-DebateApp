
document.addEventListener("DOMContentLoaded", () => {
const radioButtons = document.querySelectorAll('input[type="radio"]');

radioButtons.forEach(radio => {
        radio.addEventListener("click", function (event) {
            if (this.dataset.checked === "true") {
                this.checked = false; // Deselect the radio
                this.dataset.checked = "false"; // Update the toggle state
            } else {
                this.dataset.checked = "true"; // Mark as selected
            }

            // Ensure all other radios in the group are updated correctly
            radioButtons.forEach(otherRadio => {
                if (otherRadio !== this) {
                    otherRadio.dataset.checked = "false";
                }
            });
        });
    });
});