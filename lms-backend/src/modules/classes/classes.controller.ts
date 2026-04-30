import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/auth/roles.enum';
import { ClassesService } from './classes.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import {
  ClassesListResponseDto,
  ClassRemoveResponseDto,
  ClassSingleResponseDto,
} from './dto/classes-response.dto';
import {
  ApiCommonErrorResponses,
  ApiConflictErrorResponse,
  ApiUnprocessableErrorResponse,
} from '../../common/swagger/api-error-responses.decorator';

@ApiTags('classes')
@ApiBearerAuth('bearer')
@ApiCommonErrorResponses()
@Controller('classes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'List classes' })
  @ApiOkResponse({ type: ClassesListResponseDto })
  async findAll() {
    return { data: await this.classesService.findAll() };
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create class' })
  @ApiBody({ type: CreateClassDto })
  @ApiOkResponse({ type: ClassSingleResponseDto })
  @ApiConflictErrorResponse('Class already exists for this academic year.')
  @ApiUnprocessableErrorResponse('Class payload failed domain rules.')
  async create(@Body() dto: CreateClassDto) {
    return { data: await this.classesService.create(dto) };
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update class' })
  @ApiBody({ type: UpdateClassDto })
  @ApiOkResponse({ type: ClassSingleResponseDto })
  async update(@Param('id') id: string, @Body() dto: UpdateClassDto) {
    return { data: await this.classesService.update(id, dto) };
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete class' })
  @ApiOkResponse({ type: ClassRemoveResponseDto })
  async remove(@Param('id') id: string) {
    return { data: await this.classesService.remove(id) };
  }
}
