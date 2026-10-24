const { chat } = require('../src/controllers/ai.controller');

describe('AI chat configuration', () => {
  test('returns an unavailable response when no provider API key is configured', async () => {
    const previousApiKey = process.env.LLM_API_KEY;
    delete process.env.LLM_API_KEY;

    const response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    try {
      await chat({ body: { message: 'How does the app work?' } }, response, next);

      expect(response.status).toHaveBeenCalledWith(503);
      expect(response.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: expect.stringContaining('not configured'),
      }));
      expect(next).not.toHaveBeenCalled();
    } finally {
      if (previousApiKey === undefined) {
        delete process.env.LLM_API_KEY;
      } else {
        process.env.LLM_API_KEY = previousApiKey;
      }
    }
  });
});
