const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const BranchModel = mongoose.model('Branch');

const authUser = async (req, res, { user, password, selectedBranch, selectedBranchName }) => {
  try {
    console.log("🔍 Authenticating User:", user.email);

    const userBranches = await BranchModel.find({ ownerId: user._id }, '_id name');

    if (!selectedBranch) {
      selectedBranch = user.defaultBranch || (userBranches.length > 0 ? userBranches[0]._id : null);
      selectedBranchName = userBranches.length > 0 ? userBranches[0].name : '';
      if (!user.defaultBranch && selectedBranch) {
        user.defaultBranch = selectedBranch;
        await user.save();
      }
    }

    let UserPasswordModel = null;

    if (user.role === 'owner' || user.role === 'admin') {
      UserPasswordModel = mongoose.models["AdminPassword"] ? mongoose.model("AdminPassword") : null;
    } else {
      UserPasswordModel = mongoose.models["UserPassword"] ? mongoose.model("UserPassword") : null;
    }

    if (!UserPasswordModel || user.role === 'member') {
      UserPasswordModel = mongoose.models["AdminPassword"] ? mongoose.model("AdminPassword") : null;
    }

    if (!UserPasswordModel) {
      return res.status(500).json({ success: false, message: "Authentication error: No password model found." });
    }

    const databasePassword = await UserPasswordModel.findOne({
      $or: [{ user: user._id }, { userData: user._id }]
    });

    if (!databasePassword || !databasePassword.salt || !databasePassword.password) {
      return res.status(403).json({
        success: false,
        result: null,
        message: 'Invalid credentials. Password not found.',
      });
    }

    const isMatch = await bcrypt.compare(databasePassword.salt + password, databasePassword.password);
    if (!isMatch) {
      return res.status(403).json({
        success: false,
        result: null,
        message: 'Invalid credentials.',
      });
    }

    const token = jwt.sign(
      { id: user._id, branch: selectedBranch },
      process.env.JWT_SECRET,
      { expiresIn: req.body.remember ? `${365 * 24}h` : '24h' }
    );

    await UserPasswordModel.findOneAndUpdate(
      { $or: [{ user: user._id }, { userData: user._id }] },
      { $addToSet: { loggedSessions: token } },
      { upsert: true, new: true }
    ).exec();

    console.log("✅ User authenticated successfully:", user.email);

    res.status(200).json({
      success: true,
      result: {
        _id: user._id,
        name: user.name,
        surname: user.surname || '',
        email: user.email,
        role: user.role,
        photo: user.photo || '',
        token,
        selectedBranch,
        selectedBranchName,
        branches: userBranches,
        maxAge: req.body.remember ? 365 : null,
      },
      message: 'Successfully logged in.',
    });

  } catch (error) {
    console.error("❌ Login Error:", error);
    res.status(500).json({
      success: false,
      result: null,
      message: 'Internal server error.',
    });
  }
};

module.exports = authUser;
