import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { GroupsService } from './groups.service';
import { CreateGroupDto, AddMemberDto } from './dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/user.entity';

@Controller('groups')
export class GroupsController {
  constructor(private groupsService: GroupsService) {}

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.groupsService.findAllByUser(user.id);
  }

  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateGroupDto) {
    return this.groupsService.create(user.id, dto);
  }

  @Post(':id/members')
  addMember(
    @Param('id', ParseUUIDPipe) groupId: string,
    @CurrentUser() user: User,
    @Body() dto: AddMemberDto,
  ) {
    return this.groupsService.addMember(groupId, user.id, dto);
  }

  @Delete(':id/members/:userId')
  removeMember(
    @Param('id', ParseUUIDPipe) groupId: string,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @CurrentUser() user: User,
  ) {
    return this.groupsService.removeMember(groupId, user.id, targetUserId);
  }
}
