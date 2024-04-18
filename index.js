const fs = require("fs");
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
const Dashboard = require("./models/admin.model");
const AdminToken = require("./models/adminToken.model");

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

const saveOrUpdateAdminTokenToDatabase = async (userId, token) => {
  try {
    const existingToken = await AdminToken.findOne({ userId });

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

const fetchAdminTokenFromDatabase = async (userId) => {
  try {
    const tokenDoc = await AdminToken.findOne({ userId });

    if (tokenDoc) {
      return tokenDoc.accessToken;
    } else {
      throw new Error("Token not found for user");
    }
  } catch (error) {
    throw new Error("Error fetching token from the database: " + error.message);
  }
};

app.post("/api/adminsignup", cors(corsOptions), async (req, res) => {
  const { firstname, lastname, email, password } = req.body;
  if (!firstname || !lastname || !email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const profileCount = await Dashboard.countDocuments();

    if (profileCount > 0) {
      return res.status(400).json({ message: "Maximum profile limit reached" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new Dashboard({
      firstname,
      lastname,
      email,
      password: hashedPassword,
    });
    await user.save();
    res.status(201).json({ message: "User created successfully!" });
  } catch (error) {
    console.error("Error creating user:", error);
    if (error.code === 11000 && error.keyPattern && error.keyPattern.email) {
      return res.status(400).json({ message: "Email already exists" });
    }
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/api/adminsignup", (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json();
});

app.get("/api/get-tokens", cors(corsOptions), async (req, res) => {
  try {
    // Find all tokens
    const tokens = await Token.find();

    if (tokens.length === 0) {
      return res.status(404).json({ message: "No tokens found" });
    }

    res.status(200).json({ tokens });
  } catch (error) {
    console.error("Error fetching tokens:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});
app.post("/api/adminsignin", cors(corsOptions), async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await Dashboard.findOne({ email });
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
    await saveOrUpdateAdminTokenToDatabase(user._id, token);
    res.status(200).json({ message: "Sign-in successful", accessToken: token });
  } catch (error) {
    console.error("Error during sign-in:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

const fetchAdminTokenMiddleware = async (req, res, next) => {
  const userId = req.user.userid;

  try {
    const token = await fetchAdminTokenFromDatabase(userId);

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

// students
app.post("/api/signup", cors(corsOptions), async (req, res) => {
  const {
    firstname,
    lastname,
    address,
    ynumber,
    email,
    password,
    birthdate,
    pnumber,
    pname,
    pemail,
  } = req.body;

  if (
    !firstname ||
    !lastname ||
    !address ||
    !ynumber ||
    !email ||
    !password ||
    !birthdate ||
    !pnumber ||
    !pname ||
    !pemail
  ) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new Profile({
      firstname,
      lastname,
      address,
      ynumber,
      email,
      password: hashedPassword,
      birthdate,
      pnumber,
      pname,
      pemail,
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
// app.use("/api/admindashboard", verifyToken, fetchAdminTokenMiddleware);

app.use("/api/dashboard", verifyToken, fetchTokenMiddleware);

app.get(
  "/api/admindashboard",
  cors(corsOptions),
  verifyToken,
  async (req, res) => {
    try {
      // Find the user by the userId stored in req.user
      const user = await Dashboard.findOne({ _id: req.user.userId });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.status(200).json({ user });
    } catch (error) {
      console.error("Error fetching user data:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

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

app.get(
  "/api/profilesforadmindashboard",
  cors(corsOptions),

  async (req, res) => {
    try {
      // Find all profiles
      const profiles = await Profile.find();

      if (profiles.length === 0) {
        return res.status(404).json({ message: "No profiles found" });
      }

      res.status(200).json({ profiles });
    } catch (error) {
      console.error("Error fetching profiles:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

app.get("/api/get-user-scores-admin", cors(corsOptions), async (req, res) => {
  try {
    // Find all scores
    const scores = await Score.find();

    if (scores.length === 0) {
      return res.status(404).json({ message: "No scores found" });
    }

    res.status(200).json({ scores });
  } catch (error) {
    console.error("Error fetching scores:", error);
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
