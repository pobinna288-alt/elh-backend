import { User } from '../../users/entities/user.entity';
export declare class Follow {
    id: string;
    follower: User;
    followerId: string;
    following: User;
    followingId: string;
    createdAt: Date;
}
