const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const isValidAuthToken = async (req, res, next, { jwtSecret = 'JWT_SECRET' }) => {
  try {
    console.log("🔍 Checking Auth for User (Admin/User-Data)");

    // 🔹 Extract JWT from headers
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("❌ No Auth Token Found or Incorrect Format!");
      return res.status(401).json({ success: false, message: "Unauthorized: No authentication token provided." });
    }

    let token = authHeader.split(' ')[1].trim();

    console.log("🔍 Extracted Token:", token);

    // 🔹 Verify Token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env[jwtSecret]);
    } catch (err) {
      console.log("❌ JWT Verification Failed:", err.message);
      return res.status(401).json({ success: false, message: "Invalid or expired token, authorization denied." });
    }

    const userId = decoded.id; // ✅ Extract user ID from token

    console.log("✅ JWT Verified for User ID:", userId);

    // 🔹 Search for user in both Admin and User-Data
    const AdminModel = mongoose.model("Admin");
    const UserDataModel = mongoose.model("User-Data");

    const user = await AdminModel.findOne({ _id: userId, removed: false })
      || await UserDataModel.findOne({ _id: userId, removed: false });

    if (!user) {
      console.log("❌ User Not Found in Both Models!");
      return res.status(401).json({ success: false, message: "User doesn't exist, authorization denied." });
    }

    console.log("✅ User Found:", user.email);

    // 🔹 Fetch password entry from AdminPassword
    const UserPasswordModel = mongoose.model("AdminPassword");
    const userPassword = await UserPasswordModel.findOne({
      $or: [{ user: userId }, { userData: userId }],
      removed: false
    });

    if (!userPassword) {
      console.log("❌ No Password Entry Found for User!");
      return res.status(401).json({ success: false, message: "Password record doesn't exist, authorization denied." });
    }

    // 🔹 Ensure token is in loggedSessions
    if (!userPassword.loggedSessions.includes(token)) {
      console.log("❌ Token Not Found in Logged Sessions!");
      return res.status(401).json({ success: false, message: "Session expired, authorization denied." });
    }

    console.log("✅ Token Found in Logged Sessions!");

    // ✅ Assign User to Request
    req.user = user;

    next();
  } catch (error) {
    console.error("❌ Middleware Error:", error.message);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

module.exports = isValidAuthToken;
