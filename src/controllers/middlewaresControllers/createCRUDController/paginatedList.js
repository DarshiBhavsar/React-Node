const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const paginatedList = async (Model, req, res) => {
  try {
    console.log("🔍 Fetching paginated data...");

    // ✅ Extract & Verify Token
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Unauthorized: No authentication token provided." });
    }

    const token = authHeader.split(" ")[1].trim();
    console.log("🔑 Extracted Token:", token);

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
      (await AdminModel.findOne({ _id: userId, removed: false }).select("role branch ownerId main_user_id")) ||
      (await UserDataModel.findOne({ _id: userId, removed: false }).select("role branchId ownerId main_user_id"));

    if (!loggedInUser) {
      console.log("❌ User Not Found!");
      return res.status(404).json({ success: false, message: "User not found in the database." });
    }

    console.log("✅ Logged-in User:", loggedInUser);

    const mainUserId = loggedInUser.main_user_id || userId;
    const userBranch = loggedInUser.branch || loggedInUser.branchId;
    const requestedBranch = req.query.branch;

    console.log("🔹 Main User ID:", mainUserId);
    console.log("🔹 User Branch:", userBranch);
    console.log("🔹 Requested Branch:", requestedBranch);


    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.items) || 10;
    const skip = (page - 1) * limit;
    const { sortBy = "created", sortValue = -1, filter, equal } = req.query;

    const fieldsArray = req.query.fields ? req.query.fields.split(",") : [];
    let fields = fieldsArray.length === 0 ? {} : { $or: fieldsArray.map((field) => ({ [field]: { $regex: new RegExp(req.query.q, "i") } })) };

    let query = { removed: false, [filter]: equal, ...fields, main_user_id: mainUserId };

    if (requestedBranch) {
      query.branchId = requestedBranch;
    }

    const commonModels = ["User-Data", "Branch", "Invoice", "Payment", "Client", "Quote", "PaymentMode", "Taxes"];
    if (commonModels.includes(Model.modelName)) {
      query.main_user_id = mainUserId;
    }


    if (Model.modelName === "Admin" && loggedInUser.role !== "owner") {
      return res.status(403).json({ success: false, message: "Unauthorized: Only owners can view Admins." });
    }

    let queryPopulate = Model.find(query);
    if (Model.schema.paths.branch && Model.schema.paths.branch.instance === "ObjectID") {
      queryPopulate = queryPopulate.populate("branch");
    }



    const [result, count] = await Promise.all([
      queryPopulate.skip(skip).limit(limit).sort({ [sortBy]: sortValue }).exec(),
      Model.countDocuments(query),
    ]);

    const pages = Math.ceil(count / limit);
    const pagination = { page, pages, count };

    console.log("✅ Data fetched successfully!");

    return res.status(200).json({
      success: true,
      result,
      pagination,
      message: count > 0 ? "Successfully fetched data..." : "No records found.",
    });
  } catch (error) {
    console.error("❌ Error fetching data:", error);
    return res.status(500).json({ success: false, message: "Server error while fetching data" });
  }
};

module.exports = paginatedList;
