const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Schema = mongoose.Schema;
const AdminPassword = require("../coreModels/AdminPassword");

const Userschema = new Schema({
    removed: { type: Boolean, default: false },
    enabled: { type: Boolean, default: true },
    name: { type: String, required: true },
    // phone: String,
    // country: String,
    // address: String,
    // password: String,
    role: {
        type: String,
        enum: ["owner", "admin", "member"],
        required: true,
    },
    email: { type: String, lowercase: true, trim: true, required: true },
    branchId: { type: mongoose.Schema.ObjectId, ref: "Branch", autopopulate: true },
    main_user_id: { type: mongoose.Schema.ObjectId, ref: "Admin" },

    created: { type: Date, default: Date.now },
    updated: { type: Date, default: Date.now },
});

Userschema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();

    try {
        const salt = await bcrypt.genSalt(10);
        this.salt = salt;
        this.password = await bcrypt.hash(salt + this.password, 10);

        await AdminPassword.findOneAndUpdate(
            { userData: this._id },
            { userData: this._id, password: this.password, salt: this.salt },
            { upsert: true, new: true }
        );

        next();
    } catch (error) {
        console.error("❌ Error Saving Password:", error);
        next(error);
    }
});

Userschema.methods.validPassword = async function (enteredPassword) {
    return await bcrypt.compare(this.salt + enteredPassword, this.password);
};

Userschema.plugin(require("mongoose-autopopulate"));

module.exports = mongoose.model("User-Data", Userschema);
