import { User } from '../../users/entities/user.entity';
export declare class AiUsageLog {
    id: string;
    userId: string;
    featureName: string;
    usageCount: number;
    usageDate: string;
    createdAt: Date;
    user: User;
}
