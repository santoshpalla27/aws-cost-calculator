import {
    PricingClient,
    GetProductsCommand
} from '@aws-sdk/client-pricing';

export class AWSConfig {
    static createPricingClient(accessKeyId: string, secretAccessKey: string, region: string = 'us-east-1') {
        return new PricingClient({
            region: 'us-east-1', // Pricing API is only available in us-east-1
            credentials: {
                accessKeyId,
                secretAccessKey
            }
        });
    }
}