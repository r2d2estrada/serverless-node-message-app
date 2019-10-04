'use strict';

const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
const recaptchaSecret = process.env.GOOGLE_RECAPTCHA_TOKEN;

const request = require('request');
const twilioClient = require('twilio')(twilioAccountSid, twilioAuthToken);

module.exports.validateAndSend = (event, context, callback) => {
  const validationData = {
    url: `https://www.google.com/recatcha/api/siteverify?secret=${recaptchaSecret}&response=${event.body.captcha}`,
    method: 'POST'
  };

  const headers = {'Access-Control-Allow-Origin': '*'};

  request(validationData, (err, res, body) => {
    const parsedBody = JSON.parse(body);

    if (err || res.statusCode !== 200) {
      const recaptchaErrResponse = {
        headers,
        statusCode: 500,
        body: JSON.stringify({
          status: 'fail',
          message: 'Error attempting to validate recaptcha.',
          error: error || response.statusCode
        }),
      };

      // Review (could it be better to send the error?)
      return callback(null, recaptchaErrResponse);
    }

    if (parsedBody.success === false) {
      const recaptchaFailedErrResponse  = {
        headers,
        statusCode: 200,
        body: JSON.stringify({
          status: 'fail',
          message: 'Captcha validation failed. Refresh the page & try again!',
          error: error || response.statusCode
        }),
      };

      return callback(null, recaptchaFailedErrResponse);
    }

    if (parsedBody.success === true) {
      const sms = {
        to: event.body.to,
        body: event.body.message || '',
        from: twilioPhoneNumber,
      };

      twilioClient.messages.create(sms, (err, data) => {
        if (err) {
          const twilioErrResponse = {
            headers,
            statusCode: 200,
            body: JSON.stringify({
              status: 'fail',
              message: error.message,
              error: error
            })
          };

          return callback(null, twilioErrResponse);
        }

        const successResponse = {
          headers,
          statusCode: 200,
          body: JSON.stringify({
            status: 'success',
            message: 'Text message successfully sent!',
            body: data.body,
            created: data.dateCreated
          })
        };

        callback(null, successResponse);
      });
    }
  });
};
