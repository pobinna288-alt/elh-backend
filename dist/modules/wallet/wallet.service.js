"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var WalletService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_entity_1 = require("../users/entities/user.entity");
const transaction_entity_1 = require("./entities/transaction.entity");
let WalletService = WalletService_1 = class WalletService {
    constructor(userRepository, transactionRepository) {
        this.userRepository = userRepository;
        this.transactionRepository = transactionRepository;
        this.logger = new common_1.Logger(WalletService_1.name);
    }
    async addCoins(userId, addCoinsDto) {
        const { amount, reason } = addCoinsDto;
        if (amount <= 0) {
            throw new common_1.BadRequestException('Amount must be greater than 0');
        }
        const user = await this.userRepository.findOne({
            where: { id: userId },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const previousBalance = user.coins;
        const newBalance = previousBalance + amount;
        user.coins = newBalance;
        await this.userRepository.save(user);
        await this.logTransaction(userId, amount, 'ADD_COINS', reason || 'Manual addition');
        this.logger.log(`Added ${amount} coins to user ${userId}. New balance: ${newBalance}`);
        return {
            success: true,
            message: 'Coins added successfully',
            coins: newBalance,
            userId,
        };
    }
    async getBalance(userId) {
        const user = await this.userRepository.findOne({
            where: { id: userId },
            select: ['coins'],
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        return user.coins;
    }
    async deductCoins(userId, amount, reason) {
        if (amount <= 0) {
            throw new common_1.BadRequestException('Amount must be greater than 0');
        }
        const user = await this.userRepository.findOne({
            where: { id: userId },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        if (user.coins < amount) {
            throw new common_1.BadRequestException('INSUFFICIENT_COINS');
        }
        const previousBalance = user.coins;
        user.coins -= amount;
        await this.userRepository.save(user);
        await this.logTransaction(userId, -amount, 'DEDUCT_COINS', reason);
        this.logger.log(`Deducted ${amount} coins from user ${userId}. New balance: ${user.coins}`);
        return {
            success: true,
            message: 'Coins deducted successfully',
            coins: user.coins,
            userId,
        };
    }
    async logTransaction(userId, amount, type, description) {
        try {
            const transaction = this.transactionRepository.create({
                userId,
                amount,
                type: type,
                description,
                status: 'completed',
            });
            await this.transactionRepository.save(transaction);
        }
        catch (error) {
            this.logger.error(`Failed to log transaction: ${error.message}`);
        }
    }
};
exports.WalletService = WalletService;
exports.WalletService = WalletService = WalletService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(transaction_entity_1.Transaction)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], WalletService);
//# sourceMappingURL=wallet.service.js.map