// const sgMail = require('@sendgrid/mail');
// const nodemailer = require('nodemailer');
// const fs = require('fs');
// const path = require('path');

// // Initialize email service
// let emailService;
// let serviceType;

// if (process.env.SENDGRID_API_KEY) {
//   sgMail.setApiKey(process.env.SENDGRID_API_KEY);
//   emailService = sgMail;
//   serviceType = 'sendgrid';
// } else if (process.env.SMTP_HOST) {
//   emailService = nodemailer.createTransporter({
//     host: process.env.SMTP_HOST,
//     port: process.env.SMTP_PORT || 587,
//     secure: false,
//     auth: {
//       user: process.env.SMTP_USER,
//       pass: process.env.SMTP_PASSWORD
//     }
//   });
//   serviceType = 'smtp';
// }

// const sendBackupEmail = async (backupPath, date) => {
//   if (!emailService) {
//     console.log('No email service configured, skipping email notification');
//     return;
//   }

//   try {
//     const stats = fs.statSync(backupPath);
//     const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

//     const subject = `Daily DB Backup - ${date}`;
//     const html = `
//       <h2>Daily Database Backup Completed</h2>
//       <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
//       <p><strong>Time:</strong> ${new Date().toLocaleTimeString()}</p>
//       <p><strong>File:</strong> ${path.basename(backupPath)}</p>
//       <p><strong>Size:</strong> ${sizeMB} MB</p>
//       <p>The backup includes:</p>
//       <ul>
//         <li>✓ MySQL database dump</li>
//         <li>✓ MongoDB collections export</li>
//         <li>✓ All stored images</li>
//       </ul>
//       <p>Please find the backup file attached to this email.</p>
//       <br>
//       <p>Best regards,<br>Automated Backup System</p>
//     `;

//     if (serviceType === 'sendgrid') {
//       // SendGrid
//       const msg = {
//         to: process.env.TO_EMAIL,
//         from: process.env.FROM_EMAIL,
//         subject: subject,
//         html: html,
//         attachments: [
//           {
//             content: fs.readFileSync(backupPath).toString('base64'),
//             filename: path.basename(backupPath),
//             type: 'application/zip',
//             disposition: 'attachment'
//           }
//         ]
//       };
//       await emailService.send(msg);
//     } else if (serviceType === 'smtp') {
//       // Nodemailer
//       const mailOptions = {
//         from: process.env.SMTP_USER,
//         to: process.env.TO_EMAIL,
//         subject: subject,
//         html: html,
//         attachments: [
//           {
//             filename: path.basename(backupPath),
//             path: backupPath
//           }
//         ]
//       };
//       await emailService.sendMail(mailOptions);
//     }

//     console.log('Backup email sent successfully');
//   } catch (error) {
//     console.error('Failed to send backup email:', error);
//   }
// };

// module.exports = { sendBackupEmail };