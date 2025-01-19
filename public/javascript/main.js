document.addEventListener("DOMContentLoaded", function () {
    const commentsToggle = document.querySelector('#commentsToggle');
    const commentsSection = document.querySelector('.comments');
    const commentBtn = document.querySelector('.comment-btn');

    // Show comments when the comment icon is clicked
    commentBtn.addEventListener('click', function () {
        commentsToggle.checked = !commentsToggle.checked;
        commentsSection.style.display = commentsToggle.checked ? 'block' : 'none';
    });

    // Close comments when clicking anywhere outside the comments section
    document.addEventListener('click', function (event) {
        if (!commentsSection.contains(event.target) &&
            !commentBtn.contains(event.target) &&
            !commentsToggle.contains(event.target)) {
            commentsSection.style.display = 'none';
            commentsToggle.checked = false; // Uncheck the toggle
        }
    });

    // Prevent event propagation when clicking inside the comments section
    commentsSection.addEventListener('click', function (event) {
        event.stopPropagation();
    });
});