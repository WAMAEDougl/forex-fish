import { Module, Global } from '@nestjs/common';
import { OASISService } from './oasis.service';

@Global()
@Module({
  providers: [OASISService],
  exports: [OASISService],
})
export class OASISModule {}