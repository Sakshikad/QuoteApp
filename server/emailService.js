import nodemailer from "nodemailer";

//  Reset Link Email Sending Function
export const sendResetLinkEmail = async (email, resetLink) => {
  try {
    // Create a nodemailer transporter
    const transporter = nodemailer.createTransport({

      service: "Gmail",
      auth: {
        user: "anywheretraveles25@gmail.com",
        pass: "xjrcosqsigbwakpd",
      },
    });

    
    const mailOptions = {
      from: "anywheretraveles25@gmail.com",
      to: email,
      subject: "Password Reset Link",
      text: `Click the following link to reset your password: ${resetLink}`,
      html: `<p>Click the following link to reset your password: <a href="${resetLink}">${resetLink}</a></p>`,
    };

    // Send the email
    await transporter.sendMail(mailOptions);

    console.log("Reset password link email sent successfully");
  } catch (error) {
    console.error("Error sending reset password link email:", error);
    throw new Error("Failed to send reset password link email");
  }
};

export const sendOTPEmail = async (email, otp) => {
  try {
    // Create a nodemailer transporter
    const transporter = nodemailer.createTransport({
    
      service: "Gmail",
      auth: {
        user: "anywheretraveles25@gmail.com",
        pass: "xjrcosqsigbwakpd",
      },
    });

    
    const mailOptions = {
      from: "anywheretraveles25@gmail.com",
      to: email,
      subject: "Password Reset OTP",
      text: `Your OTP for resetting the password is: ${otp}`,
      html: `<p>Your OTP for resetting the password is: <strong>${otp}</strong></p>`,
    };

    // Send the email
    await transporter.sendMail(mailOptions);

    console.log("Reset password OTP email sent successfully");
  } catch (error) {
    console.error("Error sending reset password OTP email:", error);
    throw new Error("Failed to send reset password OTP email");
  }
};

