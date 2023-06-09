import nodemailer from 'nodemailer';
import {MAILTRAP_PASSWORD, MAILTRAP_USER, SIGN_IN_URL} from './variables';
import {generateTemplate} from '@/mail/template';
import path from 'path';

interface Profile {
  name: string;
  email: string;
  userId: string;
}

interface Options {
  email: string;
  link: string;
}

//Nodemailer Transporter
const generateMailTransporter = () => {
  const transport = nodemailer.createTransport({
    host: 'sandbox.smtp.mailtrap.io',
    port: 2525,
    auth: {
      user: MAILTRAP_USER,
      pass: MAILTRAP_PASSWORD,
    },
  });

  return transport;
};

//Send Verification Email
export const sendVerificationMail = async (token: string, profile: Profile) => {
  const transport = generateMailTransporter();

  const {name, email, userId} = profile;

  const welcomeMessage = `Hi ${name}, welcome to Musify!, There are so much thing that we do fo verified users. Use the given OTP to very your email`;

  transport.sendMail({
    to: email,
    from: 'noreply@testing.com',
    subject: 'Welcome Message',
    html: generateTemplate({
      title: 'Welcome to Musify',
      message: welcomeMessage,
      logo: 'cid:logo',
      banner: 'cid:welcome',
      link: '#',
      btnTitle: token,
    }),
    attachments: [
      {
        filename: 'logo.png',
        path: path.join(__dirname, '../mail/images/logo.png'),
        cid: 'logo',
      },
      {
        filename: 'welcome.png',
        path: path.join(__dirname, '../mail/images/welcome.png'),
        cid: 'welcome',
      },
    ],
  });
};

//Send Forgot Email
export const sendForgotPasswordLink = async (options: Options) => {
  const transport = generateMailTransporter();

  const {email, link} = options;

  const message =
    'We just recieved a request that you forgot your password. No problem you can use the link below to reset your password';

  transport.sendMail({
    to: email,
    from: 'noreply@testing.com',
    subject: 'Reset Password Link',
    html: generateTemplate({
      title: 'Forgot Password',
      message,
      logo: 'cid:logo',
      banner: 'cid:forget_password',
      link,
      btnTitle: 'Reset Password',
    }),
    attachments: [
      {
        filename: 'logo.png',
        path: path.join(__dirname, '../mail/images/logo.png'),
        cid: 'logo',
      },
      {
        filename: 'forget_password.png',
        path: path.join(__dirname, '../mail/images/forget_password.png'),
        cid: 'forget_password',
      },
    ],
  });
};

//Send Password Reset Message
export const sendPasswordResetSuccessEmail = async (
  name: string,
  email: string,
) => {
  const transport = generateMailTransporter();

  const message = `Dear ${name} we just updated your new password. You can now sign in with your new password`;

  transport.sendMail({
    to: email,
    from: 'noreply@testing.com',
    subject: 'Password Reset Successfully',
    html: generateTemplate({
      title: 'Password Reset Succesfully',
      message,
      logo: 'cid:logo',
      banner: 'cid:forget_password',
      link: SIGN_IN_URL,
      btnTitle: 'Sign In',
    }),
    attachments: [
      {
        filename: 'logo.png',
        path: path.join(__dirname, '../mail/images/logo.png'),
        cid: 'logo',
      },
      {
        filename: 'forget_password.png',
        path: path.join(__dirname, '../mail/images/forget_password.png'),
        cid: 'forget_password',
      },
    ],
  });
};
