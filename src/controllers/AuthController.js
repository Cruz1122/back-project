const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  host: "smtp.ucaldas.edu.co",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Función para enviar el correo electrónico con el código de verificación
const sendVerificationEmail = async (email, code, fullName) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Código de verificación para tu cuenta",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e9e9e9; border-radius: 5px;">
          <h2 style="color: #333; text-align: center;">Verificación de cuenta</h2>
          <p>Hola ${fullName},</p>
          <p>Gracias por registrarte. Para completar tu registro, por favor utiliza el siguiente código de verificación:</p>
          <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
            ${code}
          </div>
          <p>Este código expirará en 15 minutos.</p>
          <p>Si no has solicitado este código, por favor ignora este correo.</p>
          <p>Saludos,<br>El equipo de soporte</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent: " + info.response);
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
};

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

    // Generar código de verificación
    const verificationCode = generateVerificationCode();
    const expirationTime = new Date();
    expirationTime.setMinutes(expirationTime.getMinutes() + 15); // Expira en 15 minutos

    const user = await prisma.users.create({
      data: {
        fullName,
        email,
        current_password: hashedPassword,
        status: "PENDING",
        verificationCode,
        verificationCodeExpires: expirationTime,
      },
    });

    const emailSent = await sendVerificationEmail(
      email,
      verificationCode,
      fullName
    );
    if (!emailSent) {
      await prisma.users.delete({
        where: {
          id: user.id,
        },
      });
    }

    res.status(201).json({
      message: "User registered successfully. Please check your email for the verification code.",
      userId: user.id,
      email: user.email,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error.", error });
  }
};

const verifyCode = async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({
      message: "Email and verification code are required",
    });
  }

  try {
    const user = await prisma.users.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (user.status === "ACTIVE") {
      return res.status(400).json({
        message: "User is already verified",
      });
    }

    // Verificar si el código ha expirado
    const now = new Date();
    if (now > user.verificationCodeExpires) {
      return res.status(400).json({
        message: "Verification code has expired. Please request a new one.",
      });
    }

    // Verificar si el código es correcto
    if (user.verificationCode !== code) {
      return res.status(400).json({
        message: "Invalid verification code",
      });
    }

    // Actualizar estado del usuario a activo
    await prisma.users.update({
      where: { id: user.id },
      data: {
        status: "ACTIVE",
        verificationCode: null,
        verificationCodeExpires: null,
      },
    });

    // Generar token de autenticación
    const token = jwt.sign(
      {
        id: user.id,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "2h",
      }
    );

    res.status(200).json({
      message: "Account verified successfully",
      token,
    });
  } catch (error) {
    console.log("Error during verification:", error);
    res.status(500).json({
      message: "Verification failed",
      error: error.message,
    });
  }
};

const resendVerificationCode = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      message: "Email is required",
    });
  }

  try {
    const user = await prisma.users.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (user.status === "ACTIVE") {
      return res.status(400).json({
        message: "User is already verified",
      });
    }

    // Generar nuevo código y actualizar fecha de expiración
    const newCode = generateVerificationCode();
    const expirationTime = new Date();
    expirationTime.setMinutes(expirationTime.getMinutes() + 15);

    await prisma.users.update({
      where: { id: user.id },
      data: {
        verificationCode: newCode,
        verificationCodeExpires: expirationTime,
      },
    });

    // Enviar nuevo código por correo
    const emailSent = await sendVerificationEmail(
      email,
      newCode,
      user.fullname
    );

    if (!emailSent) {
      return res.status(500).json({
        message: "Failed to send verification email. Please try again later.",
      });
    }

    res.status(200).json({
      message: "Verification code sent successfully. Please check your email.",
    });
  } catch (error) {
    console.log("Error resending code:", error);
    res.status(500).json({
      message: "Failed to resend verification code",
      error: error.message,
    });
  }
};

const signIn = async (req, res) => {
  let { email, current_password } = req.body;
  console.log(req.body);

  if (email) {
    email = email.toLowerCase().trim();
  }

  if (!email || !current_password) {
    return res.status(400).json({
      message: "Both fields are required.",
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: "Invalid email format." });
  }

  try {
    const findUser = await prisma.users.findUnique({
      where: {
        email,
      },
    });

    // Verify if user exists
    if (!findUser) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    const validatePassword = await bcrypt.compare(
      current_password,
      findUser.current_password
    );

    if (!validatePassword) {
      return res.status(401).json({
        message: "Password doesn't match.",
      });
    }

    const token = jwt.sign(
      {
        id: findUser.id,
      },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );
    console.log(token);

    return res.status(200).json({
      message: "User logged in successfully.",
      token,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Login failed." });
  }
};

module.exports = {
  signUp,
  signIn,
  verifyCode,
  resendVerificationCode
};
