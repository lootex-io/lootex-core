import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export const useActiveTab = ({
  defaultTab,
  syncWithUrl = false,
  activeTabKey = 'activeTab',
}: {
  defaultTab: string;
  syncWithUrl: boolean;
  activeTabKey?: string;
}) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTabSearchParam = searchParams.get(activeTabKey);

  const [activeTab, setActiveTab] = useState<string>(
    syncWithUrl ? (activeTabSearchParam ?? defaultTab) : defaultTab,
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    if (syncWithUrl) {
      router.replace(`?${activeTabKey}=${activeTab}`);
    }
  }, [activeTab]);

  return { activeTab, setActiveTab };
};
