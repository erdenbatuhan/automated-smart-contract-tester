const mongoose = require('mongoose');

const ContentSchema = new mongoose.Schema(
  {
    path: { type: String, required: true },
    content: { type: String, required: true }
  },
  {
    _id: false // Prevent Mongoose from adding an _id field to embedded documents
  }
);

module.exports = ContentSchema;
