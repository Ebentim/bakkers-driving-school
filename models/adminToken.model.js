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
  },
  {
    timestamps: true,
  }
);

const AdminToken = mongoose.model("AdminToken", TokenSchema);

module.exports = AdminToken;
