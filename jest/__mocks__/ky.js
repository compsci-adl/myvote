// Minimal CommonJS mock for `ky` used in tests.
// We expose `create` which returns an object with basic HTTP method functions
// that return a Promise with a `.json()` method.

function makeResponse(value) {
  return {
    json: async () => value,
  };
}

function makeKyInstance() {
  const instance = {
    create: () => instance,
  };

  const methods = ['get', 'post', 'put', 'delete', 'patch'];
  methods.forEach((m) => {
    instance[m] = (...args) => {
      // For testing we can inspect calls using jest mocks if needed.
      const fn = instance["__" + m] || (instance["__" + m] = jest.fn(async () => makeResponse(undefined)));
      return fn(...args);
    };
  });

  return instance;
}

module.exports = makeKyInstance();
