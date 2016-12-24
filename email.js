'use strict';

var nodemailer = require('nodemailer');

var name = 'Muhammad Ilham';
var from = 'Mee';
var message = 'testing 1234';
var to = 'fadly_bears@yahoo.com';
var smtpTransport = nodemailer.createTransport("SMTP",{
   service: "Gmail",
   auth: {
       user: "satriabajahitam512@gmail.com",
       pass: "sandibaru512"
   }
});
var mailOptions = {
   from: from,
   to: to,
   subject: name+' | new message !',
   text: message
}
smtpTransport.sendMail(mailOptions, function(error, response){
   if(error){
       console.log(error);
   }else{
      console.log(response);
   }
});
