import { api } from './api';
import type { Group, GroupMember } from '@/types';

export const groupsService = {
  async findAll(): Promise<Group[]> {
    const res = await api.get<Group[]>('/groups');
    return res.data;
  },

  async create(name: string): Promise<Group> {
    const res = await api.post<Group>('/groups', { name });
    return res.data;
  },

  async findMembers(groupId: string): Promise<GroupMember[]> {
    const res = await api.get<GroupMember[]>(`/groups/${groupId}/members`);
    return res.data;
  },

  async addMember(groupId: string, email: string): Promise<GroupMember> {
    const res = await api.post<GroupMember>(`/groups/${groupId}/members`, { email });
    return res.data;
  },

  async removeMember(groupId: string, userId: string): Promise<void> {
    await api.delete(`/groups/${groupId}/members/${userId}`);
  },
};
