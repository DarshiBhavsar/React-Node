const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const update = async (Model, req, res) => {
  try {
    console.log(`🔄 Updating Document in ${Model.modelName}...`);

    // Extract & Verify Token
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

    let loggedInUser =
      (await AdminModel.findOne({ _id: userId, removed: false }).select("role")) ||
      (await UserDataModel.findOne({ _id: userId, removed: false }).select("role"));

    if (!loggedInUser) {
      console.log("❌ User Not Found!");
      return res.status(404).json({ success: false, message: "User not found in the database." });
    }

    console.log("✅ Logged-in User:", loggedInUser);

    const userRole = loggedInUser.role;

    // ❌ Restrict Members from updating roles
    if (userRole === "member") {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Members are not allowed to update data.",
      });
    }

    // 🔹 Check if Model is "User-Data" or "Admin"
    if (Model.modelName === "User-Data" || Model.modelName === "Admin") {
      let userInUserData = await UserDataModel.findOne({ _id: req.params.id, removed: false });
      let userInAdmin = await AdminModel.findOne({ email: userInUserData?.email, removed: false });

      if (!userInUserData && !userInAdmin) {
        return res.status(404).json({
          success: false,
          message: "User not found for updating.",
        });
      }

      // ✅ Update Only `role` in User-Data
      if (userInUserData) {
        userInUserData.role = req.body.role;
        userInUserData.name = req.body.name || userInUserData.name;
        userInUserData.email = req.body.email || userInUserData.email;
        await userInUserData.save();
        console.log("✅ Updated Role in User-Data:", userInUserData);
      }

      // ✅ Update Only `role` in Admin
      if (userInAdmin) {
        userInAdmin.role = req.body.role;
        userInAdmin.name = req.body.name || userInAdmin.name;
        userInAdmin.email = req.body.email || userInAdmin.email;
        await userInAdmin.save();
        console.log("✅ Updated Role in Admin:", userInAdmin);
      }

      return res.status(200).json({
        success: true,
        message: "User role updated successfully in both User-Data and Admin.",
        userInUserData,
        userInAdmin,
      });
    }

    // 🔹 Handle Other Models (Do Nothing for `role`)
    let otherModelUpdate = await Model.findOne({ _id: req.params.id, removed: false });
    if (!otherModelUpdate) {
      return res.status(404).json({
        success: false,
        message: "Document not found for updating.",
      });
    }

    Object.assign(otherModelUpdate, req.body);
    await otherModelUpdate.save();
    console.log(`✅ Successfully updated ${Model.modelName}:`, otherModelUpdate);

    return res.status(200).json({
      success: true,
      result: otherModelUpdate,
      message: `${Model.modelName} updated successfully.`,
    });

  } catch (error) {
    console.error("❌ Error updating document:", error);
    return res.status(500).json({ success: false, message: "Server error while updating document" });
  }
};

module.exports = update;
