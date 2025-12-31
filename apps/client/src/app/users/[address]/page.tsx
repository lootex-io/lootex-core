import UserBrowser from '@/features/user-browser';
import { populateMetadata } from '@/utils/metadata';
import { formatAddress } from '@lootex-core/sdk/utils';

export const generateMetadata = ({
  params,
}: {
  params: { address: string };
}) => {
  return populateMetadata({
    title: formatAddress(params.address),
    canonicalPath: `/users/${params.address}`,
  });
};

export default function UserPage({ params }: { params: { address: string } }) {
  return (
    <div className="flex flex-col flex-1 h-[calc(100dvh-56px)] overflow-hidden min-h-0">
      <UserBrowser accountAddress={params.address} />
    </div>
  );
}
