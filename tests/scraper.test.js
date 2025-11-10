onst { mapJsonLdToProperty, validatePropertyRecord } = require('../src/utils/property_mapper');

describe('Realtor.com property mapping', () => {
  test('mapJsonLdToProperty maps JSON-LD to normalized structure', () => {
    const jsonLd = {
      '@type': 'SingleFamilyResidence',
      url: 'https://www.realtor.com/realestateandhomes-detail/4368-Seville-St_Las-Vegas_NV_89121_M14226-64517',
      offers: {
        price: 485000
      },
      numberOfRooms: 4,
      numberOfBathroomsTotal: 3,
      floorSize: {
        value: 2752
      },
      yearBuilt: 1975,
      address: {
        streetAddress: '4368 Seville St',
        addressLocality: 'Las Vegas',
        addressRegion: 'NV',
        postalCode: '89121'
      },
      geo: {
        latitude: 36.110005,
        longitude: -115.077626
      }
    };

    const extras = {
      status: 'sold',
      nearbySchools: [
        { name: 'William E Ferron Elementary School', rating: 5, distance_in_miles: 0.3 },
        { name: 'C W Woodbury Middle School', rating: 2, distance_in_miles: 0.8 }
      ],
      local: {
        flood: { flood_factor_severity: 'minimal' },
        wildfire: { fire_factor_severity: 'Minimal' }
      }
    };

    const property = mapJsonLdToProperty(jsonLd, extras);

    expect(property).toBeDefined();
    expect(property.url).toBe(jsonLd.url);
    expect(property.status).toBe('sold');
    expect(property.listPrice).toBe(485000);
    expect(property.beds).toBe(4);
    expect(property.baths).toBe(3);
    expect(property.sqft).toBe(2752);
    expect(property.year_built).toBe(1975);
    expect(property.address.street).toBe('4368 Seville St');
    expect(property.address.locality).toBe('Las Vegas');
    expect(property.address.region).toBe('NV');
    expect(property.address.postalCode).toBe('89121');
    expect(property.coordinates.latitude).toBeCloseTo(36.110005);
    expect(property.coordinates.longitude).toBeCloseTo(-115.077626);
    expect(property.nearbySchools).toHaveLength(2);
    expect(property.local.flood.flood_factor_severity).toBe('minimal');

    const validation = validatePropertyRecord(property);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });
});