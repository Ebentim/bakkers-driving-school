const express = require("express");
const app = express();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const helmet = require("helmet");
const cors = require("cors");
const PORT = 5000;

const crypto = require("crypto");
const secretKey = crypto.randomBytes(256).toString("hex");
require("dotenv").config();

const dbLink = process.env.MONGODO_URI;
// Use middleware
app.use(
  cors({
    origin: "https://course-instruction.netlify.app",
    credentials: true,
  })
);

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
const Token = require("./models/token.model");
const Score = require("./models/score.model");

// Function to save or update token in the database
const saveOrUpdateTokenToDatabase = async (userId, token) => {
  try {
    // Check if a token already exists for the user
    const existingToken = await Token.findOne({ userId });

    if (existingToken) {
      // Update the existing token
      existingToken.accessToken = token;
      existingToken.expiresAt = Date.now() + 3600000;
      await existingToken.save();
    } else {
      // Create a new Token document
      const newToken = new Token({
        userId,
        accessToken: token,
        expiresAt: Date.now() + 3600000,
      });

      // Save the token document to the database
      await newToken.save();
    }
  } catch (error) {
    throw new Error(
      "Error saving or updating token to the database: " + error.message
    );
  }
};

// Function to fetch token from the database
const fetchTokenFromDatabase = async (userId) => {
  try {
    // Find the token document for the user
    const tokenDoc = await Token.findOne({ userId });

    if (tokenDoc) {
      return tokenDoc.accessToken;
    } else {
      throw new Error("Token not found for user");
    }
  } catch (error) {
    throw new Error("Error fetching token from the database: " + error.message);
  }
};

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
    // saves or updates Token to the database
    await saveOrUpdateTokenToDatabase(user._id, token);
    // Return the token in the response
    res.status(200).json({ message: "Sign-in successful", accessToken: token });
  } catch (error) {
    console.error("Error during sign-in:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Add this middleware function
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization;

  if (!token) {
    return res
      .status(401)
      .json({ message: "Unauthorized - Access Token is missing" });
  }

  jwt.verify(token, secretKey, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .json({ message: "Unauthorized - Invalid Access Token" });
    }

    req.user = decoded; // Attach user information to the request object
    next();
  });
};

// middleware to fetch the access token
const fetchTokenMiddleware = async (req, res, next) => {
  const userId = req.user.userid;

  try {
    const token = await fetchTokenFromDatabase(userId);

    if (token.expiresAt < Date.now()) {
      // Token has expired, delete it from the database
      await Token.deleteOne({ userId });
      throw new Error("Token has expired");
    }
    req.accessToken = token.accessToken; // Attach the token to the request object
    next();
  } catch (error) {
    console.error("Error fetching token:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Use the middleware for protected routes
app.use("/api/dashboard", verifyToken, fetchTokenMiddleware);
app.post("/api/submit-quiz/:chapter", verifyToken, async (req, res) => {
  const { userId } = req.body;
  const { chapter } = req.params;
  const { score } = req.body;

  try {
    // Check if the user has submitted the quiz twice in the last hour
    const lastTwoSubmissions = await Score.find({
      userId,
      createdAt: { $gte: new Date(Date.now() - 3600000) }, // One hour ago
    })
      .sort({ createdAt: "desc" })
      .limit(2);

    if (lastTwoSubmissions.length === 2) {
      return res.status(400).json({
        error: "You have reached the limit of quiz attempts in one hour",
      });
    }

    // Update the score in the database
    const updatedScore = await Score.findOneAndUpdate(
      { userId },
      { $inc: { [chapter]: score } },
      { new: true, upsert: true }
    );

    res.json({ message: "Quiz submitted successfully", score: updatedScore });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/dashboard", async (req, res) => {
  const accessToken = req.accessToken;
  try {
    const user = await Profile.findOne({ email: req.user.email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Return user data in the response
    res.status(200).json({ user });
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// const quizScoresDB = {};

// app.post('/api/scores/:chapter', (req, res) => {
//   const { chapter } = req.params;
//   const { score } = req.body;

//   quizScoresDB[chapter] = score;

//   res.status(200).json({ success: true });
// });

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
