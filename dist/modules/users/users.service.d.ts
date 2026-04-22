import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserResponseDto } from './dto/user-response.dto';
export declare class UsersService {
    private readonly userRepository;
    constructor(userRepository: Repository<User>);
    getUserProfile(userId: string): Promise<UserResponseDto>;
    isPremiumUser(user: User): boolean;
    findById(userId: string): Promise<User>;
    updateCoins(userId: string, coins: number): Promise<User>;
    addCoins(userId: string, amount: number): Promise<User>;
    deductCoins(userId: string, amount: number): Promise<User>;
}
