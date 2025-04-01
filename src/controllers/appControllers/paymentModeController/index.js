const jwt = require("jsonwebtoken");
const mongoose = require('mongoose');
const Model = mongoose.model('PaymentMode');
const createCRUDController = require('@/controllers/middlewaresControllers/createCRUDController');
const methods = createCRUDController('PaymentMode');

delete methods['delete'];

// methods.create = async (req, res) => {
//   const { isDefault } = req.body;

//   if (isDefault) {
//     await Model.updateMany({}, { isDefault: false });
//   }

//   const countDefault = await Model.countDocuments({ isDefault: true });

//   const result = await new Model({
//     ...req.body,
//     isDefault: countDefault < 1 ? true : false,
//   }).save();

//   return res.status(200).json({
//     success: true,
//     result: result,
//     message: 'Payment mode created successfully',
//   });
// };

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

    // 🔹 Assign ownership fields
    req.body.main_user_id = main_user_id || decoded.id;
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

    const paymentMode = await Model.findById(id);
    if (!paymentMode) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'Payment mode not found',
      });
    }

    const totalPaymentModes = await Model.countDocuments({});

    if (totalPaymentModes <= 1) {
      return res.status(422).json({
        success: false,
        result: null,
        message: 'You cannot delete the only existing payment mode',
      });
    }

    if (paymentMode.isDefault) {
      return res.status(403).json({
        success: false,
        result: null,
        message: "You can't delete the default payment mode. Set another one as default first.",
      });
    }

    await Model.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      result: null,
      message: 'Payment mode deleted successfully',
    });
  } catch (error) {
    console.error('Delete Error:', error);
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Server error while deleting payment mode',
    });
  }
};

methods.update = async (req, res) => {
  const { id } = req.params;
  const paymentMode = await Model.findOne({ _id: req.params.id }).exec();
  const { isDefault = paymentMode.isDefault, enabled = paymentMode.enabled } = req.body;

  // Ensure another payment mode becomes default if needed
  if (!isDefault || (!enabled && isDefault)) {
    await Model.findOneAndUpdate({ _id: { $ne: id }, enabled: true }, { isDefault: true });
  }

  if (isDefault && enabled) {
    await Model.updateMany({ _id: { $ne: id } }, { isDefault: false });
  }

  const paymentModeCount = await Model.countDocuments({});

  if ((!enabled || !isDefault) && paymentModeCount <= 1) {
    return res.status(422).json({
      success: false,
      result: null,
      message: 'You cannot disable the only existing payment mode',
    });
  }

  const result = await Model.findOneAndUpdate({ _id: id }, req.body, {
    new: true,
  });

  return res.status(200).json({
    success: true,
    message: 'Payment mode updated successfully',
    result,
  });
};

module.exports = methods;
