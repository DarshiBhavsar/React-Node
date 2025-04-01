const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const remove = async (Model, req, res) => {
  try {
    console.log(`🗑️ Removing Document from ${Model.modelName}...`);

    // 🔹 Extract & Verify Token
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Unauthorized: No authentication token provided." });
    }

    const token = authHeader.split(" ")[1].trim();
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      console.log("❌ JWT Verification Failed:", err.message);
      return res.status(401).json({ success: false, message: "Unauthorized: Invalid or expired token." });
    }

    const userId = decoded.id;
    console.log("✅ JWT Verified for User ID:", userId);

    const AdminModel = mongoose.model("Admin");
    const UserDataModel = mongoose.model("User-Data");

    // 🔹 Fetch Logged-in User's Role
    let loggedInUser =
      (await AdminModel.findOne({ _id: userId, removed: false }).select("role")) ||
      (await UserDataModel.findOne({ _id: userId, removed: false }).select("role"));

    if (!loggedInUser) {
      console.log("❌ User Not Found!");
      return res.status(404).json({ success: false, message: "User not found in the database." });
    }

    console.log("✅ Logged-in User:", loggedInUser);

    const userRole = loggedInUser.role;

    // ❌ Restrict Members from deleting data
    if (userRole === "member") {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Members are not allowed to delete data.",
      });
    }

    // 🔹 Handle Soft Deleting User-Data & Permanent Delete Admin
    if (Model.modelName === "User-Data" || Model.modelName === "Admin") {
      let userInUserData = await UserDataModel.findOne({ _id: req.params.id });
      let userInAdmin = await AdminModel.findOne({ _id: req.params.id });

      if (!userInUserData && !userInAdmin) {
        return res.status(404).json({ success: false, message: "User not found for deletion." });
      }

      // ✅ Soft Delete User-Data
      if (userInUserData && !userInUserData.removed) {
        await UserDataModel.findByIdAndUpdate(req.params.id, { removed: true });
        console.log("✅ Soft Deleted from User-Data:", userInUserData);
      }

      // ✅ Permanent Delete Admin
      if (userInAdmin) {
        await AdminModel.findByIdAndDelete(req.params.id);
        console.log("❌ Permanently Deleted from Admin:", userInAdmin);
      }

      return res.status(200).json({
        success: true,
        message: "User-Data soft deleted & Admin permanently deleted.",
      });
    }

    // 🔹 Handle Other Models (Soft Delete)
    let otherModelDelete = await Model.findOneAndUpdate(
      { _id: req.params.id },
      { removed: true },
      { new: true }
    );

    if (!otherModelDelete) {
      return res.status(404).json({
        success: false,
        message: "Document not found for deletion.",
      });
    }

    console.log(`✅ Successfully marked as removed in ${Model.modelName}:`, otherModelDelete);

    return res.status(200).json({
      success: true,
      result: otherModelDelete,
      message: `${Model.modelName} marked as removed successfully.`,
    });

  } catch (error) {
    console.error("❌ Error removing document:", error);
    return res.status(500).json({ success: false, message: "Server error while removing document" });
  }
};


module.exports = remove;
