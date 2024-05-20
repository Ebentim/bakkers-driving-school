const e = require("express");
const mongoose = require("mongoose");

const ScoreSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Profile",
      required: true,
    },
    chapterone: {
      type: Number,
      default: 0,
    },
    chaptertwo: {
      type: Number,
      default: 0,
    },
    chapterthree: {
      type: Number,
      default: 0,
    },
    chapterfour: {
      type: Number,
      default: 0,
    },
    chapterfive: {
      type: Number,
      default: 0,
    },
    chaptersix: {
      type: Number,
      default: 0,
    },
    chapterseven: {
      type: Number,
      default: 0,
    },
    chaptereight: {
      type: Number,
      default: 0,
    },
    chapternine: {
      type: Number,
      default: 0,
    },
    chapterten: {
      type: Number,
      default: 0,
    },
    chaptereleven: {
      type: Number,
      default: 0,
    },
    chaptertwelve: {
      type: Number,
      default: 0,
    },
    chapterthirteen: {
      type: Number,
      default: 0,
    },
    chapterfourteen: {
      type: Number,
      default: 0,
    },
    chapterfifteen: {
      type: Number,
      default: 0,
    },
    finalquiz: {
      type: Number,
      default: 0,
    },
    expiresAt: {
      type: Date,
      default: Date.now() + 94608000000,
    },
  },
  {
    timestamps: true,
  }
);

ScoreSchema.index({ expiresAt: 1 }, { expiresAfterSeconds: 94608000000 });
const Score = mongoose.model("Score", ScoreSchema);
module.exports = Score;
