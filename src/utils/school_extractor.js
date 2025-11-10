onst cheerio = require('cheerio');
const { safeJsonParse } = require('./parser');

/**
 * Extract nearby school information from embedded JSON or markup.
 */
function extractNearbySchoolsFromHtml(html) {
  const $ = cheerio.load(html);
  const schoolsFromJson = extractNearbySchoolsFromJsonScripts($);
  if (schoolsFromJson.length > 0) return schoolsFromJson;

  const schoolsFromMarkup = [];
  $('[data-label="nearby-schools"] li, [data-testid="nearby-school"]').each(
    (_, el) => {
      const item = $(el);
      const name =
        item.find('[data-testid="school-name"]').text().trim() ||
        item.find('.school-name').text().trim();
      if (!name) return;

      const ratingText =
        item.find('[data-testid="school-rating"]').text().trim() ||
        item.find('.school-rating').text().trim();
      const distanceText =
        item.find('[data-testid="school-distance"]').text().trim() ||
        item.find('.school-distance').text().trim();

      const rating = ratingText
        ? Number(ratingText.replace(/[^0-9.]/g, ''))
        : null;
      const distance = distanceText
        ? Number(distanceText.replace(/[^0-9.]/g, ''))
        : null;

      schoolsFromMarkup.push({
        name,
        rating: !Number.isNaN(rating) ? rating : null,
        distance_in_miles: !Number.isNaN(distance) ? distance : null
      });
    }
  );

  return schoolsFromMarkup;
}

function extractNearbySchoolsFromJson(json) {
  const schools = [];
  if (!json || typeof json !== 'object') return schools;

  const candidates = [];

  if (Array.isArray(json.nearbySchools)) {
    candidates.push(...json.nearbySchools);
  }
  if (json.schools && Array.isArray(json.schools)) {
    candidates.push(...json.schools);
  }

  for (const s of candidates) {
    if (!s) continue;
    const name = s.name || s.schoolName || null;
    if (!name) continue;

    const rating =
      typeof s.rating === 'number'
        ? s.rating
        : s.rating
        ? Number(String(s.rating).replace(/[^0-9.]/g, ''))
        : null;

    const distance =
      typeof s.distance_in_miles === 'number'
        ? s.distance_in_miles
        : s.distance
        ? Number(String(s.distance).replace(/[^0-9.]/g, ''))
        : null;

    schools.push({
      name,
      rating: !Number.isNaN(rating) ? rating : null,
      distance_in_miles: !Number.isNaN(distance) ? distance : null
    });
  }

  return schools;
}

/**
 * Look for arbitrary JSON blobs that include nearby school information.
 */
function extractNearbySchoolsFromJsonScripts($) {
  const schools = [];
  $('script[type="application/json"], script[type="application/ld+json"]').each(
    (_, el) => {
      const text = $(el).contents().toString().trim();
      const json = safeJsonParse(text);
      if (!json) return;

      const extracted = extractNearbySchoolsFromJson(json);
      if (extracted.length > 0) {
        schools.push(...extracted);
      }
    }
  );
  return schools;
}

module.exports = {
  extractNearbySchoolsFromHtml,
  extractNearbySchoolsFromJson
};