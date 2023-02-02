import { assets } from 'chain-registry';
import { AssetList, Asset } from '@chain-registry/types';

export const chainName = 'juno';

export const chainassets: AssetList = assets.find(
    (chain) => chain.chain_name === chainName
) as AssetList;

export const coin: Asset = chainassets.assets.find(
    (asset) => asset.base === 'ujuno'
) as Asset;

export const cwVestingCodeIds = [{codeId: 1929, capabilities: ['staking']}, { codeId: 1864, capabilities: [] }];