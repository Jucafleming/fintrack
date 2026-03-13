import { api } from './api';
import type { TransactionFilters } from './transactions.service';

export const exportsService = {
  async exportCsv(groupId: string, filters?: TransactionFilters): Promise<void> {
    const res = await api.get(`/groups/${groupId}/exports/csv`, {
      params: filters,
      responseType: 'blob',
    });

    const url = window.URL.createObjectURL(new Blob([res.data as BlobPart]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `transacoes-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
