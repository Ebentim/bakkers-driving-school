const mongoose = require("mongoose");
const validator = require("mongoose-unique-validator");

ProfileSchema = mongoose.Schema(
  {
    firstname: {
      type: String,
      required: [true, "Please Enter your first name"],
    },
    lastname: {
      type: String,
      required: [true, "Please Enter your last name"],
    },
    address: {
      type: String,
      required: [true, "Please Enter your address"],
    },
    email: {
      type: String,
      required: [true, "Please Enter your email"],
      unique: true,
    },
    birthdate: {
      type: Date,
      required: [true, "Please Enter your date of birth"],
    },
    password: {
      type: String,
      required: [true, "Please Enter your password"],
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
