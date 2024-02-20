const express = require("express");
const app = express();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const helmet = require("helmet");

const PORT = 5000;

const crypto = require("crypto");
const secretKey = crypto.randomBytes(256).toString("hex");

// Use middleware
app.use(express.json());
app.use(helmet());

// Database connection with error handling
mongoose
  .connect(
    "mongodb+srv://timileyinolayuwa:CMvRsRvRHxV3E1Aj@signupdata.ybajhry.mongodb.net/?retryWrites=true&w=majority",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => console.log("Database connected successfully"))
  .catch((error) => {
    console.error("Database connection failed:", error);
    process.exit(1); // Exit the application if the database connection fails
  });

// Define mongoose model
const Profile = require("./models/profile.model");

// Saves user signup details
app.post("/api/signup", async (req, res) => {
  const { firstname, lastname, address, email, password, birthdate } = req.body;

  // Validate required fields
  if (
    !firstname ||
    !lastname ||
    !address ||
    !email ||
    !password ||
    !birthdate
  ) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new Profile({
      firstname,
      lastname,
      address,
      email,
      birthdate,
      password: hashedPassword,
    });
    await user.save();

    res.status(201).json({
      message: `${firstname} ${lastname} registered successfully`,
    });
  } catch (error) {
    console.error("Error creating user:", error);
    if (error.code === 11000 && error.keyPattern && error.keyPattern.email) {
      return res.status(400).json({ message: "Email already exists" });
    }
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/api/signup", (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json();
});

app.post("/api/signin", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await Profile.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign({ userid: user._id, email: user.email }, secretKey, {
      expiresIn: "1h",
    });

    // Return the token in the response
    res.status(200).json({ message: "Sign-in successful", accessToken: token });
  } catch (error) {
    console.error("Error during sign-in:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
