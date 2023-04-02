const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Tạo 1 bảng mới là bảng users
const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      default: "I am new User",
    },
    posts: [
      {
        type: Schema.Types.ObjectId, // Tham chiếu đến 1 Schema nào đó
        ref: "Post",
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
