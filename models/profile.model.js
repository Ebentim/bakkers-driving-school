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
    ynumber: {
      type: Number,
      required: [true, "Please enter your phone number"],
    },

    birthdate: {
      type: Date,
      required: [true, "Please enter your date of birth"],
    },
    email: {
      type: String,
      required: [true, "Please enter your email"],
      unique: true,
    },
    password: {
      type: String,
      required: [true, "Please enter your password"],
    },
    pnumber: {
      type: Number,
      required: [true, "Please enter your parent's phone number"],
    },
    pname: {
      type: String,
      required: [true, "Please enter your parent's full name"],
    },
    pemail: {
      type: String,
      required: [true, "Please enter your parent's email Address"],
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
