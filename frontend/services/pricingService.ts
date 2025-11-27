import { REGION_MAPPING } from '../constants';

const API_URL = '/api/pricing';

export interface PriceQuery {
    serviceCode: string;
    filters: Record<string, string>;
}

export const fetchPrice = async (query: PriceQuery): Promise<number | null> => {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(query)
        });

        if (!response.ok) {
            console.warn(`Price fetch failed for ${query.serviceCode}: ${response.statusText}`);
            return null;
        }

        const data = await response.json();
        return data.price;
    } catch (error) {
        console.error("Error fetching price:", error);
        return null;
    }
};

export const getRegionLocation = (regionCode: string): string => {
    return REGION_MAPPING[regionCode] || 'US East (N. Virginia)';
};
