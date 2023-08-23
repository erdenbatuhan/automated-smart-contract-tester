const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const UserRoles = require("./enums/roles");

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: Object.values(UserRoles), required: true, default: UserRoles.ADMIN }
});

// Hash the password before saving
userSchema.pre("save", async function (next) {
  const user = this;

  // Only hash the password if it"s modified
  if (!user.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(user.password, salt);
    user.password = hashedPassword;
    next();
  } catch (error) {
    return next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

const User = mongoose.model("User", userSchema);

module.exports = User;
