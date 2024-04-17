const mongoose = require("mongoose");
const validator = require("mongoose-unique-validator");

ProfileSchema = mongoose.Schema(
  {
    firstname: {
      type: String,
      required: [true, "Please enter your first name"],
    },
    lastname: {
      type: String,
      required: [true, "Please enter your last name"],
    },
    address: {
      type: String,
      required: [true, "Please enter your address"],
    },
    pnumber: {
      type: Number,
      required: [true, "Please enter your parent's phone number"],
    },
    ynumber: {
      type: Number,
      required: [true, "Please enter your phone number"],
    },
    email: {
      type: String,
      required: [true, "Please enter your email"],
      unique: true,
    },
    birthdate: {
      type: Date,
      required: [true, "Please enter your date of birth"],
    },
    password: {
      type: String,
      required: [true, "Please enter your password"],
    },
    startingtime: {
      type: Number,
      default: 108000000,
    },
  },
  {
    timestamps: true,
  }
);

ProfileSchema.plugin(validator, { message: "Email is already in use" });

const Profile = mongoose.model("Profile", ProfileSchema);

module.exports = Profile;
