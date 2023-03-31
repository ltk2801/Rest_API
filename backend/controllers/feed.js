exports.getPosts = (req, res, next) => {
  res.status(200).json({
    post: [{ title: "First Post", content: "This is the first post !" }],
  });
};

exports.postPost = (req, res, next) => {
  // Nhận dữ liệu gửi lên
  const title = req.body.title;
  const content = req.body.content;

  // Create post in db
  res.status(201).json({
    message: "Post created successfully !",
    post: { id: new Date().toISOString(), title: title, content: content },
  });
};
