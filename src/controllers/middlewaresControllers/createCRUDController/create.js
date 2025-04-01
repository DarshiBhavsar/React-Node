const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
require("dotenv").config();

const create = async (Model, req, res) => {
  try {
    console.log(`🛠️ Creating a new document in ${Model.modelName}...`);

    const authHeader = req.headers["authorization"];
    if (!authHeader) {
      return res.status(401).json({ success: false, message: "Unauthorized: No token provided" });
    }

    const token = authHeader.split(" ")[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, message: "Unauthorized: Invalid token" });
    }

    if (!decoded.id) {
      return res.status(401).json({ success: false, message: "Unauthorized: No user ID found in token" });
    }

    const AdminModel = mongoose.model("Admin");
    const UserDataModel = mongoose.model("User-Data");

    const loggedInUser =
      (await AdminModel.findOne({ _id: decoded.id }).select("role ownerId subId main_user_id")) ||
      (await UserDataModel.findOne({ _id: decoded.id }).select("role ownerId subId main_user_id"));

    if (!loggedInUser) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    if (loggedInUser.role === "member") {
      return res.status(403).json({ success: false, message: "Forbidden: Members cannot create records." });
    }
    req.body.main_user_id = loggedInUser.main_user_id || loggedInUser._id;
    req.body.ownerId = loggedInUser.ownerId || decoded.id;
    req.body.subId = loggedInUser.subId || decoded.id;
    req.body.removed = false;


    console.log("📌 Assigned Values:", {
      main_user_id: req.body.main_user_id,
      ownerId: req.body.ownerId,
      subId: req.body.subId,
    });

    const result = await new Model({ ...req.body }).save();
    console.log(`✅ Successfully created document in ${Model.modelName}`);


    if (Model.modelName === "User-Data" && result.email) {
      const inviteLink = `https://idurarcrmerp.netlify.app/register-user`;

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      console.log("✅ Verifying Email Transporter...");
      try {
        await transporter.verify();
        console.log("✅ Email Transporter is Ready");
      } catch (transportError) {
        console.error("❌ Email Transporter Verification Failed:", transportError);
        return res.status(500).json({ success: false, message: "Email transporter error", error: transportError });
      }

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: result.email,
        subject: "User Invitation",
        html: `<p>Hello ${result.name},</p>
               <p>You have been invited to create an account. Click <a href="${inviteLink}">here</a> to complete your registration.</p>`,
      };

      console.log(`📩 Sending Invitation Email to ${result.email}...`);
      try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Email Sent Successfully: ${info.response}`);
      } catch (emailError) {
        console.error("❌ Email Sending Failed:", emailError);
      }
    }

    return res.status(200).json({
      success: true,
      result,
      message: `Successfully created the document in ${Model.modelName}${Model.modelName === "User-Data" ? " and sent an invitation email" : ""}.`,
    });

  } catch (error) {
    return res.status(500).json({ success: false, message: "Error creating document", error });
  }
};

module.exports = create;
