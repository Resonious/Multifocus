const notify = require('./functions/notify.js');

const subscription = {
  "endpoint": "https://updates.push.services.mozilla.com/wpush/v2/gAAAAABfHYhPQ70c6B3i0grcaXz96cMLwULASSkJ106PJdGiI3vm786Sin-dcAUa_3JiCZ1tW5oXrjJ8APjwWp2DxCORP_70apbYPO2tO4BsYv3rnkFdaSypkNcKRcP4DhNhAeBRA0SQUEHJL4Xf1GO2Is0BVh4EmvEH2gVBsZ3eJ7lIC6gEWhs",
  "keys": {
    "auth": "_sYvqX-uEzW7y4hVXKsUAA",
    "p256dh": "BB1r_59Kac-e2dG7O1t8s7LMd0yoMZc2XJhjgXGVS89ZVsjd_7N8BwdesruIorH6tnzSAo1Jo-mUfa4nk5HRXSA"
  }
};

const event = {
  httpMethod: 'POST',
  isBase64Encoded: false,
  body: JSON.stringify(subscription)
}

notify.handler(event, null, (error, response) => {
  if (error) {
    console.error(error);
  }
  else {
    console.log(response);
  }
})
