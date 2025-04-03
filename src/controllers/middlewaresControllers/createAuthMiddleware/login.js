const Joi = require('joi');
const mongoose = require('mongoose');
const authUser = require('./authUser');

const login = async (req, res, { userModel }) => {
  console.log("🔍 Querying Model:", userModel);

  const UserModel = mongoose.model(userModel);
  const BranchModel = mongoose.model('Branch');
  const AdminPasswordModel = mongoose.model('AdminPassword');
  const { email, password } = req.body;

  const objectSchema = Joi.object({
    email: Joi.string().email({ tlds: { allow: true } }).required(),
    password: Joi.string().required(),
  });

  const { error } = objectSchema.validate({ email, password });
  if (error) {
    return res.status(409).json({
      success: false,
      result: null,
      message: 'Invalid/Missing credentials.',
      errorMessage: error.message,
    });
  }

  console.log("🔍 Checking User:", email);
  let user = await UserModel.findOne({
    email: new RegExp(`^${email}$`, "i"),
    removed: false
  });

  // 🔍 If not found in User, check in User-Data
  if (!user) {
    console.log("❌ User Not Found in Admin/User. Checking User-Data...");
    const UserDataModel = mongoose.model("User-Data");

    user = await UserDataModel.findOne({
      email: new RegExp(`^${email}$`, "i"),
      removed: false
    });

    if (!user) {
      console.log("❌ User Not Found in User-Data either:", email);
      return res.status(404).json({
        success: false,
        result: null,
        message: "No account with this email has been registered.",
      });
    }
  }

  console.log("✅ User Found:", user);


  // ✅ Identify whether the user is from `Admin` or `User-Data`
  const passwordQuery = { $or: [{ user: user._id }, { userData: user._id }] };
  console.log("🔍 [DATABASE] Searching for Password for User ID:", user._id);

  const databasePassword = await AdminPasswordModel.findOne({ ...passwordQuery, removed: false });

  if (!databasePassword) {
    console.log("❌ [PASSWORD NOT FOUND]");
    return res.status(403).json({
      success: false,
      result: null,
      message: 'Invalid credentials.',
    });
  }


  if (!databasePassword) {
    console.log("❌ [PASSWORD NOT FOUND]");
    return res.status(403).json({
      success: false,
      result: null,
      message: 'Invalid credentials.',
    });
  }

  if (!user.enabled) {
    return res.status(409).json({
      success: false,
      result: null,
      message: 'Your account is disabled, contact your account administrator.',
    });
  }

  let selectedBranch = user.defaultBranch;

  if (!selectedBranch) {
    const userBranches = await BranchModel.find({ ownerId: user._id });

    if (userBranches.length > 0) {
      selectedBranch = userBranches[0]._id;
      user.defaultBranch = selectedBranch;
      await user.save();
    }
  }

  authUser(req, res, {
    user,
    databasePassword,
    password,
    selectedBranch,
  });
};

module.exports = login;
