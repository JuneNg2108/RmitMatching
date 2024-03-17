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

        const courseTitleInput = courseDiv.querySelector(".courseTitle");
        const dropdownMenu = document.createElement("div");
        dropdownMenu.classList.add("dropdown-menu");
        courseTitleInput.parentNode.insertBefore(dropdownMenu, courseTitleInput.nextSibling);

        const removeCourseBtn = courseDiv.querySelector(".removeCourse");
        removeCourseBtn.addEventListener("click", function() {
            coursesContainer.removeChild(courseDiv);
        });

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
                    renderDropdown(filteredCourses, dropdownMenu, courseTitleInput);
                });
                courseDiv.style.display = "block";
            })
            .catch(error => console.error("Error fetching data:", error));
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

    const form = document.getElementById("teamFormationForm");
    form.addEventListener("submit", function(event) {
        event.preventDefault();

        const formData = new FormData(form);
        const studentData = {
            name: formData.get('name'),
            studentID: formData.get('studentID'),
            mobile: formData.get('mobile'),
            universityEmail: formData.get('universityEmail'),
            interests: formData.get('interests'),
            overallGPA: parseFloat(formData.get('overallGPA')),
            courseTitle: Array.from(formData.getAll('courseTitle')),
            courses: []
        };

        const courseDivs = document.querySelectorAll('.course');
        courseDivs.forEach(courseDiv => {
            const courseTitleInput = courseDiv.querySelector('.courseTitle');
            const courseTitle = courseTitleInput ? courseTitleInput.value : '';

            const desiredGPAInput = courseDiv.querySelector('.desiredGPA');
            const desiredGPA = desiredGPAInput ? desiredGPAInput.value : '';

            const notesInput = courseDiv.querySelector('.notes');
            const notes = notesInput ? notesInput.value : '';

            const campusInput = courseDiv.querySelector('.campus');
            const campus = campusInput ? campusInput.value : '';

            const semesterInput = courseDiv.querySelector('.semester');
            const semester = semesterInput ? semesterInput.value : '';

            const modifiedCourseTitle = `${courseTitle} (${campus} - ${semester})`;

            studentData.courses.push({ courseTitle: modifiedCourseTitle, desiredGPA, notes });
        });

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
            return response.text();
        })
        .then(data => {
            console.log("Form submitted successfully:", data);
        })
        .catch(error => {
            console.error("Error submitting form:", error);
        });
    });

    const findTeammateBtn = document.getElementById("findTeammateBtn");
    findTeammateBtn.addEventListener("click", async function(event) {
        event.preventDefault();
        
        const courses = Array.from(document.querySelectorAll('.course')).map(courseDiv => {
            const courseTitleInput = courseDiv.querySelector('.courseTitle');
            const courseTitle = courseTitleInput ? courseTitleInput.value : '';

            const desiredGPAInput = courseDiv.querySelector('.desiredGPA');
            const desiredGPA = desiredGPAInput ? desiredGPAInput.value : '';

            const notesInput = courseDiv.querySelector('.notes');
            const notes = notesInput ? notesInput.value : '';

            return {
                courseTitle,
                desiredGPA,
                notes
            };
        });

        const formData = new FormData(document.getElementById("teamFormationForm"));
        const studentData = {
            name: formData.get('name'),
            studentID: formData.get('studentID'),
            mobile: formData.get('mobile'),
            universityEmail: formData.get('universityEmail'),
            interests: formData.get('interests'),
            overallGPA: parseFloat(formData.get('overallGPA')),
            courseTitle: Array.from(formData.getAll('courseTitle')),
            courses: []
        };

        try {
            const response = await fetch("/findTeammate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(studentData)
            });

            if (!response.ok) {
                throw new Error("Network response was not ok");
            }

            const data = await response.json();

            if (data.message === "No student with similar data found") {
                alert(data.message);
            } else {
                displayMatchingStudents(data);
            }
        } catch (error) {
            console.error("Error finding matching students:", error);
            alert("Error finding matching students. Please try again later.");
        }
    });

    function displayMatchingStudents(students) {
        const container = document.createElement("div");
        container.classList.add("container");

        const overlay = document.createElement("div");
        overlay.classList.add("overlay");

        const closeButton = document.createElement("button");
        closeButton.textContent = "Close";
        closeButton.classList.add("close-button");
        closeButton.addEventListener("click", function() {
            document.body.removeChild(overlay);
        });

        const resultList = document.createElement("ul");
        resultList.classList.add("result-list");

        if (students.length === 0) {
            const listItem = document.createElement("li");
            listItem.textContent = "No student with similar data found";
            resultList.appendChild(listItem);
        } else {
            students.forEach(student => {
                const listItem = document.createElement("li");
                listItem.innerHTML = `
                    <p><strong>Name:</strong> ${student.name}</p>
                    <p><strong>Student ID:</strong> ${student.studentID}</p>
                    <p><strong>Mobile:</strong> ${student.mobile}</p>
                    <p><strong>University Email:</strong> ${student.universityEmail}</p>
                    <p><strong>GPA:</strong> ${student.overallGPA}</p>
                    <p><strong>Courses:</strong></p>
                    <ul>
                        ${student.courses.map(course => `<li>${course.courseTitle} - Desired GPA: ${course.desiredGPA}</li>`).join("")}
                    </ul>
                `;

                const connectButton = document.createElement("button");
                connectButton.textContent = "Connect";
                connectButton.classList.add("connectButton");
                connectButton.dataset.studentId = student.studentID;
                connectButton.addEventListener("click", function() {
                    connectWithTeammate(student.studentID);
                });

                listItem.appendChild(connectButton);
                resultList.appendChild(listItem);
            });
        }

        overlay.appendChild(container);
        container.appendChild(closeButton);
        container.appendChild(resultList);
        document.body.appendChild(overlay);
    }

    function connectWithTeammate(studentID) {
        fetch(`/connect/${studentID}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ studentID })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error("Network response was not ok");
            }
            return response.json();
        })
        .then(data => {
            console.log("Connection data:", data);
            if (data && data.student1 && data.student2) {
                displayChatBox(data.student1, data.student2);
            } else {
                console.error("Error: Invalid data received from the server.");
            }
        })
        .catch(error => {
            console.error("Error connecting with teammate:", error);
        });
    }
    

    function displayChatBox(student1, student2) {
        if (!student1 || !student2) {
            console.error("One or both students are undefined.");
            return;
        }
    
        const chatBoxId = `${student1.studentID}-${student2.studentID}`;
        let chatBox = document.getElementById(chatBoxId);
        if (!chatBox) {
            chatBox = document.createElement("div");
            chatBox.id = chatBoxId;
            chatBox.classList.add("chat-box");
    
            const messagesContainer = document.createElement("div");
            messagesContainer.classList.add("messages-container");
    
            const inputField = document.createElement("input");
            inputField.classList.add("message-input");
            inputField.setAttribute("placeholder", "Type your message...");
    
            const sendButton = document.createElement("button");
            sendButton.textContent = "Send";
            sendButton.classList.add("send-button");
    
            chatBox.appendChild(messagesContainer);
            chatBox.appendChild(inputField);
            chatBox.appendChild(sendButton);
    
            document.body.appendChild(chatBox);
    
            sendButton.addEventListener("click", () => {
                sendMessage(student1, student2, inputField.value);
            });
        }
    }
    

    function sendMessage(sender, receiver, message) {
        fetch("/send-message", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ sender, receiver, message })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error("Network response was not ok");
            }
        })
        .catch(error => {
            console.error("Error sending message:", error);
        });
    }
});


document.getElementById('openGpaCalculator').addEventListener('click', function() {
    var gpaCalculatorContainer = document.getElementById('gpaCalculatorContainer');
    gpaCalculatorContainer.style.display = gpaCalculatorContainer.style.display === 'none' ? 'block' : 'none';
});


