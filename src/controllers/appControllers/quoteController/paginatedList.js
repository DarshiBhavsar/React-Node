const mongoose = require("mongoose");

const Model = mongoose.model("Quote");

const paginatedList = async (req, res) => {
  try {
    console.log("🔍 Fetching paginated invoices...");
    console.log("🛠️ Request Query Params:", JSON.stringify(req.query, null, 2));

    // ✅ Extract Query Parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.items) || 10;
    const skip = (page - 1) * limit;
    const { sortBy = "created", sortValue = -1, filter, equal } = req.query;

    // ✅ Extract branch from query OR fallback to selectedBranch from headers/user
    let branch = req.query.branch?.trim();
    if (!branch || branch === "null" || branch === "undefined") {
      console.warn("⚠️ Branch ID missing, using default from headers/local storage...");

      branch = req.headers["selected-branch"] || req.user?.selectedBranch; // Fallback to selected branch
    }

    console.log("🔹 Final Branch ID:", branch || "❌ Branch ID is STILL MISSING!");

    // ✅ Prevent invalid branch values
    if (!branch || branch === "null" || branch === "undefined" || branch === 'all') {
      console.warn("⚠️ No valid branch selected. Returning empty data.");
      return res.status(200).json({
        success: true,
        result: [],
        pagination: { page, pages: 0, count: 0 },
        message: "No branch selected. Returning empty data.",
      });
    }

    // ✅ Construct Query Object
    let query = { removed: false, branchId: branch };

    if (filter && equal !== undefined) {
      query[filter] = equal;
    }

    console.log("🔍 Constructed Query:", JSON.stringify(query, null, 2));

    // ✅ Fetch Data
    const [result, count] = await Promise.all([
      Model.find(query).skip(skip).limit(limit).sort({ [sortBy]: sortValue }).exec(),
      Model.countDocuments(query),
    ]);

    const pages = Math.ceil(count / limit);
    console.log(`✅ Successfully fetched ${count} invoices!`);

    return res.status(200).json({
      success: true,
      result,
      pagination: { page, pages, count },
      message: count > 0 ? "Invoices found for the selected branch" : "No invoices found",
    });
  } catch (error) {
    console.error("❌ Server Error Fetching Invoices:", error);
    return res.status(500).json({ success: false, message: "Server error while fetching invoices" });
  }
};

module.exports = paginatedList;
