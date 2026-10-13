const mockAxios = {
  post: jest.fn(() => Promise.resolve({ data: { IpfsHash: 'mock-hash' } })),
  get: jest.fn(() => Promise.resolve({ data: {} })),
};

export default mockAxios;
