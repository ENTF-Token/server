import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CaverService } from 'src/caver/caver.service';
import { UserService } from 'src/user/user.service';
import { MintDto } from './dto/admin.dto';
import jwt from 'jsonwebtoken';
import moment from 'moment';

interface IUser {
  email: string;
  nickname: string;
}

@Controller('admin')
export class AdminController {
  constructor(
    private readonly userService: UserService,
    private readonly caverService: CaverService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('/mint')
  async _mint(@Req() { user }: { user: IUser }, @Body() mint: MintDto) {
    const { password, location } = await this.userService.findOneByEmail(
      user.email,
    );
    const { address } = await this.userService.findWallet(user.email);
    console.log('abd', address);

    const token = jwt.sign(
      {
        place: location,
        start_date: moment().format('YYYY-MM-DD'),
        end_date: moment().add(mint.day, 'days').format('YYYY-MM-DD'),
      },
      password,
      {
        expiresIn: `${mint.day}d`,
      },
    );
    console.log(mint.target, token);
    const _mintNFT = await this.caverService.contract.methods
      .mintNFT(mint.target, token)
      .send({
        from: this.caverService.keyring.address,
        gas: '0x4bfd200',
      });
    return _mintNFT;
  }
}
