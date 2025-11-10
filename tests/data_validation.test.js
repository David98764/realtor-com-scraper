onst fs = require('fs');
const path = require('path');
const { validatePropertyRecord } = require('../src/utils/property_mapper');

describe('Sample output dataset validation', () => {
  const samplePath = path.join(__dirname, '..', 'data', 'output.sample.json');
  const raw = fs.readFileSync(samplePath, 'utf-8');
  const dataset = JSON.parse(raw);

  test('sample dataset is a non-empty array', () => {
    expect(Array.isArray(dataset)).toBe(true);
    expect(dataset.length).toBeGreaterThan(0);
  });

  test('each record in the sample dataset is valid', () => {
    for (const record of dataset) {
      const result = validatePropertyRecord(record);
      if (!result.valid) {
        // Provide helpful debugging information
        // eslint-disable-next-line no-console
        console.error('Invalid record', record, result.errors);
      }
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    }
  });
});