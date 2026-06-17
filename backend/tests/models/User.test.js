'use strict';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../../src/models/User');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await User.deleteMany({});
});

describe('User model', () => {
  describe('validation', () => {
    it('creates a valid user', async () => {
      const user = await User.create({
        name: 'Dr. Smith',
        email: 'smith@clinic.com',
        password: 'hashed-password',
        role: 'doctor',
      });

      expect(user.name).toBe('Dr. Smith');
      expect(user.email).toBe('smith@clinic.com');
      expect(user.password).toBe('hashed-password');
      expect(user.role).toBe('doctor');
      expect(user.createdAt).toBeDefined();
      expect(user.updatedAt).toBeDefined();
    });

    it('rejects missing name', async () => {
      await expect(User.create({
        email: 'doc@c.com',
        password: 'hash',
        role: 'doctor',
      })).rejects.toThrow(mongoose.Error.ValidationError);
    });

    it('rejects missing email', async () => {
      await expect(User.create({
        name: 'Dr. X',
        password: 'hash',
        role: 'doctor',
      })).rejects.toThrow(mongoose.Error.ValidationError);
    });

    it('rejects missing password', async () => {
      await expect(User.create({
        name: 'Dr. X',
        email: 'x@c.com',
        role: 'doctor',
      })).rejects.toThrow(mongoose.Error.ValidationError);
    });

    it('rejects missing role', async () => {
      await expect(User.create({
        name: 'Dr. X',
        email: 'x@c.com',
        password: 'hash',
      })).rejects.toThrow(mongoose.Error.ValidationError);
    });

    it('rejects invalid role', async () => {
      await expect(User.create({
        name: 'Dr. X',
        email: 'x@c.com',
        password: 'hash',
        role: 'invalid',
      })).rejects.toThrow(mongoose.Error.ValidationError);
    });

    it('lowercases email', async () => {
      const user = await User.create({
        name: 'Dr. A',
        email: 'UPPERCASE@CLINIC.COM',
        password: 'hash',
        role: 'doctor',
      });

      expect(user.email).toBe('uppercase@clinic.com');
    });
  });

  describe('toJSON transform', () => {
    it('excludes password from serialized output', async () => {
      const user = await User.create({
        name: 'Dr. Secret',
        email: 'secret@c.com',
        password: 'bcrypt-hash-value',
        role: 'receptionist',
      });

      const json = user.toJSON();
      expect(json.password).toBeUndefined();
      expect(json.name).toBe('Dr. Secret');
      expect(json.email).toBe('secret@c.com');
    });

    it('excludes password when JSON.stringify is used', async () => {
      const user = await User.create({
        name: 'Dr. JSON',
        email: 'json@c.com',
        password: 'super-secret',
        role: 'doctor',
      });

      const serialized = JSON.parse(JSON.stringify(user));
      expect(serialized.password).toBeUndefined();
      expect(serialized.name).toBe('Dr. JSON');
    });
  });

  describe('unique email index', () => {
    it('rejects duplicate email', async () => {
      await User.create({
        name: 'First',
        email: 'dupe@c.com',
        password: 'hash1',
        role: 'doctor',
      });

      await expect(User.create({
        name: 'Second',
        email: 'dupe@c.com',
        password: 'hash2',
        role: 'receptionist',
      })).rejects.toThrow();
    });
  });
});
