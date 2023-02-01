import "../styles/globals.css";
import type { AppProps } from "next/app";
import { ChainProvider } from "@cosmos-kit/react";
import { ChakraProvider } from "@chakra-ui/react";
import { chainName } from "../config";
import { wallets as keplrWallets } from "@cosmos-kit/keplr";
import { wallets as cosmostationWallets } from "@cosmos-kit/cosmostation";
import { wallets as leapWallets } from "@cosmos-kit/leap";

import { assets, chains } from "chain-registry";
import { getSigningCosmosClientOptions } from "juno-network";
import { GasPrice } from "@cosmjs/stargate";

import { SignerOptions } from "@cosmos-kit/core";
import { Chain } from "@chain-registry/types";

import { defaultTheme, ThemeProvider } from "@cosmology-ui/react";
import Layout from "../components/react/layout";

import {
  useQuery,
  useMutation,
  useQueryClient,
  QueryClient,
  QueryClientProvider,
} from "react-query";

const queryClient = new QueryClient();

function CreateCosmosApp({ Component, pageProps }: AppProps) {
  const signerOptions: SignerOptions = {
    signingStargate: (_chain: Chain) => {
      return getSigningCosmosClientOptions();
    },
    signingCosmwasm: (chain: Chain) => {
      switch (chain.chain_name) {
        case "juno":
          return {
            rpc: "https://rpc-juno.pupmos.network:443",
            gasPrice: GasPrice.fromString("0.0025ujuno"),
          };
      }
    },
  };

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <ChakraProvider theme={defaultTheme}>
          <ChainProvider
            chains={chains}
            endpointOptions={{
              [chainName]: {
                rpc: ["https://rpc-juno.pupmos.network"],
                rest: ["https://api-juno.pupmos.network"],
              },
            }}
            assetLists={assets}
            wallets={[
              ...keplrWallets,
              ...cosmostationWallets,
              ...leapWallets,
            ].map((wallet) => {
              // if (wallet.preferredEndpoints?.[chainName]) {
              //   wallet.preferredEndpoints[chainName].rpc = [
              //     "https://rpc-juno.pupmos.network",
              //   ];
              //   wallet.preferredEndpoints[chainName].rest = [
              //     "https://rpc-juno.pupmos.network",
              //   ];
              // }
              return wallet;
            })}
            signerOptions={signerOptions}
          >
            <Layout>
              <Component {...pageProps} />
            </Layout>
          </ChainProvider>
        </ChakraProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default CreateCosmosApp;
