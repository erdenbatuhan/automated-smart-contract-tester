const mongoose = require("mongoose");

const TestSchema = new mongoose.Schema(
  {
    test: { type: String, required: true },
    weight: { type: Number, required: true }
  },
  {
    _id: false // Prevent Mongoose from adding an _id field to embedded documents
  }
);

module.exports = TestSchema;
