import { REGION_MAPPING } from '../constants';

const API_URL = '/api/pricing';

export interface PriceQuery {
    serviceCode: string;
    filters: Record<string, string>;
    resourceType?: string;
}

export interface PriceError {
    error: string;
    details?: string;
    serviceCode: string;
    filters: Record<string, string>;
    suggestion?: string;
}

export const fetchPrice = async (query: PriceQuery): Promise<number | null> => {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(query)
        });

        if (!response.ok) {
            const errorData: PriceError = await response.json();
            
            console.error('[PRICING ERROR]', {
                status: response.status,
                resource: query.resourceType || 'unknown',
                ...errorData
            });

            return null;
        }

        const data = await response.json();
        console.log(`[PRICING SUCCESS] ${query.resourceType}: $${data.price}/${data.unit}`);
        return data.price;

    } catch (error: any) {
        console.error('[PRICING FETCH ERROR]', error);
        return null;
    }
};

export const getRegionLocation = (regionCode: string): string => {
    return REGION_MAPPING[regionCode] || 'US East (N. Virginia)';
};