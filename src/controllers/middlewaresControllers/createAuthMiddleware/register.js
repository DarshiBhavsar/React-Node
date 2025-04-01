const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const Joi = require('joi');

const register = async (req, res, { userModel }) => {
    const UserModel = mongoose.model(userModel);
    const UserPasswordModel = mongoose.model(userModel + 'Password');

    const { name, email, password, country } = req.body;

    const schema = Joi.object({
        name: Joi.string().required(),
        email: Joi.string().email().required(),
        password: Joi.string(),
        country: Joi.string().required(),
    });

    const { error } = schema.validate(req.body);
    if (error) {
        return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
        return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(salt + password, 10);


    const user = new UserModel({ name, email, role: "owner" });
    await user.save();

    const userPassword = new UserPasswordModel({
        user: user._id,
        password: hashedPassword,
        salt: salt,
    });
    await userPassword.save();

    return res.status(201).json({
        success: true,
        message: 'User registered successfully',
        user,
    });
};

module.exports = register;
