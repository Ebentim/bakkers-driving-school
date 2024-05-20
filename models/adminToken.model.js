const mongoose = require("mongoose");

const TokenSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dashboard",
      required: true,
    },
    accessToken: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      default: Date.now() + 7200000,
    },
  },
  {
    timestamps: true,
  }
);

TokenSchema.index({ expireAt: 1 }, { expireAfterSeconds: 7200000 });
const AdminToken = mongoose.model("AdminToken", TokenSchema);

module.exports = AdminToken;
