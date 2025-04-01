const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const bcrypt = require('bcryptjs');

const AdminPasswordSchema = new Schema({
  removed: { type: Boolean, default: false },

  user: { type: mongoose.Schema.ObjectId, ref: 'Admin', default: null },
  userData: { type: mongoose.Schema.ObjectId, ref: 'User-Data', default: null },

  password: { type: String, required: true },
  salt: { type: String, required: true },
  emailToken: String,
  resetToken: String,
  emailVerified: { type: Boolean, default: false },
  authType: { type: String, default: 'email' },
  loggedSessions: { type: [String], default: [] },
});

AdminPasswordSchema.index({ user: 1 }, { sparse: true });
AdminPasswordSchema.index({ userData: 1 }, { sparse: true });

// ✅ Generate hash
AdminPasswordSchema.methods.generateHash = function (salt, password) {
  return bcrypt.hashSync(salt + password);
};

// ✅ Validate password
AdminPasswordSchema.methods.validPassword = function (salt, userpassword) {
  return bcrypt.compareSync(salt + userpassword, this.password);
};

module.exports = mongoose.model('AdminPassword', AdminPasswordSchema);
