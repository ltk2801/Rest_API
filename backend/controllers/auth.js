const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const User = require("../models/user");
const jwt = require("jsonwebtoken");
require("dotenv").config(); // đọc các biến môi trường từ file .env

exports.signup = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error("Validation failed.");
    error.statusCode = 422;
    error.data = errors.array();
    throw error;
  }
  const email = req.body.email;
  const name = req.body.name;
  const password = req.body.password;
  // Mã hóa mật khẩu
  try {
    const hashedPw = await bcrypt.hash(password, 12);
    // Tạo user mới bằng mongosee
    const user = new User({
      email: email,
      password: hashedPw,
      name: name,
    });
    const result = await user.save();
    res
      .status(201)
      .json({ message: "Sign up successfully !", userId: result._id });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.login = async (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  try {
    const user = await User.findOne({ email: email });
    // Kiểm tra xem có tồn tại email người dùng này không
    if (!user) {
      const error = new Error("A user with this email could not be found.");
      error.statusCode = 401;
      throw error;
    }
    // Mã hóa mật khẩu lưu trong csdl và kiểm tra với password input
    const isEqual = await bcrypt.compare(password, user.password);
    // Nếu không đúng password
    if (!isEqual) {
      // Ném ra 1 lỗi mới
      const error = new Error("Wrong password !");
      error.statusCode = 401;
      throw error;
    }
    // secretKey
    const secretKey = process.env.SECRET_KEY;
    const token = jwt.sign(
      {
        email: user.email,
        userId: user._id.toString(),
      },
      secretKey,
      { expiresIn: "1h" }
    );
    res.status(200).json({ token: token, userId: user._id.toString() }); // bắn API lên bao gồm token và userId
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getUserStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error("User not found.");
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json({ status: user.status });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.updateUserStatus = async (req, res, next) => {
  const newStatus = req.body.status;
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error("User not found.");
      error.statusCode = 404;
      throw error;
    }
    user.status = newStatus;
    await user.save();
    res.status(200).json({ message: "User updated." });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};
