const mongoose = require("mongoose");

const TokenSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Profile",
      required: true,
    },
    accessToken: {
      type: String,
      required: true,
    },
    expireAt: {
      type: Date,
      default: Date.now() + 94608000000, //expires after 2 hours
    },
  },
  {
    timestamps: true,
  }
);

TokenSchema.index({ expireAt: 1 }, { expireAfterSeconds: 94608000000 });
const Token = mongoose.model("Token", TokenSchema);

module.exports = Token;
