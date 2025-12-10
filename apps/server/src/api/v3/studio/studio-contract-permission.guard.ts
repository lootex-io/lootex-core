import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { StudioContract } from '@/model/entities';

@Injectable()
export class StudioContractPermissionGuard implements CanActivate {
  constructor(
    @InjectModel(StudioContract)
    private studioContractRepository: typeof StudioContract,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const contractId =
      request.params.contractId ||
      request.query.contractId ||
      request.body.contractId;

    if (!contractId) {
      throw new ForbiddenException('Contract ID required');
    }

    const checkPermission = async (cId) => {
      const contract = await this.studioContractRepository.findOne({
        where: {
          id: cId,
        },
      });

      if (!contract) {
        throw new HttpException('Contract not found', HttpStatus.NOT_FOUND);
      }

      if (contract.ownerAccountId !== user.id) {
        throw new HttpException(
          'You are not the owner of this contract',
          HttpStatus.FORBIDDEN,
        );
      }
      return true;
    };

    if (!(await checkPermission(contractId))) {
      throw new ForbiddenException(
        'You do not have permission to access this resource',
      );
    }

    return true;
  }
}
