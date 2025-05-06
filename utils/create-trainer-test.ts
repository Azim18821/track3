// Create a test trainer user account
import { hashPassword } from '../server/auth';
import { storage } from '../server/storage';

async function createTrainerTest() {
  try {
    // Create a trainer user
    const user = await storage.createUser({
      username: 'trainer1',
      email: 'trainer1@example.com',
      password: await hashPassword('trainerpass'),
      isAdmin: false,
      isTrainer: true,
      isApproved: true,
      registered_at: new Date(),
    });

    console.log('Test trainer created successfully:', user);
  } catch (error) {
    console.error('Failed to create test trainer:', error);
  }
}

createTrainerTest();