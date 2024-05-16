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
  },
  {
    timestamps: true,
  }
);

const PrintStatus = mongoose.model("PrintStatus", printedCertificates);

module.exports = PrintStatus;
