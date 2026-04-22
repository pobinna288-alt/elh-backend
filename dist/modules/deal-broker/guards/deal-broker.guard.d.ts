import { CanActivate, ExecutionContext } from '@nestjs/common';
import { DealBrokerService } from '../services/deal-broker.service';
export declare class DealBrokerGuard implements CanActivate {
    private readonly dealBrokerService;
    constructor(dealBrokerService: DealBrokerService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
