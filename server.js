const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const socketIo = require('socket.io');

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB connection
mongoose.connect('mongodb+srv://s3978535:RedPoint2905@rmitmatchfinding.tt8ia78.mongodb.net/RmitTeamFinding', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
    console.log('Connected to MongoDB');
});

// Define a mongoose schema for the student data
const studentSchema = new mongoose.Schema({
    name: String,
    studentID: String,
    mobile: String, // Add mobile phone number field
    universityEmail: String,
    interests: String,
    overallGPA: Number,
    courses: [{
        courseTitle: String,
        desiredGPA: String,
        notes: String
    }]
});

const Student = mongoose.model('Student', studentSchema);

// Configure Passport.js
passport.use(new LocalStrategy(
    function(username, password, done) {
        // Your authentication logic here
        // Call done(err, user) with appropriate values
    }
));

// Initialize Passport.js
app.use(passport.initialize());

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Route to handle form submission
app.post('/submit', async (req, res) => {
  try {
      const studentData = req.body; // Assuming the form data is sent as JSON
      console.log("Received form data:", studentData); // Log received form data
      
      // Filter out empty courses
      const validCourses = studentData.courses.filter(course => {
          return course.courseTitle.trim() !== '' && course.courseTitle !== ' ( - )'; // Check if the course title is not empty or placeholder
      });
      
      // Construct student object with valid courses
      const student = new Student({
          name: studentData.name,
          studentID: studentData.studentID,
          mobile: studentData.mobile, // Make sure mobile is correctly assigned
          universityEmail: studentData.universityEmail,
          interests: studentData.interests,
          overallGPA: studentData.overallGPA,
          courses: validCourses.map(course => ({
              courseTitle: course.courseTitle,
              desiredGPA: course.desiredGPA,
              notes: course.notes
          }))
      });

      await student.save();
      console.log("Student data saved successfully:", studentData); // Log saved student data
      res.status(201).send('Student data saved successfully!');
  } catch (err) {
      console.error(err);
      res.status(500).send('Internal server error');
  }
});


// Route to find teammates
app.post('/findTeammate', async (req, res) => {
    try {
        const { name, interests, overallGPA, courses } = req.body;
        console.log("Received search criteria:", { name, interests, overallGPA, courses });

        // Construct query criteria
        const queryCriteria = {
            ...(interests ? { interests } : {}),
            ...(name ? { name } : {}),
            overallGPA: { $gte: overallGPA - 0.2, $lte: overallGPA + 0.2 }, // Find students with GPA within 0.1 range
        };

        console.log("Constructed query criteria:", queryCriteria); // Log constructed query criteria

        // Query MongoDB for students who match the criteria and sort by GPA descending
        const matchingStudents = await Student.find(queryCriteria).sort({ overallGPA: -1 });

        console.log("matchingStudents ", matchingStudents);

        if (matchingStudents.length === 0) {
            return res.status(200).json({ message: "No student with similar data found" });
        }

        //Search Course
        let matchNewStudents = [];

        for (let index = 0; index < matchingStudents.length; index++) {
            const element = matchingStudents[index];
            if (element.courses.length) {
                const newArrCourse = [...new Set(element.courses)];
                const queryCriteriaCourse = {
                    // Find students with all matching courses
                    courses: {
                        $all: newArrCourse.map((course) => ({
                            $elemMatch: {
                                courseTitle: new RegExp(course.courseTitle.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&"), "i"),
                                desiredGPA: course.desiredGPA,
                            },
                        })),
                    },
                };

                const matchingStudentsCourse = await Student.find(queryCriteriaCourse).sort({ overallGPA: -1 });

                if (matchingStudentsCourse && matchingStudentsCourse.length) {
                    matchNewStudents = matchNewStudents.concat(
                        matchingStudentsCourse.filter(
                            (student) =>
                                !matchingStudents.filter((old) => old._id.toString() === student._id.toString()).length &&
                                !matchNewStudents.filter((old) => old._id.toString() === student._id.toString()).length
                        )
                    );
                }
            }
        }

        // Return the list of matching students
        res.status(200).json([...matchingStudents, ...matchNewStudents]);
    } catch (error) {
        console.error("Error finding matching students:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Initialize Socket.IO
const server = app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

const io = socketIo(server);

// Socket.IO logic
io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});
