import { ZeroAddress } from 'ethers-v6';
import { keccak256 } from 'ethers/lib/utils';
import { MerkleTree } from 'merkletreejs';

type MerkleEntry = {
  address: string;
  maxClaimable: string;
  price: string;
  currencyAddress: string;
};

function hashEntry(entry) {
  const address = Uint8Array.from(
    Buffer.from(entry.address.slice(2).padStart(40, '0'), 'hex'),
  );
  const maxClaimable = Uint8Array.from(
    Buffer.from(
      BigInt(entry.maxClaimable).toString(16).padStart(64, '0'),
      'hex',
    ),
  );
  const price = Uint8Array.from(
    Buffer.from(
      Math.floor(parseFloat(entry.price) * 1e18)
        .toString(16)
        .padStart(64, '0'),
      'hex',
    ),
  );
  // if currencyAddress is ZeroAddress, use address as 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE
  const originCurrencyAddress =
    entry.currencyAddress === ZeroAddress
      ? '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
      : entry.currencyAddress;
  const currencyAddress = Uint8Array.from(
    Buffer.from(originCurrencyAddress.slice(2).padStart(40, '0'), 'hex'),
  );

  return keccak256(
    Buffer.concat([address, maxClaimable, price, currencyAddress]),
  );
}

// export function getLeafHash(entry: MerkleEntry): `0x${string}` {
//   const addressBytes = hexToBytes(getAddress(entry.address));
//   const maxClaimableBytes = hexToBytes(
//     `0x${BigInt(entry.maxClaimable).toString(16).padStart(64, '0')}`,
//   );
//   const priceBytes = hexToBytes(
//     `0x${parseUnits(entry.price, 18).toString(16).padStart(64, '0')}`,
//   );
//   const currencyBytes = hexToBytes(getAddress(entry.currencyAddress));

//   const packedBytes = new Uint8Array(
//     addressBytes.length +
//       maxClaimableBytes.length +
//       priceBytes.length +
//       currencyBytes.length,
//   );
//   packedBytes.set(addressBytes, 0);
//   packedBytes.set(maxClaimableBytes, addressBytes.length);
//   packedBytes.set(priceBytes, addressBytes.length + maxClaimableBytes.length);
//   packedBytes.set(
//     currencyBytes,
//     addressBytes.length + maxClaimableBytes.length + priceBytes.length,
//   );

//   return keccak256(packedBytes);
// }

export function generateMerkleTree(entries: MerkleEntry[]) {
  const leaves = entries.map(hashEntry);
  const tree = new MerkleTree(leaves, keccak256, {
    sortPairs: true,
  });
  const root = tree.getHexRoot();
  const proofs = Object.fromEntries(
    entries.map((entry, i) => [
      entry.address.toLowerCase(),
      tree.getHexProof(leaves[i]),
    ]),
  );
  return { tree, root, proofs };
}

export function verify(entry: MerkleEntry, proof: string[], tree: MerkleTree) {
  const leaf = hashEntry(entry);
  return tree.verify(proof, Buffer.from(leaf.slice(2), 'hex'), tree.getRoot());
}
