import * as webpush from 'web-push';

function main() {
  const vapidKeys = webpush.generateVAPIDKeys();

  // eslint-disable-next-line no-console
  console.log('VAPID Public Key:');
  // eslint-disable-next-line no-console
  console.log(vapidKeys.publicKey);
  // eslint-disable-next-line no-console
  console.log('\nVAPID Private Key:');
  // eslint-disable-next-line no-console
  console.log(vapidKeys.privateKey);

  // eslint-disable-next-line no-console
  console.log('\nEnv examples:');
  // eslint-disable-next-line no-console
  console.log(`WEB_PUSH_PUBLIC_KEY=${vapidKeys.publicKey}`);
  // eslint-disable-next-line no-console
  console.log(`WEB_PUSH_PRIVATE_KEY=${vapidKeys.privateKey}`);
}

main();
