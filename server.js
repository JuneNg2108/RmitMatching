const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

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
        console.log("Received form data:", studentData); // Log received form data
        const student = new Student(studentData);
        await student.save();
        console.log("Student data saved successfully:", studentData); // Log saved student data
        res.status(201).send('Student data saved successfully!');
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal server error');
    }
});

app.post('/findTeammate', async (req, res) => {
    try {
        console.log("Request body:", req.body); // Log the entire request body
        // Get the student data from the request body
        const { name, overallGPA } = req.body;
        console.log("Received search criteria:", { name, overallGPA }); // Log received search criteria

        // Construct the range for overall GPA matching
        const minGPA = overallGPA - 0.1; // Minimum GPA in the range
        const maxGPA = overallGPA + 0.1; // Maximum GPA in the range

        // Construct the query criteria to find students with GPAs within ±0.1 of the provided GPA
        const queryCriteria = {
            overallGPA: { $gte: minGPA, $lte: maxGPA } // Find students with GPA within ±0.1 of the provided GPA
        };

        console.log("Constructed query criteria:", queryCriteria); // Log constructed query criteria

        // Query MongoDB for students who match the criteria and sort by GPA descending
        const matchingStudents = await Student.find(queryCriteria).sort({ overallGPA: -1 });

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
