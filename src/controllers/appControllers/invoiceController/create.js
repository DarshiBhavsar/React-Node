const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const Model = mongoose.model("Invoice");
const AdminModel = mongoose.model("Admin");
const UserDataModel = mongoose.model("User-Data");
const BranchModel = mongoose.model("Branch");

const { calculate } = require("@/helpers");
const { increaseBySettingKey } = require("@/middlewares/settings");
const schema = require("./schemaValidate");

const create = async (req, res) => {
  try {
    console.log(`🛠️ Creating a new invoice...`);

    // ✅ Validate authentication
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
      return res.status(401).json({ success: false, message: "Unauthorized: No token provided" });
    }

    const token = authHeader.split(" ")[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      console.log("❌ JWT Verification Failed:", err.message);
      return res.status(401).json({ success: false, message: "Unauthorized: Invalid token" });
    }

    if (!decoded.id) {
      return res.status(401).json({ success: false, message: "Unauthorized: No user ID found in token" });
    }

    const loggedInUser =
      await AdminModel.findOne({ _id: decoded.id }).select("role main_user_id branchId selectedBranch") ||
      await UserDataModel.findOne({ _id: decoded.id }).select("role ownerId subId main_user_id branchId selectedBranch");

    if (!loggedInUser) {
      console.log("❌ User not found in database.");
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const userRole = loggedInUser.role;
    console.log(`✅ Authorized User: ${userRole} can create invoices.`);

    if (userRole === "member") {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Members are not allowed to create invoices.",
      });
    }

    let body = req.body;
    console.log("🔍 Received Request Body:", body);

    const { error, value } = schema.validate(body);
    if (error) {
      return res.status(400).json({
        success: false,
        result: null,
        message: error.details[0]?.message,
      });
    }

    const { items = [], taxRate = 0, discount = 0, selectedBranchId } = value;
    console.log(`📥 Received selectedBranchId from request: ${selectedBranchId}`);


    const userBranches = await BranchModel.find({
      $or: [
        { main_user_id: loggedInUser._id },
        { ownerId: loggedInUser._id }
      ],
      enabled: true,
      removed: false,
    })
      .select("_id name ownerId main_user_id")
      .lean();


    console.log(`🔍 Available User Branches:`, userBranches);

    if (!userBranches.length) {
      return res.status(400).json({
        success: false,
        message: "Bad Request: No branches found for this user",
      });
    }

    let branchId = selectedBranchId || loggedInUser.selectedBranch || loggedInUser.branchId;

    if (!branchId) {
      branchId = userBranches.length > 0 ? userBranches[0]._id : null;
    }

    if (!branchId) {
      return res.status(400).json({
        success: false,
        message: "No valid branch found. Please select a branch.",
      });
    }

    console.log(`✅ Selected branch: ${branchId}`);

    if (branchId.toString() !== (loggedInUser.selectedBranch ? loggedInUser.selectedBranch.toString() : "")) {
      await UserDataModel.findByIdAndUpdate(loggedInUser._id, { selectedBranch: branchId });
      console.log(`✅ Updated selectedBranch for user to: ${branchId}`);
    }

    body.branchId = branchId;
    body.createdBy = decoded.id;
    body.main_user_id = loggedInUser.main_user_id || decoded.id;
    body.ownerId = loggedInUser instanceof AdminModel ? null : decoded.id;
    body.subId = loggedInUser instanceof UserDataModel ? decoded.id : loggedInUser.subId || decoded.id;

    console.log("🛠️ Debug: Extracted IDs =>", { createdBy: body.createdBy, branchId: body.branchId });


    let subTotal = 0,
      taxTotal = 0,
      total = 0;

    items.forEach((item) => {
      let itemTotal = calculate.multiply(item.quantity, item.price);
      subTotal = calculate.add(subTotal, itemTotal);
      item.total = itemTotal;
    });

    taxTotal = calculate.multiply(subTotal, taxRate / 100);
    total = calculate.add(subTotal, taxTotal);

    body.subTotal = subTotal;
    body.taxTotal = taxTotal;
    body.total = total;
    body.items = items;
    body.paymentStatus = calculate.sub(total, discount) === 0 ? "paid" : "unpaid";

    // ✅ Create Invoice
    const result = await new Model(body).save();
    const fileId = `invoice-${result._id}.pdf`;

    const updateResult = await Model.findOneAndUpdate(
      { _id: result._id },
      { pdf: fileId },
      { new: true }
    ).exec();

    // ✅ Increase Invoice Number Setting
    increaseBySettingKey({ settingKey: "last_invoice_number" });

    console.log("✅ Invoice created successfully");

    return res.status(200).json({
      success: true,
      result: updateResult,
      message: "Invoice created successfully",
    });

  } catch (error) {
    console.error(`❌ Error Creating Invoice:`, error);
    return res.status(500).json({ success: false, message: "Error creating invoice", error });
  }
};

module.exports = create;
