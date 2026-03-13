import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/user.entity';

@Controller('groups/:groupId/categories')
export class CategoriesController {
  constructor(private categoriesService: CategoriesService) {}

  @Get()
  findAll(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @CurrentUser() user: User,
    @Query('includeArchived') includeArchived?: string,
  ) {
    return this.categoriesService.findAll(groupId, user.id, includeArchived === 'true');
  }

  @Post()
  create(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @CurrentUser() user: User,
    @Body() dto: CreateCategoryDto,
  ) {
    return this.categoriesService.create(groupId, user.id, dto);
  }

  @Patch(':id')
  update(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(groupId, id, user.id, dto);
  }

  @Delete(':id')
  remove(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.categoriesService.remove(groupId, id, user.id);
  }
}
