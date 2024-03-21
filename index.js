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

// const dbLink = process.env.MONGODO_URI;

const allowedOrigin = [
  "https://bakkers-driving-school.onrender.com",
  "https://course-instruction.vercel.app",
  "http://localhost:3000",
];
const corsOptions = {
  origin: allowedOrigin,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

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
app.post("/api/signup", cors(corsOptions), async (req, res) => {
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

    // Create score document for the user
    const score = new Score({ userId: user?._id });
    await score.save();

    res.status(201).json({
      message: `${firstname} ${lastname} registered successfully`,
      userId: user?._id,
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

app.post("/api/signin", cors(corsOptions), async (req, res) => {
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

/*app.post(
  "/api/submit-quiz/:chapter",
  cors(corsOptions),
  verifyToken,
  async (req, res) => {
    const userId = req.user.userid;
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
  }
);
*/

app.get("/api/dashboard", cors(corsOptions), async (req, res) => {
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
/*
app.get(
  "/api/get-score/:chapter",
  cors(corsOptions),
  verifyToken,
  async (req, res) => {
    const { userId } = req.user;
    const { chapter } = req.params;

    try {
      // Fetch the user's score for the specified chapter
      const userScore = await Score.findOne({ userId });

      if (!userScore || !userScore[chapter]) {
        return res.status(404).json({
          error: `Score for chapter ${chapter} not found for the user`,
        });
      }

      const scoreForChapter = userScore[chapter];
      res.json({ chapter, score: scoreForChapter });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);
*/
app.get("/api/get-user-scores/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    // Find scores for the specified user
    const userScores = await Score.findOne({ userId });

    if (!userScores) {
      return res.status(404).json({
        message: "Scores not found for the user",
      });
    }

    // Return the user's scores
    res.status(200).json({ scores: userScores });
  } catch (error) {
    console.error("Error fetching user scores:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/api/update-user-score/:userId/:chapter", async (req, res) => {
  const { userId, chapter } = req.params;
  const { score } = req.body;

  try {
    // Find the score document for the user
    const userScore = await Score.findOne({ userId });

    if (!userScore) {
      return res.status(404).json({
        message: "Scores not found for the user",
      });
    }

    userScore.chapterScores = userScore.chapterScores || {};

    // Update the score for the specified chapter
    userScore.chapterScores[chapter] = score;
    await userScore.save();
    console.log({ updatedScore: score });

    res.status(200).json({
      message: `Score updated for ${chapter}`,
      updatedScore: userScore,
    });
  } catch (error) {
    console.error("Error updating user score:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
