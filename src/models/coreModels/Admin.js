const mongoose = require('mongoose');
const bcrypt = require("bcryptjs");
const Schema = mongoose.Schema;
const AdminPassword = require("./AdminPassword");

const adminSchema = new Schema({
  removed: { type: Boolean, default: false },
  enabled: { type: Boolean, default: true },
  salt: { type: String },
  emailToken: String,
  resetToken: String,
  phone: String,
  country: String,
  address: String,
  emailVerified: { type: Boolean, default: false },
  authType: { type: String, default: 'email' },
  email: { type: String, lowercase: true, trim: true, required: true },
  branchId: { type: mongoose.Schema.ObjectId, ref: "Branch", autopopulate: true },
  ownerId: { type: mongoose.Schema.ObjectId, ref: "User" },
  main_user_id: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
  name: { type: String, required: true },
  surname: { type: String },
  password: { type: String },
  created: { type: Date, default: Date.now },
  role: {
    type: String,
    enum: ["owner", "admin", "member"]
  },
});

adminSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.salt = salt;
    this.password = await bcrypt.hash(salt + this.password, 10);

    await AdminPassword.findOneAndUpdate(
      { user: this._id },
      {
        user: this._id,
        password: this.password,
        salt: this.salt
      },
      { upsert: true, new: true }
    );

    next();
  } catch (error) {
    next(error);
  }
});

adminSchema.methods.validPassword = async function (enteredPassword) {
  return await bcrypt.compare(this.salt + enteredPassword, this.password);
};

module.exports = mongoose.model('Admin', adminSchema);
