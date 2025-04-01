const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const logout = async (req, res) => {
  try {
    console.log("🔍 Processing Logout...");

    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("❌ No Auth Token Found or Incorrect Format!");
      return res.status(401).json({ success: false, message: "Unauthorized: No authentication token provided." });
    }

    let token = authHeader.split(' ')[1].trim();

    console.log("🔍 Extracted Token:", token);

    // 🔹 Verify the token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      console.log("❌ JWT Verification Failed:", error.message);
      return res.status(401).json({ success: false, message: "Invalid or expired token, authorization denied." });
    }

    const userId = decoded.id; // ✅ Extract user ID from token

    console.log("✅ JWT Verified for User ID:", userId);

    // 🔹 Find user in both `Admin` and `User-Data`
    const AdminModel = mongoose.model("Admin");
    const UserDataModel = mongoose.model("User-Data");

    const user = await AdminModel.findOne({ _id: userId, removed: false })
      || await UserDataModel.findOne({ _id: userId, removed: false });

    if (!user) {
      console.log("❌ User Not Found in Both Models!");
      return res.status(401).json({ success: false, message: "User doesn't exist, authorization denied." });
    }

    console.log("✅ User Found:", user.email);

    // 🔹 Find the password entry
    const UserPassword = mongoose.model("AdminPassword");
    const userPassword = await UserPassword.findOne({
      $or: [{ user: userId }, { userData: userId }],
      removed: false
    });

    if (!userPassword) {
      console.log("❌ Password Entry Not Found!");
      return res.status(401).json({ success: false, message: "Password record doesn't exist, authorization denied." });
    }

    // 🔹 Ensure token is in `loggedSessions`
    if (!userPassword.loggedSessions.includes(token)) {
      console.log("❌ Token Not Found in Logged Sessions!");
      return res.status(401).json({ success: false, message: "Session expired, authorization denied." });
    }

    // ✅ Remove token from logged sessions
    await UserPassword.findOneAndUpdate(
      { $or: [{ user: userId }, { userData: userId }] },
      { $pull: { loggedSessions: token } }, // ✅ Remove only the specific token
      { new: true }
    );

    console.log("✅ Token Removed from Logged Sessions!");

    return res.json({
      success: true,
      result: {},
      message: "Successfully logged out.",
    });

  } catch (error) {
    console.error("❌ Logout Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during logout.",
    });
  }
};

module.exports = logout;
