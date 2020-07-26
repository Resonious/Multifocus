const webpush = require('web-push');
const process = require('process');

exports.handler = function(event, context, callback) {
  webpush.setVapidDetails(
    process.env['CONTACT'],
    process.env['VAPID_PUBLIC_KEY'],
    process.env['VAPID_PRIVATE_KEY']
  );

  // Must be POST
  if (event.httpMethod.toLowerCase() !== 'post') {
    callback(null, { statusCode: 400, body: 'No good' });
    return;
  }

  // Check for bullshit
  if (event.isBase64Encoded) {
    callback(null, { statusCode: 400, body: 'What....' });
    return;
  }

  // Check the request body
  const subscription = JSON.parse(event.body);
  if (!subscription) {
    callback(null, { statusCode: 400, body: 'Request body was not JSON?' })
    return;
  }

  // Do the magic
  webpush.sendNotification(subscription)
    .then(response => {
      callback(null, response);
    })
    .catch(error => {
      callback(error, null);
    })
}
