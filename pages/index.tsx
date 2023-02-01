import {
  Box,
  Button,
  Heading,
  HStack,
  Stack,
  StackItem,
} from "@chakra-ui/react";
import { ButtonShape } from "@cosmology-ui/utils";
import { useChain } from "@cosmos-kit/react";
import Link from "next/link";
import { useQuery } from "react-query";
import { ConnectWalletButton } from "../components";
import { chainName, cwVestingCodeId } from "../config";

export default function VestingContracts() {
  const {
    getSigningStargateClient,
    address,
    status,
    getRpcEndpoint,
    getCosmWasmClient,
  } = useChain(chainName);

  const vestingContractsQuery = useQuery("vesting-contracts", async () => {
    const client = await getCosmWasmClient();
    const contractAddrs = await client.getContracts(cwVestingCodeId);
    const contracts = await Promise.all(
      contractAddrs.map(async (addr) => {
        const contract = await client.getContract(addr);
        return contract;
      })
    );
    return contracts;
  });
  return (
    <Box w={"full"}>
      <Heading ml={6} as="h2" size="xl">
        Vesting Contracts
      </Heading>
      <Stack mt={16} ml={10}>
        {vestingContractsQuery.data?.map((contract) => {
          return (
            <Link
              key={contract.address}
              href={`/contracts/${contract.address}`}
            >
              <Box
                cursor="pointer"
                bg="gray.50"
                _dark={{ bg: "gray.700" }}
                rounded={"xl"}
                shadow="sm"
                w="full"
              >
                <HStack px={4} py={6}>
                  <Heading size={"md"}>{contract.label}</Heading>
                  <p>{contract.address}</p>
                </HStack>
              </Box>
            </Link>
          );
        })}
      </Stack>
    </Box>
  );
}
