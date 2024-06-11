import bcrypt from "bcryptjs";
import pkg from "pg";
const { Pool } = pkg;
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "./config.js";
import { v4 as uuidv4 } from "uuid";
import { sendResetLinkEmail, sendOTPEmail } from "./emailService.js";

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "authdb",
  password: "Sakshi@25",
  port: 5432,
});

const resolvers = {
  Query: {
    users: async () => {
      const client = await pool.connect();
      try {
        const result = await client.query("SELECT * FROM users");
        return result.rows;
      } finally {
        client.release();
      }
    },
    user: async (_, { id }) => {
      const client = await pool.connect();
      try {
        const result = await client.query("SELECT * FROM users WHERE id = $1", [id]);
        return result.rows[0];
      } finally {
        client.release();
      }
    },
    quotes: async () => {
      const client = await pool.connect();
      try {
        const result = await client.query(
          "SELECT quotes.name, quotes.by, users.id, users.firstname FROM quotes JOIN users ON quotes.by = users.id"
        );
        return result.rows.map((row) => ({
          name: row.name,
          by: { id: row.id, firstname: row.firstname },
        }));
      } finally {
        client.release();
      }
    },
    iquote: async (_, { by }) => {
      const client = await pool.connect();
      try {
        const result = await client.query("SELECT * FROM quotes WHERE by = $1", [by]);
        return result.rows;
      } finally {
        client.release();
      }
    },
    myprofile: async (_, args, { userId }) => {
      if (!userId) {
        throw new Error("You must be logged in first");
      }

      const client = await pool.connect();
      try {
        const query = `
          SELECT u.id, u.firstname, u.lastname, u.email, COALESCE(q.name, '') AS quote_name
          FROM users u
          LEFT JOIN quotes q ON u.id = q.by
          WHERE u.id = $1;
        `;
        const result = await client.query(query, [userId]);
        
        if (result.rows.length === 0) {
          console.log("No user found with the given ID.");
          return null;  // Or handle the case where no user is found
        }

        console.log("User profile fetched successfully:", result.rows);

        const user = {
          id: result.rows[0].id,
          firstname: result.rows[0].firstname,
          lastname: result.rows[0].lastname,
          email: result.rows[0].email,
          quotes: result.rows.map(row => ({ name: row.quote_name })).filter(quote => quote.name),
        };

        return user;
      } finally {
        client.release();
      }
    },
  },

  User: {
    quotes: async (ur) => {
      const client = await pool.connect();
      try {
        const result = await client.query("SELECT * FROM quotes WHERE by = $1", [ur.id]);
        return result.rows;
      } finally {
        client.release();
      }
    },
  },

  Mutation: {
    signupUser: async (_, { userNew }) => {
      const client = await pool.connect();
      try {
        const result = await client.query("SELECT * FROM users WHERE email = $1", [userNew.email]);
        if (result.rows.length > 0) {
          throw new Error("User already exists with this email");
        }

        const hashedPassword = await bcrypt.hash(userNew.password, 10);

        const insertQuery =
          "INSERT INTO users (firstname, lastname, email, password) VALUES ($1, $2, $3, $4) RETURNING *";
        const insertValues = [userNew.firstname, userNew.lastname, userNew.email, hashedPassword];
        const insertResult = await client.query(insertQuery, insertValues);
        return insertResult.rows[0];
      } finally {
        client.release();
      }
    },
    signinUser: async (_, { userSignin }) => {
      const client = await pool.connect();
      try {
        const result = await client.query("SELECT * FROM users WHERE email = $1", [userSignin.email]);
        const user = result.rows[0];
        if (!user) {
          throw new Error("User does not exist with this email");
        }

        const doMatch = await bcrypt.compare(userSignin.password, user.password);
        if (!doMatch) {
          throw new Error("Email or password is invalid");
        }

        const token = jwt.sign({ userId: user.id }, JWT_SECRET);
        return { token };
      } finally {
        client.release();
      }
    },
    createQuote: async (_, { name }, { userId }) => {
      if (!userId) {
        throw new Error("You must be logged in first");
      }

      const client = await pool.connect();
      try {
        const insertQuery = 'INSERT INTO quotes (name, "by") VALUES ($1, $2)';
        const insertValues = [name, userId];
        await client.query(insertQuery, insertValues);

        return "Quote saved successfully";
      } finally {
        client.release();
      }
    },
    forgotPassword: async (_, { email }) => {
      const client = await pool.connect();
      try {
        const resetToken = uuidv4();

        const resetLinkExpirationTime = new Date();
        resetLinkExpirationTime.setMinutes(resetLinkExpirationTime.getMinutes() + 30);

        await client.query(
          "INSERT INTO password_reset_tokens (email, token, expiration_time) VALUES ($1, $2, $3)",
          [email, resetToken, resetLinkExpirationTime]
        );

        await sendResetLinkEmail(email, resetToken);

        return "Reset link email sent successfully";
      } catch (error) {
        console.error("Error sending reset link email:", error);
        throw new Error("Failed to send reset link email");
      } finally {
        client.release();
      }
    },
    generateOTP: async (_, { email }) => {
      const client = await pool.connect();
      try {
        const generateOTP = () => {
          const length = 6;
          const characters = "0123456789";
          let otp = "";
          for (let i = 0; i < length; i++) {
            const randomIndex = Math.floor(Math.random() * characters.length);
            otp += characters[randomIndex];
          }
          return otp;
        };

        const otp = generateOTP();

        const otpExpirationTime = new Date();
        otpExpirationTime.setMinutes(otpExpirationTime.getMinutes() + 15);

        await client.query(
          "INSERT INTO otp_tokens (email, token, expiration_time) VALUES ($1, $2, $3)",
          [email, otp, otpExpirationTime]
        );

        await sendOTPEmail(email, otp);

        return "OTP email sent successfully";
      } catch (error) {
        console.error("Error sending OTP email:", error);
        throw new Error("Failed to send OTP email");
      } finally {
        client.release();
      }
    },
    resetPassword: async (_, { newPassword, otp }) => {
      const client = await pool.connect();
      try {
        const otpResult = await client.query("SELECT * FROM otp_tokens WHERE token = $1", [otp]);
        const otpData = otpResult.rows[0];
        if (!otpData) {
          throw new Error("Invalid or expired OTP");
        }

        const currentTime = new Date();
        if (currentTime > otpData.expiration_time) {
          throw new Error("OTP has expired");
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await client.query("UPDATE users SET password = $1 WHERE email = $2", [hashedPassword, otpData.email]);

        await client.query("DELETE FROM otp_tokens WHERE token = $1", [otp]);

        return "Password reset successfully";
      } catch (error) {
        console.error("Error resetting password:", error);
        throw new Error("Failed to reset password");
      } finally {
        client.release();
      }
    },
  },
};

export default resolvers;
