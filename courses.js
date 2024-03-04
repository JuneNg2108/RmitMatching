document.addEventListener("DOMContentLoaded", function() {
    const courseTitleInputs = document.querySelectorAll(".courseTitle");

    courseTitleInputs.forEach(courseTitleInput => {
        const dropdownMenu = document.createElement("div");
        dropdownMenu.classList.add("dropdown-menu");
        courseTitleInput.parentNode.insertBefore(dropdownMenu, courseTitleInput.nextSibling);

        // Fetch data from courses.json
        fetch("courses.json")
            .then(response => response.json())
            .then(data => {
                const courses = Object.values(data);
                courseTitleInput.addEventListener("input", function() {
                    const userInput = courseTitleInput.value.toLowerCase();
                    const filteredCourses = courses.filter(course => {
                        return course && 
                               course["COURSE CODE"] && 
                               course["COURSE TITLE"] &&
                               (course["COURSE CODE"].toLowerCase().includes(userInput) ||
                               course["COURSE TITLE"].toLowerCase().includes(userInput));
                    });

                    // Display filtered courses in the dropdown menu
                    renderDropdown(filteredCourses, dropdownMenu, courseTitleInput);
                });
            })
            .catch(error => console.error("Error fetching data:", error)); // Catch any errors during the fetch request
    });

    function renderDropdown(courses, dropdownMenu, courseTitleInput) {
        dropdownMenu.innerHTML = "";
        if (courses.length > 0) {
            dropdownMenu.style.display = "block";
            courses.forEach(course => {
                const option = document.createElement("div");
                option.classList.add("dropdown-item");
                option.textContent = `${course["COURSE CODE"]} - ${course["COURSE TITLE"]} (${course["CAMPUS"]} - ${course["SEMESTER"]})`;
                option.addEventListener("click", function() {
                    courseTitleInput.value = `${course["COURSE CODE"]} - ${course["COURSE TITLE"]}`;
                    dropdownMenu.style.display = "none";
                });
                dropdownMenu.appendChild(option);
            });
        } else {
            dropdownMenu.style.display = "none";
        }
    }

    // Close the dropdown menu when clicking outside of it
    document.addEventListener("click", function(event) {
        if (!event.target.matches(".courseTitle") && !event.target.matches(".dropdown-item")) {
            const dropdownMenus = document.querySelectorAll(".dropdown-menu");
            dropdownMenus.forEach(dropdownMenu => {
                dropdownMenu.style.display = "none";
            });
        }
    });
});
