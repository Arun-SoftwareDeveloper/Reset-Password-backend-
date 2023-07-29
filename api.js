const express = require("express");
const nodemailer = require("nodemailer");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
const port = 4000;

// Connection URL and database name
const dburl = "mongodb://0.0.0.0:27017/ForgotPassword";
const dbName = "password-reset-db";
const collectionName = "users";

app.use(express.json());
app.use(cors());

// Create reusable transporter object using SMTP transport
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: "arunramasamy46@gmail.com",
    pass: "rjewkexgisdqbqum",
  },
});

// Generate a random token
const generateToken = () => {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let token = "";
  for (let i = 0; i < 10; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    token += chars[randomIndex];
  }
  return token;
};

// Connect to the MongoDB database
mongoose
  .connect(dburl, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log("MongoDB connected!!!");
  })
  .catch((error) => {
    console.error("Error connecting to MongoDB:", error);
  });

const db = mongoose.connection;
const collection = db.collection(collectionName);

// POST endpoint for initiating password reset
app.post("/forgot-password", (req, res) => {
  const { email } = req.body;

  // Find the user with the provided email in the database
  collection.findOne({ email }, (err, user) => {
    if (err) {
      console.error("Error finding user:", err);
      res.status(500).json({ error: "Internal server error" });
      return;
    }

    if (!user) {
      // User not found
      res.status(404).json({ error: "User not found" });
      return;
    }
    // Generate a token and update the user's record in the database
    const token = generateToken();
    collection.updateOne({ email }, { $set: { token } }, (err) => {
      if (err) {
        console.error("Error updating user:", err);
        res.status(500).json({ error: "Internal server error" });
        return;
      }

      // Send the password reset link to the user's email
      const mailOptions = {
        from: "arunramasamy46@gmail.com",
        to: email,
        subject: "Password Reset",
        text: `Click the following link to reset your password: http://localhost:3000/resetpassword?token=${token}`,
      };

      transporter.sendMail(mailOptions, (err) => {
        if (err) {
          console.error("Error sending email:", err);
          res.status(500).json({ error: "Internal server error" });
          return;
        }

        res.json({ message: "Password reset link sent successfully" });
      });
    });
  });
});

// POST endpoint for registering a new user
app.post("/register", (req, res) => {
  const { email, password } = req.body;

  // Check if the user already exists in the database
  collection.findOne({ email }, (err, existingUser) => {
    if (err) {
      console.error("Error finding user:", err);
      return res.status(500).json({ error: "Internal server error" });
    }

    if (existingUser) {
      // User already exists
      return res.status(409).json({ error: "User already exists" });
    }

    // Create a new user object
    const user = {
      email,
      password,
      token: "",
    };

    // Insert the user into the collection
    collection.insertOne(user, (err) => {
      if (err) {
        console.error("Error creating user:", err);
        return res.status(500).json({ error: "Internal server error" });
      }

      res.json({ message: "User created successfully" });
    });
  });
});

// POST endpoint for resetting the password
app.post("/reset-password", (req, res) => {
  const { token, password } = req.body;

  // Find the user with the provided token in the database
  collection.findOne({ token }, (err, user) => {
    if (err) {
      console.error("Error finding user:", err);
      res.status(500).json({ error: "Internal server error" });
      return;
    }

    if (!user) {
      // User not found or token expired
      res.status(404).json({ error: "Invalid token" });
      return;
    }

    // Update the user's password and clear the token in the database
    collection.updateOne(
      { token },
      { $set: { password, token: "" } },
      (err) => {
        if (err) {
          console.error("Error updating user:", err);
          res.status(500).json({ error: "Internal server error" });
          return;
        }

        res.json({ message: "Password reset successful" });
      }
    );
  });
});

app.get("/", (req, res) => {
  res.send("Hello!!!");
});
// Start the server
app.listen(4000, () => {
  console.log(`Server running on http://localhost:${4000}`);
});
