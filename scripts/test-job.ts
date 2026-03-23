import { notificationQueue } from '../src/lib/queue';

const test = async () => {
  console.log('Submitting mock notification job...');
  
  await notificationQueue.add('test-email', {
    userId: 'user_123',
    type: 'EMAIL',
    subject: 'Welcome to Job Processing!',
    message: 'Your background jobs are working.'
  });

  console.log('Mock job submitted to notificationQueue. You can view this in the Bull Board UI.');
  process.exit(0);
};

test();
