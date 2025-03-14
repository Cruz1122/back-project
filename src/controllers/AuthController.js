const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const prisma = new PrismaClient();

const signUp = async (req, res) => {
  let { fullName, email, current_password } = req.body;
  console.log(req.body);
  if (email) {
    email = email.toLowerCase().trim();
  }
  
  if (!fullName || !email || !current_password) {
    return res.status(400).json({
      message: "All required files: fullName, email and password",
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: "Invalid email format." });
  }

  if (current_password.length < 6) {
    return res.status(400).json({
      message: "Password must be at least 6 characters long.",
    });
  }

  try {
    const existingUser = await prisma.users.findUnique({
      where: {
        email,
      },
    });

    if (existingUser) {
      return res.status(400).json({
        message: "User with this email already exists.",
      });
    }

    const hashedPassword = await bcrypt.hash(current_password, 10);

    const user = await prisma.users.create({
      data: {
        fullName,
        email,
        current_password :hashedPassword,
      },
    });

    res.status(201).json({
      message: "User created successfully.",
      user,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error.", error });
  }
};

const signIn = async (req, res) => {
  let { email, current_password } = req.body;
  console.log(req.body);
  
  if (email) {
    email = email.toLowerCase().trim();
  }
  return res.status(200).json({
    message: "User logged in successfully.",
  });
};

module.exports = {
  signUp,
  signIn,
};
