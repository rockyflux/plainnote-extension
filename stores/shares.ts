import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { ShareChannel, ShareRecord } from '@/types';
import { shareRecordsRepository } from '@/repositories/share-records-repository';
import { ensureDatabaseSeeded } from '@/repositories/db';

export type ShareSort = 'timeDesc' | 'timeAsc';

export const useSharesStore = defineStore('shares', () => {
  const items = ref<ShareRecord[]>([]);
  const loading = ref(false);
  const query = ref('');
  const sort = ref<ShareSort>('timeDesc');

  const filtered = computed(() => {
    const q = query.value.trim().toLowerCase();
    let list = items.value.slice();
    if (q) {
      list = list.filter((row) => {
        const hay = [
          row.title ?? '',
          row.sharedUrl ?? '',
          row.serverId ?? '',
          row.serviceId ?? '',
          row.channel,
        ]
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      });
    }
    list.sort((a, b) =>
      sort.value === 'timeAsc' ? a.sharedAt - b.sharedAt : b.sharedAt - a.sharedAt,
    );
    return list;
  });

  async function refresh() {
    loading.value = true;
    try {
      await ensureDatabaseSeeded();
      items.value = await shareRecordsRepository.list(200);
    } finally {
      loading.value = false;
    }
  }

  async function record(input: {
    noteLocalId: number | null;
    serverId: string | null;
    serviceId: string | null;
    sharedUrl: string | null;
    title: string | null;
    channel: ShareChannel;
  }) {
    await ensureDatabaseSeeded();
    await shareRecordsRepository.add({
      ...input,
      sharedAt: Date.now(),
    });
    await refresh();
  }

  /** Deletes local history only — never calls PlainNote DELETE. */
  async function remove(id: number) {
    await shareRecordsRepository.remove(id);
    await refresh();
  }

  async function clear() {
    await shareRecordsRepository.clear();
    await refresh();
  }

  return {
    items,
    filtered,
    loading,
    query,
    sort,
    refresh,
    record,
    remove,
    clear,
  };
});
