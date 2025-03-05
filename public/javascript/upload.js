
        let tagSet = new Set(); // Store unique tags
    
        document.getElementById("tags").addEventListener("keydown", function (event) {
            if (event.key === "Enter" || event.key === ",") {  
                event.preventDefault(); // Prevent form submission
                addTags(this.value);
                this.value = ""; // Clear input after adding
            }
        });
    
        function addTags(input) {
    // First, split input by commas
    let tags = input.split(",")
                    .map(tag => tag.trim())   // Trim spaces around tags
                    .filter(tag => tag.length > 1); // Ensure tags are longer than 1 character

    // For each tag, split further by spaces and treat them as separate tags
    tags.forEach(tag => {
        let splitTags = tag.split(/\s+/);  // Split by any spaces
        splitTags.forEach(subTag => {
            if (!subTag.startsWith("#")) {
                subTag = "#" + subTag; // Ensure tags start with #
            }
            if (!tagSet.has(subTag)) {
                tagSet.add(subTag);
                displayTags();
            }
        });
    });
}

    
        function displayTags() {
            let tagContainer = document.getElementById("tagContainer");
            tagContainer.innerHTML = ""; // Clear previous tags
            tagSet.forEach(tag => {
                let tagElement = document.createElement("span");
                tagElement.className = "tag";
                tagElement.textContent = tag;
    
                // Add remove (×) button to each tag
                let removeButton = document.createElement("button");
                removeButton.textContent = "×";
                removeButton.className = "remove-tag";
                removeButton.onclick = () => removeTag(tag);
                
                tagElement.appendChild(removeButton);
                tagContainer.appendChild(tagElement);
            });
    
            // Store the tags in a hidden input field before submitting the form
           const tag =  document.getElementById("hiddenTags").value = [...tagSet].join(",");
           console.log(tag)
        }
    
        function removeTag(tag) {
            tagSet.delete(tag);
            displayTags();
        } 