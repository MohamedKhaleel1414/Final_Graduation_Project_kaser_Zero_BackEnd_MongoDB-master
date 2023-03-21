const mongoose = require("mongoose");
const categorySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      unique: true,
    },
    brands: {
      type: Array,
      required: true,
    },
    firstFilter: {
      title: { type: String, required: true },
      options: [{ type: String, required: true }],
    },
    secondFilter: {
      title: { type: String, required: true },
      options: [{ type: String, required: true }],
    },
    thirdFilter: {
      title: { type: String, required: true },
      options: [{ type: String, required: true }],
    },
  },
  {
    versionKey: false,
  }
);

module.exports = mongoose.model("categoryCollection", categorySchema);
