module.exports = jest.fn(() => ({
  handlers: {},
  signIn: jest.fn(),
  signOut: jest.fn(),
  auth: jest.fn(),
}));
