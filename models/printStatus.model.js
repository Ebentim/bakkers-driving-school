const { Timestamp } = require("mongodb");
const mongoose = require("mongoose");

const printedCertificates = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Profile",
    },
    printStatus: {
      type: Boolean,
      required: true,
      default: false,
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
printedCertificates.index({ expireAt: 1 }, { expireAfterSeconds: 94608000000 });
const PrintStatus = mongoose.model("PrintStatus", printedCertificates);

module.exports = PrintStatus;
