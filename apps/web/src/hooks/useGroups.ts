import { useQuery } from '@tanstack/react-query';
import { groupsService } from '@/services/groups.service';
import { useGroupStore } from '@/store/group.store';
import { useEffect } from 'react';

export function useGroups() {
  const { activeGroup, setActiveGroup } = useGroupStore();

  const query = useQuery({
    queryKey: ['groups'],
    queryFn: groupsService.findAll,
  });

  // Auto-select first group if none active
  useEffect(() => {
    if (!activeGroup && query.data && query.data.length > 0) {
      setActiveGroup(query.data[0]);
    }
  }, [query.data, activeGroup, setActiveGroup]);

  return query;
}

export function useGroupMembers(groupId: string | undefined) {
  return useQuery({
    queryKey: ['groups', groupId, 'members'],
    queryFn: () => groupsService.findMembers(groupId!),
    enabled: !!groupId,
  });
}
