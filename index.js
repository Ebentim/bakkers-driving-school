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

app.use(express.json());
app.use(helmet());

mongoose
  .connect(
    "mongodb+srv://timileyinolayuwa:CMvRsRvRHxV3E1Aj@signupdata.ybajhry.mongodb.net/?retryWrites=true&w=majority",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => {
    console.log("Database connected successfully");
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Database connection failed:", error);
    process.exit(1);
  });

const Profile = require("./models/profile.model");
const Token = require("./models/token.model");
const Score = require("./models/score.model");

const saveOrUpdateTokenToDatabase = async (userId, token) => {
  try {
    const existingToken = await Token.findOne({ userId });

    if (existingToken) {
      existingToken.accessToken = token;
      existingToken.expiresAt = Date.now() + 3600000;
      await existingToken.save();
    } else {
      const newToken = new Token({
        userId,
        accessToken: token,
        expiresAt: Date.now() + 3600000,
      });

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

app.post("/api/signup", cors(corsOptions), async (req, res) => {
  const { firstname, lastname, address, email, password, birthdate } = req.body;

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
    await saveOrUpdateTokenToDatabase(user._id, token);
    res.status(200).json({ message: "Sign-in successful", accessToken: token });
  } catch (error) {
    console.error("Error during sign-in:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

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

    req.user = decoded;
    next();
  });
};

const fetchTokenMiddleware = async (req, res, next) => {
  const userId = req.user.userid;

  try {
    const token = await fetchTokenFromDatabase(userId);

    if (token.expiresAt < Date.now()) {
      await Token.deleteOne({ userId });
      throw new Error("Token has expired");
    }
    req.accessToken = token.accessToken;
    next();
  } catch (error) {
    console.error("Error fetching token:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

app.use("/api/dashboard", verifyToken, fetchTokenMiddleware);

app.get("/api/dashboard", cors(corsOptions), async (req, res) => {
  const accessToken = req.accessToken;
  try {
    const user = await Profile.findOne({ email: req.user.email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ user });
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});
app.get("/api/get-user-scores/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const userScores = await Score.findOne({ userId });

    if (!userScores) {
      return res.status(404).json({
        message: "Scores not found for the user",
      });
    }

    res.status(200).json({ scores: userScores });
  } catch (error) {
    console.error("Error fetching user scores:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.put("/api/update-user-score/:userId/:chapter", async (req, res) => {
  const { userId, chapter } = req.params;
  const { score } = req.body;

  try {
    const userScore = await Score.findOneAndUpdate(
      { userId },
      { $set: { [chapter]: score } },
      { new: true }
    );

    if (!userScore) {
      return res.status(404).json({
        message: "Scores not found for the user",
      });
    }

    userScore.chapterScores = userScore.chapterScores || {};

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

app.get("/api/time/:userId", async (req, res) => {
  const userId = req.params.userId;
  try {
    const currentTime = await Profile.findById(userId);
    if (currentTime) {
      res.status(200).json({ currentTime });
    } else {
      throw new Error("User not found");
    }
  } catch (error) {
    console.error("Error fetching current time:", error);
    res.status(404).json({ error: "Failed to fetch current time" });
  }
});

app.put("/api/time/:userId", async (req, res) => {
  const userId = req.params.userId;
  const { time } = req.body;
  try {
    const user = await Profile.findByIdAndUpdate(
      userId,
      { startingtime: time },
      { new: true }
    );
    if (!user) {
      throw new Error("User not found");
    }
    console.log("User found and updated");
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error updating user time:", error);
    res.status(404).json({ error: "Failed to update user time" });
  }
});
