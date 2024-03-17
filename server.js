const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const socketIo = require('socket.io');

const app = express();
const PORT = process.env.PORT || 3001;

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
    mobile: String, // Mobile phone number field
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
        const formData = req.body;

        // Filter out empty courses
        const validCourses = formData.courses.filter(course => {
            return course.courseTitle.trim() !== '' && course.courseTitle !== ' ( - )';
        });

        if (validCourses.length === 0) {
            return res.status(400).send('No valid courses provided');
        }

        const existingStudent = await Student.findOne({ studentID: formData.studentID });

        if (existingStudent) {
            // Iterate through validCourses and add them if they don't already exist
            validCourses.forEach(newCourse => {
                const courseExists = existingStudent.courses.some(existingCourse => {
                    return existingCourse.courseTitle === newCourse.courseTitle; // Consider using a more reliable identifier
                });

                if (!courseExists) {
                    existingStudent.courses.push(newCourse); // Add new course since it doesn't exist
                }
            });

            await existingStudent.save();
            return res.status(200).send('Student data updated successfully with no duplicate courses!');
        } else {
            // If student does not exist, create a new student with the courses
            const newStudent = new Student({
                name: formData.name,
                studentID: formData.studentID,
                mobile: formData.mobile,
                universityEmail: formData.universityEmail,
                interests: formData.interests,
                overallGPA: formData.overallGPA,
                courses: validCourses
            });
            await newStudent.save();
            return res.status(201).send('New student data saved successfully!');
        }
    } catch (err) {
        console.error(err);
        return res.status(500).send('Internal server error');
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

        // Search Course
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

// New route to handle connecting with a teammate
app.post('/connect/:studentID', async (req, res) => {
    try {
        const studentID = req.params.studentID;

        // Find the current student who wants to connect
        const currentUser = await Student.findOne({ studentID });
        if (!currentUser) {
            return res.status(404).json({ message: 'Student not found' });
        }

        // Find a teammate for the current student
        const teammate = await findTeammate(currentUser);
        if (!teammate) {
            return res.status(404).json({ message: 'No teammate found' });
        }

        // Establish a connection between the current student and the teammate
        await establishConnection(currentUser, teammate);

        // Send a response indicating successful connection
        res.status(200).json({ message: 'Connected with teammate successfully', studentID, teammate });
    } catch (error) {
        console.error('Error connecting with teammate:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Function to find a teammate for the current student
async function findTeammate(currentUser) {
  try {
      // Query students from the database that match certain criteria for being a teammate
      // For example, you might want to find a teammate with similar interests or GPA

      // Define criteria for finding a teammate
      const teammateCriteria = {
          interests: currentUser.interests, // Consider teammates with similar interests
          overallGPA: { $gte: currentUser.overallGPA - 0.2, $lte: currentUser.overallGPA + 0.2 }, // GPA within 0.1 range
          studentID: { $ne: currentUser.studentID } // Exclude the current student from potential teammates
      };

      // Query the database for potential teammates
      const potentialTeammates = await Student.find(teammateCriteria).limit(1).lean();

      // If potential teammates are found, return the first one
      if (potentialTeammates.length > 0) {
          return potentialTeammates[0];
      } else {
          return null; // No suitable teammate found
      }
  } catch (error) {
      console.error('Error finding teammate:', error);
      return null; // Return null in case of an error
  }
}

// Function to establish a connection between two students
async function establishConnection(currentUser, teammate) {
  try {
      // Your logic to establish a connection between the current student and the teammate
      // This could involve creating a chat session, updating records in the database, etc.
      // For demonstration purposes, let's assume we are just updating a connection status in the database

      // Update the connection status for both the current student and the teammate
      await Promise.all([
          Student.updateOne({ _id: currentUser._id }, { $set: { connectedWith: teammate._id } }),
          Student.updateOne({ _id: teammate._id }, { $set: { connectedWith: currentUser._id } })
      ]);

      // Connection established successfully
      return true;
  } catch (error) {
      console.error('Error establishing connection:', error);
      return false; // Return false in case of an error
  }
}

app.get('/api/gpaPercentage/:gpa', async (req, res) => {
    const userGpa = parseFloat(req.params.gpa);
    try {
        const students = await Student.find({});
        const totalStudents = students.length;
        const lowerGpaCount = students.filter(student => student.overallGPA < userGpa).length;
        const percentage = (lowerGpaCount / totalStudents) * 100;
        
        res.json({ percentage: percentage.toFixed(2) });
    } catch (error) {
        console.error('Error fetching GPA comparison:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Feedback model
const Feedback = mongoose.model('Feedback', new mongoose.Schema({
    name: String,
    studentID: String,
    universityEmail: String,
    feedback: String
}));

// Route to handle feedback submission
app.post('/submit-feedback', async (req, res) => {
    try {
        const { name, studentID, universityEmail, feedback } = req.body;
        const newFeedback = new Feedback({ name, studentID, universityEmail, feedback });
        await newFeedback.save();
        res.status(200).json({ message: 'Feedback received successfully' });
    } catch (error) {
        console.error('Failed to receive feedback:', error);
        res.status(500).json({ error: 'Internal server error' });
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

    // Handle joining chat room
    socket.on('joinRoom', ({ room }) => {
        socket.join(room);
        console.log(`User joined room: ${room}`);
    });

    // Handle receiving and broadcasting messages
    socket.on('sendMessage', ({ room, message }) => {
        io.to(room).emit('message', message);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});
