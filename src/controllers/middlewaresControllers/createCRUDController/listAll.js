const mongoose = require('mongoose');

const list = async (Model, req, res) => {
  try {
    console.log("🔍 Fetching Data for User...");

    // ✅ Fix: Check for `req.userData` for User-Data users
    const user = req.user || req.userData;

    if (!user || !user._id) {
      console.log("❌ Unauthorized: No valid user found in request.");
      return res.status(401).json({ success: false, message: 'Unauthorized: No user ID found in request.' });
    }

    // ✅ Fetch only the logged-in user's data
    const userId = user._id;

    const userDocument = await Model.findOne({ _id: userId, removed: false })
      .select('-password -salt') // Exclude sensitive fields
      .exec();

    if (!userDocument) {
      return res.status(404).json({ success: false, message: 'No document found for this user' });
    }

    return res.status(200).json({ success: true, result: userDocument, message: 'Successfully found user-specific document' });
  } catch (error) {
    console.error('❌ Error fetching data:', error);
    return res.status(500).json({ success: false, message: 'Server error while fetching data' });
  }
};

module.exports = list;
