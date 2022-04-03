import { ForbiddenException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindManyOptions, Repository } from 'typeorm';
import {
  CreateUserDto,
  UserEmailDto,
  UserNicknameDto,
} from './dto/create-user.dto';
import { Approve, User } from './user.entity';
import * as bcrypt from 'bcrypt';
import { Wallet } from 'src/user/user.entity';
import { CaverService } from 'src/caver/caver.service';
import { CreateApproveDto } from './dto/create-approve.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Wallet)
    private walletRepository: Repository<Wallet>,
    @InjectRepository(Approve)
    private approveRepository: Repository<Approve>,
    private caverService: CaverService,
  ) {}

  async findOneByEmail(email: string): Promise<User> {
    return this.userRepository.findOne({ email });
  }

  async findWallet(email: string): Promise<Wallet> {
    return this.walletRepository.findOne({ email });
  }

  findApprove(approve: {
    email?: string;
    requestLocation?: string;
    requestDay?: number;
  }): Promise<Approve[]> {
    return this.approveRepository.find(approve);
  }

  async findEmail(
    findEmail: UserEmailDto,
  ): Promise<{ usable: boolean; message: string }> {
    const { email } = findEmail;
    const isExist = await this.userRepository.findOne({ email });
    if (isExist) {
      return {
        usable: false,
        message: '등록된 이메일 입니다.',
      };
    } else {
      return {
        usable: true,
        message: '사용 가능한 이메일 입니다.',
      };
    }
  }

  async findNickname(
    findNickname: UserNicknameDto,
  ): Promise<{ usable: boolean; message: string }> {
    const { nickname } = findNickname;
    const isExist = await this.userRepository.findOne({ nickname });
    if (isExist) {
      return {
        usable: false,
        message: '등록된 닉네임 입니다.',
      };
    } else {
      return {
        usable: true,
        message: '사용 가능한 닉네임 입니다.',
      };
    }
  }

  async requestApprove(createApproveDto: CreateApproveDto) {
    const approveList = await this.approveRepository.find({
      email: createApproveDto.email,
    });
    for (const approve of approveList) {
      if (approve.requestLocation === approve.requestLocation) {
        throw new ForbiddenException({
          statusCode: HttpStatus.FORBIDDEN,
          message: '이미 신청한 장소입니다.',
          error: 'Forbidden',
        });
      }
    }
    this.approveRepository.save(createApproveDto);
  }

  async approveComplete(createApproveDto: CreateApproveDto) {
    await this.approveRepository.delete(createApproveDto);
  }

  async create(createUserDto: CreateUserDto) {
    const isExistByEmail = await this.userRepository.findOne({
      email: createUserDto.email,
    });
    if (isExistByEmail) {
      throw new ForbiddenException({
        statusCode: HttpStatus.FORBIDDEN,
        message: '이미 등록된 사용자입니다.',
        error: 'Forbidden',
      });
    }
    const isExistByNickname = await this.userRepository.findOne({
      nickname: createUserDto.nickname,
    });
    if (isExistByNickname) {
      throw new ForbiddenException({
        statusCode: HttpStatus.FORBIDDEN,
        message: '이미 등록된 사용자입니다.',
        error: 'Forbidden',
      });
    }
    const { password, ...result } = createUserDto;
    const salt = await bcrypt.genSalt();
    const bcryptPassword = await bcrypt.hash(password, salt);

    if (result.isAdmin) {
      const keyring = await this.caverService.caver.wallet.keyring.generate();
      await this.walletRepository.save({
        email: result.email,
        address: keyring.address,
        privateKey: keyring.key.privateKey,
      });
    }
    await this.userRepository.save({
      password: bcryptPassword,
      ...result,
    });
    return result;
  }
  async find(options?: FindManyOptions<User>) {
    return this.userRepository.find(options);
  }
}
