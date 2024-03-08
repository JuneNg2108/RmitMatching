const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB connection
mongoose.connect('mongodb+srv://s3978535:RedPoint2905@rmitmatchfinding.tt8ia78.mongodb.net/test', {
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
    dob: Date,
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

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Route to handle form submission
app.post('/submit', async (req, res) => {
    try {
        const studentData = req.body; // Assuming the form data is sent as JSON
        const student = new Student(studentData);
        await student.save();
        res.status(201).send('Student data saved successfully!');
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal server error');
    }
});
// Route to handle finding teammates
app.post('/findTeammate', async (req, res) => {
    try {
        // Get the course data from the request body
        const { courses } = req.body;

        // Query MongoDB for students with similar courses
        const matchingStudents = await Student.find({ 'courses.courseTitle': { $in: courses.map(course => course.courseTitle) } });

        if (matchingStudents.length === 0) {
            return res.status(200).json({ message: "No student with similar data found" });
        }

        // Return the list of matching students
        res.status(200).json(matchingStudents);
    } catch (error) {
        console.error("Error finding matching students:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});


// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
