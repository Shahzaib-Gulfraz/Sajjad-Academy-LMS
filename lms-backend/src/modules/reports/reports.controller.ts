import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/auth/roles.enum';
import { ReportsService } from './reports.service';
import { ReportsOverviewResponseDto } from './dto/reports-overview-response.dto';
import { ApiCommonErrorResponses } from '../../common/swagger/api-error-responses.decorator';

@ApiTags('reports')
@ApiBearerAuth('bearer')
@ApiCommonErrorResponses()
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('overview')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get admin analytics overview' })
  @ApiOkResponse({
    description: 'Aggregated dashboard analytics payload.',
    type: ReportsOverviewResponseDto,
  })
  async overview() {
    return {
      data: await this.reportsService.getOverview(),
    };
  }
}
