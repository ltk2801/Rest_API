const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const User = require("../models/user");
const jwt = require("jsonwebtoken");
require("dotenv").config(); // đọc các biến môi trường từ file .env
const user = require("../models/user");

exports.signup = (req, res, next) => {
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
  bcrypt
    .hash(password, 12)
    .then((hashedPw) => {
      // Tạo user mới bằng mongosee
      const user = new User({
        email: email,
        password: hashedPw,
        name: name,
      });
      return user.save();
    })
    .then((result) => {
      res
        .status(201)
        .json({ message: "Sign up successfully !", userId: result._id });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.login = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  let loadUser;
  User.findOne({ email: email })
    .then((user) => {
      // Kiểm tra xem có tồn tại email người dùng này không
      if (!user) {
        const error = new Error("A user with this email could not be found.");
        error.statusCode = 401;
        throw error;
      }
      loadUser = user;
      // Mã hóa mật khẩu lưu trong csdl và kiểm tra với password input
      return bcrypt.compare(password, user.password);
    })
    .then((isEqual) => {
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
          email: loadUser.email,
          userId: loadUser._id.toString(),
        },
        secretKey,
        { expiresIn: "1h" }
      );
      res.status(200).json({ token: token, userId: loadUser._id.toString() }); // bắn API lên bao gồm token và userId
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};
