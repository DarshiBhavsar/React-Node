const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const Joi = require("joi");

const registerUser = async (req, res, { userModel }) => {
    try {
        const UserModel = mongoose.model(userModel);
        const UserPasswordModel = mongoose.model(userModel + "Password");
        const userDataModel = mongoose.model("User-Data");

        const { name, email, password, confirmPassword, ...otherFields } = req.body;

        console.log("🔍 Checking if user already exists...");
        const existingUser = await UserModel.findOne({ email });

        // if (existingUser) {
        //     return res.status(400).json({ success: false, message: "User with this email already exists!" });
        // }

        console.log("🔍 Fetching latest User-Data entry for:", email);
        const userData = await userDataModel
            .findOne({ email })
            .sort({ created: -1 })
            .lean();

        console.log("🔍 Found userData:", userData);

        let assignedRole = userData?.role || null;
        let main_user_id = userData?.main_user_id || userData?._id;
        console.log("✅ Assigned Role:", assignedRole || "❌ No role found");
        console.log("✅ Assigned Main User ID:", main_user_id);

        // 🔹 Validate Input Data
        const schema = Joi.object({
            name: Joi.string().required(),
            email: Joi.string().email().required(),
            password: Joi.string().min(6).required(),
            confirmPassword: Joi.string().valid(Joi.ref("password")).required(),
        });

        const { error } = schema.validate({ name, email, password, confirmPassword });
        if (error) {
            return res.status(400).json({ success: false, message: error.details[0].message });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(salt + password, 10);

        console.log("🛠 Creating new user...");
        const user = new UserModel({
            name,
            email,
            ...(assignedRole ? { role: assignedRole } : {}), // ✅ Assign role only if found
            main_user_id, // ✅ Assign correct main_user_id dynamically
        });

        await user.save();

        console.log("🔒 Storing hashed password...");
        const userPassword = new UserPasswordModel({
            user: user._id,
            password: hashedPassword,
            salt: salt,
        });

        await userPassword.save();

        console.log("✅ User successfully registered!");
        return res.status(201).json({
            success: true,
            message: "User registered successfully",
            user,
        });

    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ success: false, message: "Email already exists! Try a different email." });
        }
        console.error("❌ Error in registration:", err);
        return res.status(500).json({ success: false, message: "Server error during registration" });
    }
};

module.exports = registerUser;
