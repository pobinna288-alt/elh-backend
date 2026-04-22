import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Transaction } from './entities/transaction.entity';
import { AddCoinsDto, CoinsResponseDto } from './dto/coins.dto';
export declare class WalletService {
    private readonly userRepository;
    private readonly transactionRepository;
    private readonly logger;
    constructor(userRepository: Repository<User>, transactionRepository: Repository<Transaction>);
    addCoins(userId: string, addCoinsDto: AddCoinsDto): Promise<CoinsResponseDto>;
    getBalance(userId: string): Promise<number>;
    deductCoins(userId: string, amount: number, reason: string): Promise<CoinsResponseDto>;
    private logTransaction;
}
