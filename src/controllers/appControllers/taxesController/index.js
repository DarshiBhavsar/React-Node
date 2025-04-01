const jwt = require("jsonwebtoken");
const mongoose = require('mongoose');
const Model = mongoose.model('Taxes');
const createCRUDController = require('@/controllers/middlewaresControllers/createCRUDController');
const methods = createCRUDController('Taxes');

delete methods['delete'];

methods.create = async (req, res) => {
  try {
    console.log(`🛠️ Creating a new document in ${Model.modelName}...`);

    // 🔹 Validate authentication
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

    const AdminModel = mongoose.model("Admin");
    const UserDataModel = mongoose.model("User-Data");

    // 🔹 Fetch user data
    const loggedInUser =
      (await AdminModel.findOne({ _id: decoded.id }).select("role ownerId subId main_user_id")) ||
      (await UserDataModel.findOne({ _id: decoded.id }).select("role ownerId subId main_user_id"));

    if (!loggedInUser) {
      console.log("❌ User not found in database.");
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const { role, ownerId, subId, main_user_id } = loggedInUser;
    console.log(`✅ Authorized User: ${role} can create records.`);

    if (role === "member") {
      console.log("⛔ Access Denied: Members cannot create records.");
      return res.status(403).json({
        success: false,
        message: "Forbidden: Members are not allowed to create records.",
      });
    }

    req.body.main_user_id = loggedInUser.main_user_id || decoded.id;
    req.body.ownerId = loggedInUser.ownerId || decoded.id;
    req.body.subId = loggedInUser.subId || decoded.id;
    req.body.removed = false;

    if (loggedInUser instanceof AdminModel) {
      req.body.ownerId = null;
      req.body.subId = decoded.id;
    } else {
      req.body.ownerId = ownerId || decoded.id;
      req.body.subId = subId || decoded.id;
    }

    // 🔹 Save the document
    const result = await new Model({ ...req.body }).save();
    console.log(`✅ Successfully created document in ${Model.modelName}`);

    return res.status(200).json({
      success: true,
      result,
      message: `✅ Successfully created the document in ${Model.modelName}.`,
    });
  } catch (error) {
    console.error(`❌ Error Creating ${Model.modelName}:`, error);
    return res.status(500).json({ success: false, message: "Error creating document", error });
  }
};


methods.delete = async (req, res) => {
  try {
    const { id } = req.params;

    const Taxe = await Model.findById(id);
    if (!Taxe) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'Tax not found',
      });
    }

    const totalTaxes = await Model.countDocuments({});


    if (totalTaxes <= 1) {
      return res.status(422).json({
        success: false,
        result: null,
        message: 'You cannot delete the only existing taxe',
      });
    }


    if (Taxe.isDefault) {
      return res.status(403).json({
        success: false,
        result: null,
        message: "You can't delete the default  Tax. Set another one as default first.",
      });
    }

    await Model.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      result: null,
      message: 'Tax deleted successfully',
    });
  } catch (error) {
    console.error('Delete Error:', error);
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Server error while deleting  tax',
    });
  }
};

methods.update = async (req, res) => {
  const { id } = req.params;
  const tax = await Model.findOne({
    _id: req.params.id,
    removed: false,
  }).exec();
  const { isDefault = tax.isDefault, enabled = tax.enabled } = req.body;

  // if isDefault:false , we update first - isDefault:true
  // if enabled:false and isDefault:true , we update first - isDefault:true
  if (!isDefault || (!enabled && isDefault)) {
    await Model.findOneAndUpdate({ _id: { $ne: id }, enabled: true }, { isDefault: true });
  }

  // if isDefault:true and enabled:true, we update other taxes and make is isDefault:false
  if (isDefault && enabled) {
    await Model.updateMany({ _id: { $ne: id } }, { isDefault: false });
  }

  const taxesCount = await Model.countDocuments({});

  // if enabled:false and it's only one exist, we can't disable
  if ((!enabled || !isDefault) && taxesCount <= 1) {
    return res.status(422).json({
      success: false,
      result: null,
      message: 'You cannot disable the tax because it is the only existing one',
    });
  }

  const result = await Model.findOneAndUpdate({ _id: id }, req.body, {
    new: true,
  });

  return res.status(200).json({
    success: true,
    message: 'Tax updated successfully',
    result,
  });
};

module.exports = methods;
