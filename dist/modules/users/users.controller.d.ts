import { UsersService } from './users.service';
import { UserResponseDto } from './dto/user-response.dto';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    getProfile(req: any): Promise<UserResponseDto>;
}
