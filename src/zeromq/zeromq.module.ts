import { Module, Global } from '@nestjs/common';
import { ZeromqService } from './zeromq.service';

@Global()
@Module({
  providers: [ZeromqService],
  exports: [ZeromqService],
})
export class ZeromqModule {}