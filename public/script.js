document.addEventListener("DOMContentLoaded", function() {
    const addCourseBtn = document.getElementById("addCourse");
    const coursesContainer = document.getElementById("courses");

    addCourseBtn.addEventListener("click", function() {
        addCourse();
    });

    function addCourse() {
        const courseDiv = document.createElement("div");
        courseDiv.classList.add("course");
    
        const courseFields = `
            <label for="courseTitle">Course:</label>
            <input type="text" class="courseTitle" name="courseTitle[]" required>
            
            <label for="desiredGPA">Desired GPA:</label>
            <select class="desiredGPA" name="desiredGPA[]">
                <option value="HD">HD (80-100)</option>
                <option value="DI">DI (70-79)</option>
                <option value="CR">CR (60-69)</option>
                <option value="PA">PA (50-59)</option>
            </select>
    
            <label for="notes">Notes:</label>
            <textarea class="notes" name="notes[]" rows="2" cols="30"></textarea>
    
            <button type="button" class="removeCourse">Remove Course</button>
        `;
    
        courseDiv.innerHTML = courseFields;
    
        coursesContainer.appendChild(courseDiv);
    
        // Set up event listeners for the new course title input
        const courseTitleInput = courseDiv.querySelector(".courseTitle");
        const dropdownMenu = document.createElement("div");
        dropdownMenu.classList.add("dropdown-menu");
        courseTitleInput.parentNode.insertBefore(dropdownMenu, courseTitleInput.nextSibling);
    
        // Add functionality to remove the course
        const removeCourseBtn = courseDiv.querySelector(".removeCourse");
        removeCourseBtn.addEventListener("click", function() {
            coursesContainer.removeChild(courseDiv);
        });
    
        // Fetch data from courses.json
        fetch("courses.json")
            .then(response => {
                if (!response.ok) {
                    throw new Error("Network response was not ok");
                }
                return response.json();
            })
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
                // After fetching data, set visibility to visible
                courseDiv.style.display = "block";
            })
            .catch(error => console.error("Error fetching data:", error)); // Catch any errors during the fetch request
    }
    
    
    function renderDropdown(courses, dropdownMenu, courseTitleInput) {
        dropdownMenu.innerHTML = "";
        if (courses.length > 0) {
            dropdownMenu.style.display = "block";
            courses.forEach(course => {
                const option = document.createElement("div");
                option.classList.add("dropdown-item");
                option.textContent = `${course["COURSE CODE"]} - ${course["COURSE TITLE"]} (${course["CAMPUS"]} - ${course["SEMESTER"]})`;
                option.addEventListener("click", function() {
                    if (courseTitleInput) {
                        courseTitleInput.value = `${course["COURSE CODE"]} - ${course["COURSE TITLE"]} (${course["CAMPUS"]} - ${course["SEMESTER"]})`;
                    }
                    if (dropdownMenu) {
                        dropdownMenu.style.display = "none";
                    }
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
                if (dropdownMenu) {
                    dropdownMenu.style.display = "none";
                }
            });
        }
    });

    // Form submission handling
    const form = document.getElementById("teamFormationForm");
    form.addEventListener("submit", function(event) {
        event.preventDefault(); // Prevent default form submission

        // Collect form data
        const formData = new FormData(form);
        const studentData = {
            name: formData.get('name'),
            studentID: formData.get('studentID'),
            dob: formData.get('dob'),
            universityEmail: formData.get('universityEmail'),
            interests: formData.get('interests'),
            overallGPA: parseFloat(formData.get('overallGPA')),
            courses: []
        };

        // Retrieve course data
        const courseDivs = document.querySelectorAll('.course');
        courseDivs.forEach(courseDiv => {
            const courseTitleInput = courseDiv.querySelector('.courseTitle');
            const courseTitle = courseTitleInput ? courseTitleInput.value : ''; // Get the original course title or an empty string if element not found
            
            // Retrieve other course information
            const desiredGPAInput = courseDiv.querySelector('.desiredGPA');
            const desiredGPA = desiredGPAInput ? desiredGPAInput.value : '';
            
            const notesInput = courseDiv.querySelector('.notes');
            const notes = notesInput ? notesInput.value : '';

            // Check if campus and semester elements exist before accessing their values
            const campusInput = courseDiv.querySelector('.campus');
            const campus = campusInput ? campusInput.value : '';

            const semesterInput = courseDiv.querySelector('.semester');
            const semester = semesterInput ? semesterInput.value : '';

            // Modify the course title before pushing it into the studentData.courses array
            const modifiedCourseTitle = `${courseTitle} (${campus} - ${semester})`;

            studentData.courses.push({ courseTitle: modifiedCourseTitle, desiredGPA, notes });
        });

        // Submit form data asynchronously using fetch
        fetch("/submit", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(studentData)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error("Network response was not ok");
            }
            return response.text(); // Assuming the response is text
        })
        .then(data => {
            console.log("Form submitted successfully:", data);
            // Optionally, display a success message to the user
        })
        .catch(error => {
            console.error("Error submitting form:", error);
            // Optionally, display an error message to the user
        });
    });
});


document.addEventListener("DOMContentLoaded", function() {
    const findTeammateBtn = document.getElementById("findTeammateBtn");

    findTeammateBtn.addEventListener("click", function() {
        // Collect course data from the UI
        const courses = Array.from(document.querySelectorAll('.course')).map(courseDiv => {
            const courseTitleInput = courseDiv.querySelector('.courseTitle');
            const courseTitle = courseTitleInput ? courseTitleInput.value : '';
    
            // Retrieve other course information
            const desiredGPAInput = courseDiv.querySelector('.desiredGPA');
            const desiredGPA = desiredGPAInput ? desiredGPAInput.value : '';
    
            const notesInput = courseDiv.querySelector('.notes');
            const notes = notesInput ? notesInput.value : '';
    
            // Check if campus and semester elements exist before accessing their values
            const campusInput = courseDiv.querySelector('.campus');
            const campus = campusInput ? campusInput.value : '';
    
            const semesterInput = courseDiv.querySelector('.semester');
            const semester = semesterInput ? semesterInput.value : '';
    
            return {
                courseTitle,
                desiredGPA,
                campus,
                semester
            };
        });
    
        // Send the course data in the request body
        fetch("/findTeammate", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ courses })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error("Network response was not ok");
            }
            return response.json();
        })
        .then(data => {
            if (data.message === "No student with similar data found") {
                alert(data.message);
            } else {
                // Display the list of matching students
                displayMatchingStudents(data);
            }
        })
        .catch(error => {
            console.error("Error finding matching students:", error);
            // Optionally, display an error message to the user
            alert("Error finding matching students. Please try again later.");
        });
    });

    // Function to display the list of matching students
    function displayMatchingStudents(students) {
        const resultList = document.getElementById("resultList");
        resultList.innerHTML = ""; // Clear any previous results
        
        if (students.length === 0) {
            // If no matching students found, display a message
            resultList.innerHTML = "<p>No student with similar data found</p>";
        } else {
            // Iterate over each matching student and create a list item for them
            students.forEach(student => {
                const listItem = document.createElement("li");
                listItem.innerHTML = `
                    <p>Name: ${student.name}</p>
                    <p>Date of Birth: ${student.dob}</p>
                    <p>University Email: ${student.universityEmail}</p>
                    <p>Courses:</p>
                    <ul>
                        ${student.courses.map(course => `<li>${course.courseTitle} - Desired GPA: ${course.desiredGPA}</li>`).join("")}
                    </ul>
                `;
                resultList.appendChild(listItem);
            });
        }
    }
});
