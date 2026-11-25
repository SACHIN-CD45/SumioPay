import { IPaymentProvider } from './paymentProvider.interface';
import { upiDirectAdapter } from './upiDirect.adapter';
import { standardGatewayAdapter } from './standardGateway.adapter';

export class PaymentOrchestratorService {
  private providers: Map<string, IPaymentProvider> = new Map();

  constructor() {
    this.registerProvider(upiDirectAdapter);
    this.registerProvider(standardGatewayAdapter);
  }

  public registerProvider(provider: IPaymentProvider) {
    this.providers.set(provider.name, provider);
  }

  public getProvider(name = 'UPI_DIRECT'): IPaymentProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`Payment provider adapter '${name}' is not registered or supported.`);
    }
    return provider;
  }

  public async getSystemHealth() {
    const healthMap: Record<string, any> = {};
    for (const [name, prov] of this.providers.entries()) {
      try {
        healthMap[name] = await prov.getProviderHealth();
      } catch (err: any) {
        healthMap[name] = { isHealthy: false, error: err.message, status: 'DEGRADED' };
      }
    }
    return healthMap;
  }
}

export const paymentOrchestrator = new PaymentOrchestratorService();
export default paymentOrchestrator;
