import { NOMINATIM } from '../constants/location.constants.js';
import { ApiError } from '../utils/apiResponse.js';

class NominatimService {
  async searchAddress(query, limit = NOMINATIM.DEFAULT_LIMIT) {
    if (!query || query.trim().length < 2) {
      throw ApiError.badRequest('Search query must be at least 2 characters');
    }

    const params = new URLSearchParams({
      q: query.trim(),
      format: 'jsonv2',
      addressdetails: '1',
      limit: String(limit),
    });

    const url = `${NOMINATIM.BASE_URL}/search?${params.toString()}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': NOMINATIM.USER_AGENT,
      },
    });

    if (!response.ok) {
      throw ApiError.internal('Failed to fetch location suggestions');
    }

    const payload = await response.json();

    return payload.map((item) => ({
      displayName: item.display_name,
      lat: Number(item.lat),
      lng: Number(item.lon),
      placeId: String(item.place_id || ''),
      city: item.address?.city || item.address?.town || item.address?.village || null,
      state: item.address?.state || null,
      country: item.address?.country || null,
      postalCode: item.address?.postcode || null,
      raw: item,
    }));
  }

  async reverseGeocode(lat, lng) {
    if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
      throw ApiError.badRequest('Valid lat and lng are required');
    }

    const params = new URLSearchParams({
      format: 'jsonv2',
      addressdetails: '1',
      lat: String(lat),
      lon: String(lng),
    });

    const url = `${NOMINATIM.BASE_URL}/reverse?${params.toString()}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': NOMINATIM.USER_AGENT,
      },
    });

    if (!response.ok) {
      throw ApiError.internal('Failed to reverse geocode coordinates');
    }

    const item = await response.json();
    return {
      address: item.display_name || `${lat}, ${lng}`,
      city: item.address?.city || item.address?.town || item.address?.village || item.address?.municipality || '',
      state: item.address?.state || item.address?.region || '',
      country: item.address?.country || '',
      postalCode: item.address?.postcode || '',
    };
  }
}

export default new NominatimService();
