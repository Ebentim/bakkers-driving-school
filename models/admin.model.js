const mongoose = require("mongoose");
const validator = require("mongoose-unique-validator");

DashboardSchema = new mongoose.Schema(
  {
    firstname: {
      type: String,
      required: true,
    },
    lastname: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

DashboardSchema.index({ expireAt: 1 }, { expireAfterSeconds: 94608000000 });
DashboardSchema.plugin(validator, { message: "Email is already in use" });

const Dashboard = mongoose.model("Dashboard", DashboardSchema);

module.exports = Dashboard;
